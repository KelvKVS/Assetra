import Asset from '../models/Asset.js'
import prisma from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { logAudit } from './auditService.js'

function toDto(doc) {
  if (!doc) return null
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    tag: o.tag,
    description: o.description,
    sector: o.sector,
    status: o.status,
    assignedTo: o.assignedTo,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

/**
 * Garante que o e-mail está registado como utilizador ATIVO do tenant.
 * Lança 400 se não existir.
 */
async function assertAssignedEmailExists(tenantId, email) {
  if (!email) return
  const lower = email.trim().toLowerCase()
  if (!lower) return
  const exists = await prisma.user.findFirst({
    where: { tenantId, email: lower, active: true },
    select: { id: true },
  })
  if (!exists) {
    throw new AppError(
      400,
      `O e-mail "${lower}" não pertence a nenhum utilizador ativo desta organização.`,
    )
  }
}

export async function listAssetsByTenant(tenantId) {
  const rows = await Asset.find({ tenantId }).sort({ updatedAt: -1 })
  return rows.map(toDto)
}

export async function createAssetForTenant(tenantId, userId, dto) {
  const assigned = dto.assignedTo?.trim().toLowerCase()
  await assertAssignedEmailExists(tenantId, assigned)
  try {
    const asset = new Asset({
      tag: dto.tag.trim(),
      description: dto.description.trim(),
      sector: dto.sector.trim(),
      status: dto.status ?? 'Disponível',
      assignedTo: assigned || undefined,
      tenantId,
      history: [{ action: 'CRIAÇÃO', userId, details: 'Ativo cadastrado' }],
    })
    await asset.save()
    await logAudit({
      tenantId,
      actor: { sub: userId },
      entityType: 'Asset',
      entityId: String(asset._id),
      action: 'CREATE',
      before: null,
      after: toDto(asset),
    })
    return toDto(asset)
  } catch (e) {
    if (e instanceof AppError) throw e
    throw new AppError(400, 'Erro ao criar ativo (tag duplicada no tenant ou dados inválidos).')
  }
}

export async function updateAssetForTenant(tenantId, userId, assetId, dto) {
  const asset = await Asset.findOne({ _id: assetId, tenantId })
  const before = toDto(asset)
  if (!asset) {
    throw new AppError(404, 'Ativo não encontrado.')
  }
  if (dto.tag && dto.tag.trim().toLowerCase() !== asset.tag.toLowerCase()) {
    const clash = await Asset.findOne({
      tenantId,
      tag: dto.tag.trim(),
      _id: { $ne: asset._id },
    })
    if (clash) {
      throw new AppError(400, 'Já existe outro ativo com esta tag.')
    }
    asset.tag = dto.tag.trim()
  }
  if (dto.description != null) asset.description = dto.description.trim()
  if (dto.sector != null) asset.sector = dto.sector.trim()
  if (dto.status != null) asset.status = dto.status
  if (dto.assignedTo !== undefined) {
    const v = dto.assignedTo == null ? '' : String(dto.assignedTo).trim().toLowerCase()
    if (v) {
      await assertAssignedEmailExists(tenantId, v)
    }
    asset.assignedTo = v || undefined
  }
  asset.history.push({
    action: 'EDIÇÃO',
    userId,
    details: 'Dados do ativo atualizados',
  })
  await asset.save()
  await logAudit({
    tenantId,
    actor: { sub: userId },
    entityType: 'Asset',
    entityId: String(asset._id),
    action: 'UPDATE',
    before,
    after: toDto(asset),
  })
  return toDto(asset)
}

export async function deleteAssetForTenant(tenantId, assetId) {
  const current = await Asset.findOne({ _id: assetId, tenantId })
  const result = await Asset.findOneAndDelete({ _id: assetId, tenantId })
  if (!result) {
    throw new AppError(404, 'Ativo não encontrado.')
  }
  if (current) {
    await logAudit({
      tenantId,
      actor: null,
      entityType: 'Asset',
      entityId: String(current._id),
      action: 'DELETE',
      before: toDto(current),
      after: null,
    })
  }
}

/** @param {string} tenantId */
export async function findAssetByTag(tenantId, tag) {
  return Asset.findOne({ tenantId, tag: tag.trim() })
}
