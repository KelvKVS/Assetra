import Movement from '../models/Movement.js'
import prisma from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { findAssetByTag } from './assetService.js'

function formatDatePt(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString('pt-BR')
}

function userLabel(user) {
  if (!user) return 'Não atribuído'
  return `${user.name} (${user.email})`
}

async function findActiveUserByEmail(tenantId, email) {
  const lower = String(email ?? '').trim().toLowerCase()
  if (!lower) return null
  return prisma.user.findFirst({
    where: { tenantId, email: lower, active: true },
    select: { id: true, name: true, email: true, department: true },
  })
}

async function labelForAssigneeEmail(tenantId, email) {
  const lower = String(email ?? '').trim().toLowerCase()
  if (!lower) return 'Não atribuído'
  const user = await findActiveUserByEmail(tenantId, lower)
  return user ? userLabel(user) : lower
}

function toDto(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    date: formatDatePt(o.occurredAt || o.createdAt),
    assetTag: o.assetTag,
    origin: o.origin,
    destination: o.destination,
    fromUserEmail: o.fromUserEmail ?? '',
    toUserEmail: o.toUserEmail ?? '',
    responsible: o.responsible,
  }
}

/**
 * Transfere o ativo para o utilizador de destino (assignedTo + setor da área do destino).
 */
async function applyAssetTransfer(tenantId, userId, { assetTag, destinationEmail }) {
  const tag = String(assetTag ?? '').trim()
  const toEmail = String(destinationEmail ?? '').trim().toLowerCase()
  if (!tag || !toEmail) {
    throw new AppError(400, 'Tag do ativo e utilizador de destino são obrigatórios.')
  }

  const destUser = await findActiveUserByEmail(tenantId, toEmail)
  if (!destUser) {
    throw new AppError(400, 'Utilizador de destino não encontrado ou inativo nesta organização.')
  }

  const asset = await findAssetByTag(tenantId, tag)
  if (!asset) {
    throw new AppError(404, `Ativo "${tag}" não encontrado.`)
  }

  const fromEmail = String(asset.assignedTo ?? '').trim().toLowerCase()
  if (fromEmail === toEmail) {
    throw new AppError(400, 'O ativo já está atribuído a este utilizador.')
  }

  const fromLabel = await labelForAssigneeEmail(tenantId, fromEmail)
  const toLabel = userLabel(destUser)

  asset.assignedTo = toEmail
  const dept = String(destUser.department ?? '').trim()
  if (dept) {
    asset.sector = dept
  }

  asset.history.push({
    action: 'MOVIMENTAÇÃO',
    userId,
    details: `Atribuído: ${fromLabel} → ${toLabel}`,
  })

  await asset.save()
  return { fromLabel, toLabel, fromEmail, toEmail }
}

export async function listMovementsForTenant(tenantId) {
  const rows = await Movement.find({ tenantId }).sort({ occurredAt: -1, createdAt: -1 })
  return rows.map(toDto)
}

export async function createMovement(tenantId, userId, dto) {
  const tag = dto.assetTag.trim()
  const toEmail = dto.destinationEmail.trim().toLowerCase()

  const { fromLabel, toLabel, fromEmail } = await applyAssetTransfer(tenantId, userId, {
    assetTag: tag,
    destinationEmail: toEmail,
  })

  const m = new Movement({
    tenantId,
    assetTag: tag,
    origin: fromLabel,
    destination: toLabel,
    fromUserEmail: fromEmail || undefined,
    toUserEmail: toEmail,
    responsible: toLabel,
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

export async function updateMovement(tenantId, movementId, dto, userId = null) {
  const m = await Movement.findOne({ _id: movementId, tenantId })
  if (!m) {
    throw new AppError(404, 'Movimentação não encontrada.')
  }
  if (dto.assetTag != null) m.assetTag = dto.assetTag.trim()
  if (dto.date) {
    const dt = parseDisplayDate(dto.date)
    if (dt) m.occurredAt = dt
  }

  if (dto.destinationEmail != null && userId) {
    const toEmail = dto.destinationEmail.trim().toLowerCase()
    const { fromLabel, toLabel, fromEmail } = await applyAssetTransfer(tenantId, userId, {
      assetTag: m.assetTag,
      destinationEmail: toEmail,
    })
    m.origin = fromLabel
    m.destination = toLabel
    m.fromUserEmail = fromEmail || undefined
    m.toUserEmail = toEmail
    m.responsible = toLabel
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

/** Usado ao aprovar solicitação de movimentação. */
export async function registerMovementFromApproval(tenantId, userId, payload) {
  return createMovement(tenantId, userId, {
    assetTag: payload.assetTag,
    destinationEmail: payload.destinationEmail,
  })
}

/** Legado: extrai setor de descrições antigas (não usado para transferir ativo). */
export function parseDestinationFromDescription(description) {
  const match = String(description ?? '').match(/\(destino:\s*([^)]+)\)/i)
  return match?.[1]?.trim() ?? ''
}
