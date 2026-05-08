import Maintenance from '../models/Maintenance.js'
import Asset from '../models/Asset.js'
import prisma from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { logAudit } from './auditService.js'
import { publishDomainEvent } from '../lib/eventBus.js'

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

function toDto(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    assetTag: o.assetTag,
    type: o.type,
    description: o.description ?? '',
    priority: o.priority,
    status: o.status,
    assignedTechnicianEmail: o.assignedTechnicianEmail ?? '',
    assignedTechnicianName: o.assignedTechnicianName ?? '',
    attachments: Array.isArray(o.attachments) ? o.attachments : [],
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
  if (open) {
    asset.status = 'Em manutenção'
  } else if (asset.status === 'Em manutenção') {
    asset.status = 'Disponível'
  }
  await asset.save()
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
  const m = new Maintenance({
    tenantId,
    assetTag: dto.assetTag.trim(),
    type: dto.type.trim(),
    description: (dto.description ?? '').trim(),
    priority: dto.priority,
    status: dto.status,
    assignedTechnicianEmail: assignedTechnician.email,
    assignedTechnicianName: assignedTechnician.name,
    attachments: Array.isArray(dto.attachments) ? dto.attachments : [],
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
  await publishDomainEvent('maintenance.created', {
    tenantId,
    maintenanceId: String(m._id),
    assetTag: m.assetTag,
    status: m.status,
  }).catch(() => {})
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
    m.attachments = Array.isArray(dto.attachments) ? dto.attachments : []
  }
  if (dto.openingDate) {
    const dt = parseOpeningInput(dto.openingDate)
    if (dt) m.openingDate = dt
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
  await publishDomainEvent('maintenance.updated', {
    tenantId,
    maintenanceId: String(m._id),
    assetTag: m.assetTag,
    status: m.status,
  }).catch(() => {})
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
  await publishDomainEvent('maintenance.deleted', {
    tenantId,
    maintenanceId: String(m._id),
    assetTag: m.assetTag,
  }).catch(() => {})
}
