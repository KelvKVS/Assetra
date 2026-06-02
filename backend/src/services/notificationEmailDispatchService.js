/**
 * E-mails transacionais (economia de quota Brevo — só o essencial):
 *
 * ✓ Solicitação aprovada/reprovada → quem pediu (abertura OS, movimentação, etc.)
 * ✓ Validação de OS enviada pelo técnico → gestor que aprovou a abertura da OS
 * ✓ Validação decidida → técnico que enviou para validação
 * ✓ Movimentação → quem recebe o ativo e quem o perdeu (se tinha responsável)
 *
 * ✗ Não envia: "nova pendência para aprovar" a gestores/ADM
 * ✗ Não envia: chamado sem técnico, atribuição de técnico, ativo em manutenção
 */
import Approval from '../models/Approval.js'
import prisma from '../lib/prisma.js'
import {
  buildNotificationEmailPayload,
  enqueueNotificationEmail,
} from './notificationEmailPublisher.js'
import { findOpeningApprovalForMaintenance } from '../utils/approvalEnrichment.js'

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

async function publishToUser(user, emailFields) {
  const to = String(user?.email ?? '').trim().toLowerCase()
  if (!to) return
  await enqueueNotificationEmail(
    buildNotificationEmailPayload({ ...emailFields, to, toName: user.name }),
    { recipient: to },
  )
}

/** Gestor que aprovou a abertura da OS (destinatário da validação do técnico). */
async function findOpeningGestorUser(tenantId, validationApproval) {
  const parentId = String(validationApproval?.parentApprovalId ?? '').trim()
  let opening = null

  if (parentId) {
    opening = await Approval.findOne({
      _id: parentId,
      tenantId,
      status: 'Aprovada',
    })
  }

  const maintenanceId = String(validationApproval?.maintenanceId ?? '').trim()
  if (!opening && maintenanceId) {
    opening = await findOpeningApprovalForMaintenance(tenantId, maintenanceId)
  }

  if (!opening?.decidedBy) return null
  return findUserById(tenantId, opening.decidedBy)
}

function statusLabelPt(status) {
  const s = String(status ?? '').toLowerCase()
  if (s === 'aprovada') return 'aprovada'
  if (s === 'reprovada') return 'reprovada'
  return s || 'atualizada'
}

/** @deprecated Não utilizado — evita spam a aprovadores. */
export async function dispatchApprovalCreatedEmails() {
  return
}

/**
 * Decisão numa solicitação → apenas o solicitante (não os aprovadores).
 */
export async function dispatchApprovalDecidedEmail(tenantId, approval) {
  const requester = await findUserById(tenantId, approval.requestedBy)
  if (!requester?.email) return

  const status = statusLabelPt(approval.status)
  const phase = String(approval.approvalPhase ?? '').toLowerCase()
  const tag = approval.assetTag || 'ativo'

  let title
  let message
  let route = '/solicitacoes'

  if (phase === 'validacao') {
    title = `Validação ${status}: ${tag}`
    message =
      String(approval.notes ?? '').slice(0, 200) ||
      (status === 'aprovada'
        ? 'A conclusão da manutenção foi validada pelo gestor.'
        : 'O gestor devolveu a ordem para correções.')
    route = '/execucao-tecnica'
  } else if (phase === 'movimentacao' || approval.type === 'Movimentação') {
    title = `Movimentação ${status}: ${tag}`
    message =
      String(approval.notes ?? '').slice(0, 200) ||
      `A sua solicitação de movimentação foi ${status}.`
    route = '/solicitacoes'
  } else {
    title = `Solicitação ${status}: ${tag}`
    message =
      String(approval.notes ?? approval.feedback ?? '').slice(0, 200) ||
      `A sua solicitação (${approval.type}) foi ${status}.`
    route = '/solicitacoes'
  }

  await publishToUser(requester, {
    subject: `[Assetra] ${title}`,
    title,
    message,
    route,
    sender: approval.decidedByName || 'Gestão',
  })
}

/** Técnico enviou OS para validação → gestor que aprovou a abertura. */
export async function dispatchValidationSubmittedEmail(tenantId, validationApproval) {
  if (String(validationApproval?.approvalPhase ?? '').toLowerCase() !== 'validacao') {
    return
  }

  const gestor = await findOpeningGestorUser(tenantId, validationApproval)
  if (!gestor?.email) return

  const tech = await findUserById(tenantId, validationApproval.requestedBy)
  const techLabel = tech?.name || 'Técnico'
  const tag = validationApproval.assetTag || 'ativo'

  if (
    tech?.email &&
    gestor.email.toLowerCase() === tech.email.toLowerCase()
  ) {
    return
  }

  await publishToUser(gestor, {
    subject: `[Assetra] Validação pendente — ${tag}`,
    title: `Validação de OS: ${tag}`,
    message: `${techLabel} enviou a ordem de serviço para validação de conclusão. Abra Aprovações para decidir.`,
    route: '/aprovacoes',
    sender: techLabel,
  })
}

/** Movimentação → destino (recebeu) e origem (perdeu responsabilidade). */
export async function dispatchMovementCreatedEmail(tenantId, movement) {
  const tag = movement.assetTag || 'ativo'
  const origin = movement.origin || '—'
  const destination = movement.destination || '—'

  const toEmail = String(movement.toUserEmail ?? '').trim().toLowerCase()
  const fromEmail = String(movement.fromUserEmail ?? '').trim().toLowerCase()

  if (toEmail) {
    const recipient = await findUserByEmail(tenantId, toEmail)
    if (recipient?.email) {
      await publishToUser(recipient, {
        subject: `[Assetra] Ativo atribuído a si — ${tag}`,
        title: `Recebeu o ativo ${tag}`,
        message: `O ativo foi transferido para a sua responsabilidade (${origin} → ${destination}).`,
        route: '/meus-ativos',
        sender: 'Sistema',
      })
    }
  }

  if (fromEmail && fromEmail !== toEmail && fromEmail.includes('@')) {
    const previous = await findUserByEmail(tenantId, fromEmail)
    if (previous?.email) {
      await publishToUser(previous, {
        subject: `[Assetra] Ativo transferido — ${tag}`,
        title: `Ativo ${tag} saiu da sua responsabilidade`,
        message: `O ativo foi movimentado para ${destination}. Já não consta na sua lista de ativos atribuídos.`,
        route: '/meus-ativos',
        sender: 'Sistema',
      })
    }
  }
}

/** @deprecated */
export async function dispatchUnassignedMaintenanceEmails() {
  return
}

/** @deprecated */
export async function dispatchTechnicianAssignmentEmail() {
  return
}

/** @deprecated */
export async function dispatchAssetInMaintenanceEmail() {
  return
}
