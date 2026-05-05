import Movement from '../models/Movement.js'
import { AppError } from '../utils/AppError.js'

function formatDatePt(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString('pt-BR')
}

function toDto(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    date: formatDatePt(o.occurredAt || o.createdAt),
    assetTag: o.assetTag,
    origin: o.origin,
    destination: o.destination,
    responsible: o.responsible,
  }
}

export async function listMovementsForTenant(tenantId) {
  const rows = await Movement.find({ tenantId }).sort({ occurredAt: -1, createdAt: -1 })
  return rows.map(toDto)
}

/**
 * Cria registo de movimentação. O `dto` deve coincidir com `movementCreateSchema`:
 * `{ assetTag, origin, destination, responsible }`.
 * (Não existe `registerMovement` nem campos `newLocation`/`assignedTo` neste fluxo.)
 */
export async function createMovement(tenantId, userId, dto) {
  const m = new Movement({
    tenantId,
    assetTag: dto.assetTag.trim(),
    origin: dto.origin.trim(),
    destination: dto.destination.trim(),
    responsible: dto.responsible.trim(),
    occurredAt: new Date(),
  })
  await m.save()
  return toDto(m)
}

function parseDisplayDate(s) {
  if (!s || typeof s !== 'string') return null
  const parts = s.trim().split('/')
  if (parts.length === 3) {
    const d = Number(parts[0])
    const mo = Number(parts[1]) - 1
    const y = Number(parts[2])
    if (y > 0 && mo >= 0 && d > 0) return new Date(y, mo, d)
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : new Date(t)
}

export async function updateMovement(tenantId, movementId, dto) {
  const m = await Movement.findOne({ _id: movementId, tenantId })
  if (!m) {
    throw new AppError(404, 'Movimentação não encontrada.')
  }
  if (dto.assetTag != null) m.assetTag = dto.assetTag.trim()
  if (dto.origin != null) m.origin = dto.origin.trim()
  if (dto.destination != null) m.destination = dto.destination.trim()
  if (dto.responsible != null) m.responsible = dto.responsible.trim()
  if (dto.date) {
    const dt = parseDisplayDate(dto.date)
    if (dt) m.occurredAt = dt
  }
  await m.save()
  return toDto(m)
}

export async function deleteMovement(tenantId, movementId) {
  const r = await Movement.findOneAndDelete({ _id: movementId, tenantId })
  if (!r) {
    throw new AppError(404, 'Movimentação não encontrada.')
  }
}
