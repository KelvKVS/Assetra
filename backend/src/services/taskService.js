import Maintenance from '../models/Maintenance.js'
import { AppError } from '../utils/AppError.js'
import { refreshAssetStatusForTag } from './maintenanceService.js'

function uiStatusFromMaintenance(status) {
  if (status === 'Aberta') return 'Aberta'
  if (status === 'Em andamento') return 'Em andamento'
  return 'Concluída'
}

function formatDue(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function dueUrgency(dueAt, status) {
  if (!dueAt || status === 'Concluída') return 'none'
  const due = new Date(dueAt).getTime()
  const now = Date.now()
  if (due < now) return 'overdue'
  if (due - now < 24 * 60 * 60 * 1000) return 'soon'
  return 'ok'
}

function toTaskDto(m) {
  const o = m.toObject ? m.toObject() : m
  const desc = o.description?.trim() || `${o.type} — ${o.assetTag}`
  const pendingExt = (o.extensionRequests ?? []).find((r) => r.status === 'Pendente')
  return {
    id: String(o._id),
    assetTag: o.assetTag,
    task: desc,
    priority: o.priority,
    status: uiStatusFromMaintenance(o.status),
    assignedTechnicianEmail: o.assignedTechnicianEmail ?? '',
    assignedTechnicianName: o.assignedTechnicianName ?? '',
    validationDueAt: o.validationDueAt ? new Date(o.validationDueAt).toISOString() : '',
    validationDueDisplay: formatDue(o.validationDueAt),
    dueUrgency: dueUrgency(o.validationDueAt, o.status),
    lastReturnNotes: o.lastReturnNotes ?? '',
    lastReturnedAt: o.lastReturnedAt ? new Date(o.lastReturnedAt).toISOString() : '',
    lastReturnedByName: o.lastReturnedByName ?? '',
    hasPendingExtension: Boolean(pendingExt),
    pendingExtension: pendingExt
      ? {
          id: String(pendingExt._id),
          proposedDueDisplay: formatDue(pendingExt.proposedDueAt),
          reason: pendingExt.reason ?? '',
        }
      : null,
  }
}

export async function listTechnicalTasks(tenantId, user) {
  const query = {
    tenantId,
    status: { $ne: 'Concluída' },
  }
  if (String(user?.role) === 'TECNICO') {
    query.assignedTechnicianEmail = String(user?.email ?? '').trim().toLowerCase()
  }
  const rows = await Maintenance.find(query).sort({ openingDate: 1 })
  return rows.map((m) => toTaskDto(m))
}

export async function advanceTechnicalTask(tenantId, user, maintenanceId) {
  const m = await Maintenance.findOne({ _id: maintenanceId, tenantId })
  if (!m) {
    throw new AppError(404, 'Ordem não encontrada.')
  }
  if (
    String(user?.role) === 'TECNICO' &&
    String(m.assignedTechnicianEmail ?? '').trim().toLowerCase() !== String(user?.email ?? '').trim().toLowerCase()
  ) {
    throw new AppError(403, 'Esta ordem está atribuída a outro técnico.')
  }
  if (m.status === 'Aberta') {
    m.status = 'Em andamento'
  } else if (m.status === 'Em andamento') {
    m.status = 'Concluída'
  } else {
    throw new AppError(400, 'Ordem já concluída.')
  }
  await m.save()
  await refreshAssetStatusForTag(tenantId, m.assetTag)
  return toTaskDto(m)
}
