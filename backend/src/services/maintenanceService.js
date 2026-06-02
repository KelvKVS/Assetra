import Maintenance from '../models/Maintenance.js'
import Asset from '../models/Asset.js'
import prisma from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { logAudit } from './auditService.js'
import { publishDomainEventSafely } from '../lib/eventBus.js'
import {
  dispatchAssetInMaintenanceEmail,
  dispatchTechnicianAssignmentEmail,
  dispatchUnassignedMaintenanceEmails,
} from './notificationEmailDispatchService.js'
import { enrichAttachmentUrls } from '../utils/enrichAttachments.js'
import { sanitizeAttachmentsForDb } from '../utils/sanitizeAttachments.js'

function parseOpeningInput(s) {
  if (!s || typeof s !== 'string') return null
  const t = s.trim()
  const parts = t.split('/')
  if (parts.length === 3) {
    const d = Number(parts[0])
    const mo = Number(parts[1]) - 1
    const y = Number(parts[2])
    if (y > 0 && mo >= 0 && d > 0) return new Date(y, mo, d)
  }
  const ms = Date.parse(t)
  return Number.isNaN(ms) ? null : new Date(ms)
}

function formatOpening(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString('pt-BR')
}

export function parseDatetimeInput(s) {
  if (!s || typeof s !== 'string') return null
  const t = s.trim()
  const ms = Date.parse(t)
  if (Number.isNaN(ms)) return null
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDatetimeDisplay(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function mapExtensionRequest(r) {
  const o = r.toObject ? r.toObject() : r
  return {
    id: String(o._id),
    requestedBy: o.requestedBy ?? '',
    requestedByName: o.requestedByName ?? '',
    currentDueAt: o.currentDueAt ? new Date(o.currentDueAt).toISOString() : '',
    currentDueDisplay: formatDatetimeDisplay(o.currentDueAt),
    proposedDueAt: o.proposedDueAt ? new Date(o.proposedDueAt).toISOString() : '',
    proposedDueDisplay: formatDatetimeDisplay(o.proposedDueAt),
    reason: o.reason ?? '',
    status: o.status ?? 'Pendente',
    decidedByName: o.decidedByName ?? '',
    decidedAt: o.decidedAt ? new Date(o.decidedAt).toISOString() : '',
    notes: o.notes ?? '',
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : '',
  }
}

function toDto(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  const extensions = (o.extensionRequests ?? []).map(mapExtensionRequest)
  const pendingExtension = extensions.find((e) => e.status === 'Pendente') ?? null
  return {
    id: String(o._id),
    assetTag: o.assetTag,
    type: o.type,
    description: o.description ?? '',
    priority: o.priority,
    status: o.status,
    assignedTechnicianEmail: o.assignedTechnicianEmail ?? '',
    assignedTechnicianName: o.assignedTechnicianName ?? '',
    validationDueAt: o.validationDueAt ? new Date(o.validationDueAt).toISOString() : '',
    validationDueDisplay: formatDatetimeDisplay(o.validationDueAt),
    lastReturnNotes: o.lastReturnNotes ?? '',
    lastReturnedAt: o.lastReturnedAt ? new Date(o.lastReturnedAt).toISOString() : '',
    lastReturnedByName: o.lastReturnedByName ?? '',
    extensionRequests: extensions,
    pendingExtension,
    attachments: enrichAttachmentUrls(null, o.attachments, o.tenantId),
    openingDate: formatOpening(o.openingDate),
  }
}

async function resolveTechnicianAssignment(tenantId, assignedTechnicianEmail) {
  const raw = String(assignedTechnicianEmail ?? '').trim().toLowerCase()
  if (!raw) return { email: '', name: '' }
  const technician = await prisma.user.findFirst({
    where: {
      tenantId,
      email: raw,
      role: 'TECNICO',
      active: true,
    },
  })
  if (!technician) {
    throw new AppError(400, 'Técnico responsável inválido para este tenant.')
  }
  return {
    email: technician.email,
    name: technician.name,
  }
}

/** Recalcula status do ativo conforme chamados abertos para a tag. */
export async function refreshAssetStatusForTag(tenantId, assetTag) {
  const tag = (assetTag || '').trim()
  if (!tag) return
  const open = await Maintenance.exists({
    tenantId,
    assetTag: tag,
    status: { $in: ['Aberta', 'Em andamento'] },
  })
  const asset = await Asset.findOne({ tenantId, tag })
  if (!asset) return
  const previousStatus = asset.status
  if (open) {
    asset.status = 'Em manutenção'
  } else if (asset.status === 'Em manutenção') {
    asset.status = 'Disponível'
  }
  await asset.save()

  if (previousStatus !== 'Em manutenção' && asset.status === 'Em manutenção') {
    await dispatchAssetInMaintenanceEmail(tenantId, asset).catch((err) => {
      console.warn('[notifications] Falha ao enfileirar e-mail (asset maintenance):', err?.message ?? err)
    })
  }
}

export async function listMaintenancesForTenant(tenantId) {
  const rows = await Maintenance.find({ tenantId }).sort({ openingDate: -1 })
  return rows.map(toDto)
}

/**
 * Abre chamado de manutenção. O `dto` deve coincidir com `maintenanceCreateSchema`:
 * `{ assetTag, type, description?, priority, status, openingDate? }`.
 * O texto livre fica em `description` (não existe campo `details` no modelo).
 */
export async function createMaintenance(tenantId, userId, dto, actor = null) {
  const asset = await Asset.findOne({ tenantId, tag: dto.assetTag.trim() })
  if (!asset) {
    throw new AppError(404, 'Ativo não encontrado para este tenant.')
  }
  const assignedTechnician = await resolveTechnicianAssignment(tenantId, dto.assignedTechnicianEmail)
  let openingDate = new Date()
  if (dto.openingDate) {
    const dt = parseOpeningInput(dto.openingDate)
    if (dt) openingDate = dt
  }
  let validationDueAt
  if (dto.validationDueAt) {
    const due = parseDatetimeInput(dto.validationDueAt)
    if (due) validationDueAt = due
  }
  const m = new Maintenance({
    tenantId,
    assetTag: dto.assetTag.trim(),
    type: dto.type.trim(),
    description: (dto.description ?? '').trim(),
    priority: dto.priority,
    status: dto.status,
    assignedTechnicianEmail: assignedTechnician.email,
    assignedTechnicianName: assignedTechnician.name,
    validationDueAt,
    attachments: sanitizeAttachmentsForDb(dto.attachments),
    openingDate,
  })
  await m.save()
  await refreshAssetStatusForTag(tenantId, m.assetTag)
  await logAudit({
    tenantId,
    actor: actor ?? { sub: userId },
    entityType: 'Maintenance',
    entityId: String(m._id),
    action: 'CREATE',
    before: null,
    after: toDto(m),
  })
  await publishDomainEventSafely('maintenance.created', {
    tenantId,
    maintenanceId: String(m._id),
    assetTag: m.assetTag,
    status: m.status,
  }, { service: 'maintenanceService', action: 'createMaintenance' })
  const maintObj = m.toObject()
  await dispatchUnassignedMaintenanceEmails(tenantId, maintObj).catch((err) => {
    console.warn('[notifications] Falha ao enfileirar e-mail (maintenance.created):', err?.message ?? err)
  })
  if (maintObj.assignedTechnicianEmail) {
    await dispatchTechnicianAssignmentEmail(tenantId, maintObj).catch((err) => {
      console.warn('[notifications] Falha ao enfileirar e-mail (technician assign):', err?.message ?? err)
    })
  }
  return toDto(m)
}

export async function updateMaintenance(tenantId, maintenanceId, dto, actor = null) {
  const m = await Maintenance.findOne({ _id: maintenanceId, tenantId })
  if (!m) {
    throw new AppError(404, 'Manutenção não encontrada.')
  }
  const before = toDto(m)
  const prevTag = m.assetTag
  if (dto.assetTag != null) m.assetTag = dto.assetTag.trim()
  if (dto.type != null) m.type = dto.type.trim()
  if (dto.description != null) m.description = dto.description.trim()
  if (dto.priority != null) m.priority = dto.priority
  if (dto.status != null) m.status = dto.status
  if (dto.assignedTechnicianEmail !== undefined) {
    const assignedTechnician = await resolveTechnicianAssignment(tenantId, dto.assignedTechnicianEmail)
    m.assignedTechnicianEmail = assignedTechnician.email
    m.assignedTechnicianName = assignedTechnician.name
  }
  if (dto.attachments !== undefined) {
    m.attachments = sanitizeAttachmentsForDb(dto.attachments)
  }
  if (dto.openingDate) {
    const dt = parseOpeningInput(dto.openingDate)
    if (dt) m.openingDate = dt
  }
  if (dto.validationDueAt !== undefined) {
    if (dto.validationDueAt === null || dto.validationDueAt === '') {
      m.validationDueAt = undefined
    } else {
      const due = parseDatetimeInput(dto.validationDueAt)
      if (!due) {
        throw new AppError(400, 'Data de entrega inválida.')
      }
      m.validationDueAt = due
    }
  }
  await m.save()
  await refreshAssetStatusForTag(tenantId, m.assetTag)
  if (prevTag !== m.assetTag) {
    await refreshAssetStatusForTag(tenantId, prevTag)
  }
  const after = toDto(m)
  await logAudit({
    tenantId,
    actor,
    entityType: 'Maintenance',
    entityId: String(m._id),
    action: 'UPDATE',
    before,
    after,
  })
  await publishDomainEventSafely('maintenance.updated', {
    tenantId,
    maintenanceId: String(m._id),
    assetTag: m.assetTag,
    status: m.status,
  }, { service: 'maintenanceService', action: 'updateMaintenance' })

  const maintObj = m.toObject()
  if (dto.assignedTechnicianEmail !== undefined && maintObj.assignedTechnicianEmail) {
    await dispatchTechnicianAssignmentEmail(tenantId, maintObj).catch((err) => {
      console.warn('[notifications] Falha ao enfileirar e-mail (maintenance.updated):', err?.message ?? err)
    })
  }
  return toDto(m)
}

export async function setMaintenanceValidationDue(tenantId, maintenanceId, validationDueAtRaw, actor) {
  const m = await Maintenance.findOne({ _id: maintenanceId, tenantId })
  if (!m) {
    throw new AppError(404, 'Manutenção não encontrada.')
  }
  const due = parseDatetimeInput(validationDueAtRaw)
  if (!due) {
    throw new AppError(400, 'Informe uma data e hora válidas para entrega.')
  }
  if (due.getTime() <= Date.now()) {
    throw new AppError(400, 'O prazo deve ser uma data futura.')
  }
  const before = toDto(m)
  m.validationDueAt = due
  await m.save()
  const after = toDto(m)
  await logAudit({
    tenantId,
    actor,
    entityType: 'Maintenance',
    entityId: String(m._id),
    action: 'SET_VALIDATION_DUE',
    before,
    after,
  })
  return after
}

export async function requestMaintenanceExtension(tenantId, user, maintenanceId, dto) {
  const m = await Maintenance.findOne({ _id: maintenanceId, tenantId })
  if (!m) {
    throw new AppError(404, 'Ordem não encontrada.')
  }
  if (m.status === 'Concluída') {
    throw new AppError(400, 'Esta ordem já está concluída.')
  }
  const techEmail = String(m.assignedTechnicianEmail ?? '').trim().toLowerCase()
  const userEmail = String(user?.email ?? '').trim().toLowerCase()
  if (String(user?.role) === 'TECNICO' && techEmail !== userEmail) {
    throw new AppError(403, 'Esta ordem está atribuída a outro técnico.')
  }
  const hasPending = (m.extensionRequests ?? []).some((r) => r.status === 'Pendente')
  if (hasPending) {
    throw new AppError(400, 'Já existe um pedido de adiamento pendente para esta ordem.')
  }
  const proposed = parseDatetimeInput(dto.proposedDueAt)
  if (!proposed) {
    throw new AppError(400, 'Informe a nova data proposta.')
  }
  if (proposed.getTime() <= Date.now()) {
    throw new AppError(400, 'A nova data deve ser futura.')
  }
  if (m.validationDueAt && proposed.getTime() <= new Date(m.validationDueAt).getTime()) {
    throw new AppError(400, 'O adiamento deve ser posterior ao prazo atual.')
  }
  m.extensionRequests.push({
    requestedBy: user?.sub ?? '',
    requestedByName: user?.name ?? '',
    currentDueAt: m.validationDueAt ?? undefined,
    proposedDueAt: proposed,
    reason: String(dto.reason ?? '').trim(),
    status: 'Pendente',
  })
  await m.save()
  return toDto(m)
}

export async function decideMaintenanceExtension(
  tenantId,
  user,
  maintenanceId,
  requestId,
  decision,
  notes,
) {
  const role = String(user?.role ?? '').toUpperCase()
  if (role !== 'ADM' && role !== 'GESTOR') {
    throw new AppError(403, 'Apenas gestor ou administrador pode decidir adiamentos.')
  }
  const m = await Maintenance.findOne({ _id: maintenanceId, tenantId })
  if (!m) {
    throw new AppError(404, 'Manutenção não encontrada.')
  }
  const req = (m.extensionRequests ?? []).find((r) => String(r._id) === String(requestId))
  if (!req) {
    throw new AppError(404, 'Pedido de adiamento não encontrado.')
  }
  if (req.status !== 'Pendente') {
    throw new AppError(400, 'Este pedido de adiamento já foi decidido.')
  }
  req.status = decision === 'APPROVED' ? 'Aprovada' : 'Reprovada'
  req.decidedBy = user?.sub ?? ''
  req.decidedByName = user?.name ?? ''
  req.decidedAt = new Date()
  req.notes = String(notes ?? '').trim()
  if (decision === 'APPROVED') {
    m.validationDueAt = req.proposedDueAt
  }
  await m.save()
  return toDto(m)
}

export async function deleteMaintenance(tenantId, maintenanceId, actor = null) {
  const m = await Maintenance.findOneAndDelete({ _id: maintenanceId, tenantId })
  if (!m) {
    throw new AppError(404, 'Manutenção não encontrada.')
  }
  const before = toDto(m)
  await refreshAssetStatusForTag(tenantId, m.assetTag)
  await logAudit({
    tenantId,
    actor,
    entityType: 'Maintenance',
    entityId: String(m._id),
    action: 'DELETE',
    before,
    after: null,
  })
  await publishDomainEventSafely('maintenance.deleted', {
    tenantId,
    maintenanceId: String(m._id),
    assetTag: m.assetTag,
  }, { service: 'maintenanceService', action: 'deleteMaintenance' })
}
