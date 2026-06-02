import prisma from '../lib/prisma.js'
import {
  buildNotificationEmailPayload,
  enqueueNotificationEmail,
} from './notificationEmailPublisher.js'

async function listUsersByRoles(tenantId, roles) {
  return prisma.user.findMany({
    where: { tenantId, active: true, role: { in: roles } },
    select: { email: true, name: true },
  })
}

async function findUserById(tenantId, userId) {
  if (!userId) return null
  return prisma.user.findFirst({
    where: { tenantId, id: String(userId), active: true },
    select: { email: true, name: true },
  })
}

async function findUserByEmail(tenantId, email) {
  const normalized = String(email ?? '').trim().toLowerCase()
  if (!normalized) return null
  return prisma.user.findFirst({
    where: { tenantId, email: normalized, active: true },
    select: { email: true, name: true },
  })
}

async function publishToUsers(users, emailFields) {
  const seen = new Set()
  for (const user of users) {
    const to = String(user.email ?? '').trim().toLowerCase()
    if (!to || seen.has(to)) continue
    seen.add(to)
    await enqueueNotificationEmail(
      buildNotificationEmailPayload({ ...emailFields, to, toName: user.name }),
      { recipient: to },
    )
  }
}

/** Nova solicitação pendente → aprovadores (ADM/GESTOR). */
export async function dispatchApprovalCreatedEmails(tenantId, approval) {
  const role = String(approval.requiredApproverRole ?? 'GESTOR').toUpperCase()
  const approverRoles = role === 'ADM' ? ['ADM'] : ['ADM', 'GESTOR']
  const approvers = await listUsersByRoles(tenantId, approverRoles)
  await publishToUsers(approvers, {
    subject: `[Assetra] ${approval.type} pendente — ${approval.assetTag}`,
    title: `${approval.type} pendente: ${approval.assetTag}`,
    message:
      String(approval.description ?? '').slice(0, 200) ||
      'Aguarda a sua decisão no painel de aprovações.',
    route: '/aprovacoes',
    sender: approval.requestedByName || 'Utilizador',
  })
}

/** Solicitação decidida → quem pediu. */
export async function dispatchApprovalDecidedEmail(tenantId, approval) {
  const requester = await findUserById(tenantId, approval.requestedBy)
  if (!requester?.email) return
  const status = String(approval.status ?? '').toLowerCase()
  await enqueueNotificationEmail(
    buildNotificationEmailPayload({
      to: requester.email,
      toName: requester.name,
      subject: `[Assetra] Solicitação ${status} — ${approval.assetTag}`,
      title: `Solicitação ${status}: ${approval.assetTag}`,
      message:
        String(approval.notes ?? approval.feedback ?? '').slice(0, 200) ||
        `A sua solicitação de ${approval.type} foi ${status}.`,
      route: '/solicitacoes',
      sender: approval.decidedByName || 'Gestão',
    }),
    { approvalId: String(approval._id ?? approval.id ?? '') },
  )
}

/** Chamado aberto sem técnico → ADM/GESTOR. */
export async function dispatchUnassignedMaintenanceEmails(tenantId, maintenance) {
  const assigned = String(maintenance.assignedTechnicianEmail ?? '').trim()
  if (assigned) return
  const managers = await listUsersByRoles(tenantId, ['ADM', 'GESTOR'])
  await publishToUsers(managers, {
    subject: `[Assetra] Chamado sem técnico — ${maintenance.assetTag}`,
    title: `Chamado sem técnico: ${maintenance.assetTag}`,
    message:
      String(maintenance.description ?? '').slice(0, 200) ||
      String(maintenance.type ?? 'Manutenção'),
    route: '/manutencoes',
    sender: 'Sistema',
  })
}

/** Manutenção atribuída a técnico. */
export async function dispatchTechnicianAssignmentEmail(tenantId, maintenance) {
  const email = String(maintenance.assignedTechnicianEmail ?? '').trim().toLowerCase()
  if (!email) return
  const tech =
    (await findUserByEmail(tenantId, email)) ?? { email, name: maintenance.assignedTechnicianName }
  await enqueueNotificationEmail(
    buildNotificationEmailPayload({
      to: tech.email,
      toName: tech.name,
      subject: `[Assetra] Manutenção atribuída — ${maintenance.assetTag}`,
      title: `Manutenção ${maintenance.status}: ${maintenance.assetTag}`,
      message:
        String(maintenance.description ?? '').slice(0, 200) ||
        String(maintenance.type ?? 'Nova atribuição'),
      route: '/execucao-tecnica',
      sender: 'Sistema',
    }),
    { maintenanceId: String(maintenance._id ?? '') },
  )
}

/** Movimentação registada → responsável/destino. */
export async function dispatchMovementCreatedEmail(tenantId, movement) {
  const destEmail = String(movement.toUserEmail ?? '').trim().toLowerCase()
  let recipient = destEmail ? await findUserByEmail(tenantId, destEmail) : null
  if (!recipient?.email) {
    const label = String(movement.responsible ?? movement.destination ?? '').trim()
    if (label.includes('@')) {
      recipient = await findUserByEmail(tenantId, label)
    }
  }
  if (!recipient?.email) return

  await enqueueNotificationEmail(
    buildNotificationEmailPayload({
      to: recipient.email,
      toName: recipient.name,
      subject: `[Assetra] Movimentação — ${movement.assetTag}`,
      title: `Movimentação: ${movement.assetTag}`,
      message: `${movement.origin} → ${movement.destination}`,
      route: '/movimentacoes',
      sender: 'Sistema',
    }),
    { movementId: String(movement._id ?? '') },
  )
}

/** Ativo passou a «Em manutenção» → titular do ativo. */
export async function dispatchAssetInMaintenanceEmail(tenantId, asset) {
  const email = String(asset.assignedTo ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) return
  const owner = await findUserByEmail(tenantId, email)
  if (!owner?.email) return

  await enqueueNotificationEmail(
    buildNotificationEmailPayload({
      to: owner.email,
      toName: owner.name,
      subject: `[Assetra] Ativo em manutenção — ${asset.tag}`,
      title: `Ativo em manutenção: ${asset.tag}`,
      message:
        String(asset.description ?? '').slice(0, 200) ||
        String(asset.sector ?? 'Verifique o estado do equipamento.'),
      route: '/meus-ativos',
      sender: 'Sistema',
    }),
    { assetTag: asset.tag },
  )
}
