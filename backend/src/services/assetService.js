import Asset from '../models/Asset.js'
import { AppError } from '../utils/AppError.js'

export async function listAssetsByTenant(tenantId) {
  return Asset.find({ tenantId }).sort({ updatedAt: -1 })
}

/**
 * @param {string} tenantId
 * @param {string} userId
 * @param {object} dto
 */
export async function createAssetForTenant(tenantId, userId, dto) {
  try {
    const asset = new Asset({
      tag: dto.tag,
      name: dto.name,
      type: dto.type,
      status: dto.status ?? 'ATIVO',
      location: dto.location,
      assignedTo: dto.assignedTo,
      tenantId,
      history: [{ action: 'CRIAÇÃO', userId, details: 'Ativo cadastrado no sistema' }],
    })
    await asset.save()
    return asset
  } catch {
    throw new AppError(400, 'Erro ao criar ativo (tag duplicada no tenant ou dados inválidos).')
  }
}

export async function updateAssetStatus(tenantId, userId, assetId, status, details) {
  const asset = await Asset.findOne({ _id: assetId, tenantId })
  if (!asset) {
    throw new AppError(404, 'Ativo não encontrado no seu tenant.')
  }
  asset.status = status
  asset.history.push({
    action: 'STATUS_UPDATE',
    userId,
    details: details || `Status alterado para ${status}`,
  })
  await asset.save()
  return asset
}

export async function deleteAssetForTenant(tenantId, assetId) {
  const result = await Asset.findOneAndDelete({ _id: assetId, tenantId })
  if (!result) {
    throw new AppError(404, 'Ativo não encontrado ou permissão insuficiente.')
  }
}
