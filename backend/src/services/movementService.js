import Movement from '../models/Movement.js'
import { AppError } from '../utils/AppError.js'
import { findAssetByTag } from './assetService.js'

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

/**
 * Atualiza o setor do ativo para o destino da movimentação (localização atual).
 */
async function applyAssetRelocation(tenantId, userId, { assetTag, origin, destination, responsible }) {
  const tag = String(assetTag ?? '').trim()
  const dest = String(destination ?? '').trim()
  if (!tag || !dest) {
    throw new AppError(400, 'Tag do ativo e destino são obrigatórios.')
  }

  const asset = await findAssetByTag(tenantId, tag)
  if (!asset) {
    throw new AppError(404, `Ativo "${tag}" não encontrado.`)
  }

  const previousSector = asset.sector
  asset.sector = dest

  const resp = String(responsible ?? '').trim()
  if (resp.includes('@')) {
    asset.assignedTo = resp.toLowerCase()
  }

  const originLabel = String(origin ?? '').trim() || previousSector
  asset.history.push({
    action: 'MOVIMENTAÇÃO',
    userId,
    details: `Local: ${originLabel} → ${dest}${resp ? ` · Resp.: ${resp}` : ''}`,
  })

  await asset.save()
  return asset
}

export async function listMovementsForTenant(tenantId) {
  const rows = await Movement.find({ tenantId }).sort({ occurredAt: -1, createdAt: -1 })
  return rows.map(toDto)
}

export async function createMovement(tenantId, userId, dto) {
  const asset = await findAssetByTag(tenantId, dto.assetTag.trim())
  const origin = String(dto.origin ?? '').trim() || asset?.sector || ''

  const m = new Movement({
    tenantId,
    assetTag: dto.assetTag.trim(),
    origin,
    destination: dto.destination.trim(),
    responsible: dto.responsible.trim(),
    occurredAt: new Date(),
  })
  await m.save()

  await applyAssetRelocation(tenantId, userId, {
    assetTag: dto.assetTag,
    origin,
    destination: dto.destination,
    responsible: dto.responsible,
  })

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

export async function updateMovement(tenantId, movementId, dto, userId = null) {
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

  if (dto.destination != null && userId) {
    await applyAssetRelocation(tenantId, userId, {
      assetTag: m.assetTag,
      origin: m.origin,
      destination: m.destination,
      responsible: m.responsible,
    })
  }

  return toDto(m)
}

export async function deleteMovement(tenantId, movementId) {
  const r = await Movement.findOneAndDelete({ _id: movementId, tenantId })
  if (!r) {
    throw new AppError(404, 'Movimentação não encontrada.')
  }
}

/** Usado ao aprovar solicitação de movimentação. */
export async function registerMovementFromApproval(tenantId, userId, payload) {
  return createMovement(tenantId, userId, payload)
}

export function parseDestinationFromDescription(description) {
  const match = String(description ?? '').match(/\(destino:\s*([^)]+)\)/i)
  return match?.[1]?.trim() ?? ''
}
