import Maintenance from '../models/Maintenance.js'
import Movement from '../models/Movement.js'
import Asset from '../models/Asset.js'
import { listApprovalsForApprover, listApprovalsByRequester } from './approvalService.js'

const DECISION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const MOVEMENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

function isoDate(value) {
  if (!value) return new Date().toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function push(list, item) {
  list.push(item)
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase()
}

function matchesResponsible(responsible, email, name) {
  const r = normalizeName(responsible)
  if (!r) return false
  return (email && r === email) || (name && r === name)
}

/** Notificações agregadas por perfil (aprovações, solicitações, manutenções, movimentações, ativos). */
export async function listNotificationsForUser(tenantId, user) {
  const notifications = []
  const role = String(user?.role ?? '').trim().toUpperCase()
  const userId = String(user?.sub ?? '')
  const email = normalizeEmail(user?.email)
  const name = normalizeName(user?.name)
  const now = Date.now()

  if (role === 'ADM' || role === 'GESTOR') {
    const approvals = await listApprovalsForApprover(tenantId, role)
    for (const approval of approvals) {
      if (approval.status !== 'Pendente') continue
      push(notifications, {
        id: `approval-pending-${approval.id}`,
        kind: 'approval',
        title: `${approval.type} pendente: ${approval.assetTag}`,
        message: approval.description?.slice(0, 160) || 'Aguarda a sua decisão.',
        sender: approval.requestedByName || 'Utilizador',
        createdAt: isoDate(approval.createdAt),
        route: '/aprovacoes',
      })
    }

    const unassigned = await Maintenance.find({
      tenantId,
      status: 'Aberta',
      $or: [
        { assignedTechnicianEmail: { $exists: false } },
        { assignedTechnicianEmail: null },
        { assignedTechnicianEmail: '' },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)

    for (const row of unassigned) {
      const o = row.toObject()
      push(notifications, {
        id: `maint-unassigned-${o._id}`,
        kind: 'maintenance',
        title: `Chamado sem técnico: ${o.assetTag}`,
        message: o.description?.slice(0, 160) || o.type,
        sender: 'Sistema',
        createdAt: isoDate(o.createdAt),
        route: '/manutencoes',
      })
    }
  }

  const mine = await listApprovalsByRequester(tenantId, userId)
  for (const approval of mine) {
    if (approval.status === 'Pendente') {
      const approverLabel = approval.requiredApproverRole === 'ADM' ? 'administrador' : 'gestor'
      push(notifications, {
        id: `request-pending-${approval.id}`,
        kind: 'request',
        title: `Solicitação pendente: ${approval.assetTag}`,
        message: `${approval.type} aguarda aprovação do ${approverLabel}.`,
        sender: 'Sistema',
        createdAt: isoDate(approval.createdAt),
        route: '/solicitacoes',
      })
      continue
    }

    const decidedAtMs = approval.decidedAt ? new Date(approval.decidedAt).getTime() : 0
    if (decidedAtMs && now - decidedAtMs <= DECISION_WINDOW_MS) {
      push(notifications, {
        id: `request-decided-${approval.id}`,
        kind: 'request',
        title: `Solicitação ${approval.status.toLowerCase()}: ${approval.assetTag}`,
        message: approval.notes || approval.feedback || `A sua solicitação foi ${approval.status.toLowerCase()}.`,
        sender: approval.decidedByName || 'Gestão',
        createdAt: isoDate(approval.decidedAt || approval.createdAt),
        route: '/solicitacoes',
      })
    }
  }

  if (role === 'TECNICO' && email) {
    const assigned = await Maintenance.find({
      tenantId,
      assignedTechnicianEmail: email,
      status: { $in: ['Aberta', 'Em andamento'] },
    })
      .sort({ updatedAt: -1 })
      .limit(15)

    for (const row of assigned) {
      const o = row.toObject()
      push(notifications, {
        id: `maint-assigned-${o._id}`,
        kind: 'maintenance',
        title: `Manutenção ${o.status}: ${o.assetTag}`,
        message: o.description?.slice(0, 160) || o.type,
        sender: 'Sistema',
        createdAt: isoDate(o.updatedAt || o.createdAt),
        route: '/execucao-tecnica',
      })
    }
  }

  if (email || name) {
    const since = new Date(now - MOVEMENT_WINDOW_MS)
    const movements = await Movement.find({ tenantId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(30)

    for (const row of movements) {
      const o = row.toObject()
      if (!matchesResponsible(o.responsible, email, name)) continue
      push(notifications, {
        id: `movement-${o._id}`,
        kind: 'movement',
        title: `Movimentação: ${o.assetTag}`,
        message: `${o.origin} → ${o.destination}`,
        sender: 'Sistema',
        createdAt: isoDate(o.createdAt),
        route: '/movimentacoes',
      })
    }
  }

  if (email && ['FUNCIONARIO', 'GESTOR', 'TECNICO'].includes(role)) {
    const assetsInMaint = await Asset.find({ tenantId, status: 'Em manutenção' })
      .sort({ updatedAt: -1 })
      .limit(40)

    for (const row of assetsInMaint) {
      const o = row.toObject()
      if (normalizeEmail(o.assignedTo) !== email) continue
      push(notifications, {
        id: `asset-maint-${o._id}`,
        kind: 'asset',
        title: `Ativo em manutenção: ${o.tag}`,
        message: o.description || o.sector || 'Verifique o estado do equipamento.',
        sender: 'Sistema',
        createdAt: isoDate(o.updatedAt || o.createdAt),
        route: role === 'ADM' || role === 'GESTOR' ? '/ativos' : '/meus-ativos',
      })
    }
  }

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const seen = new Set()
  const unique = []
  for (const item of notifications) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    unique.push(item)
  }

  return unique.slice(0, 50)
}
