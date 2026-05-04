import Asset from '../models/Asset.js'
import { AppError } from '../utils/AppError.js'

export async function listMovementsForTenant(tenantId) {
  const assets = await Asset.find({
    tenantId,
    'history.action': 'MOVIMENTAÇÃO',
  })

  const movements = []
  assets.forEach((asset) => {
    asset.history.forEach((h) => {
      if (h.action === 'MOVIMENTAÇÃO') {
        movements.push({
          id: h._id,
          assetTag: asset.tag,
          assetName: asset.name,
          date: h.date,
          details: h.details,
          userId: h.userId,
        })
      }
    })
  })
  return movements.sort((a, b) => b.date - a.date)
}

export async function registerMovement(tenantId, userId, { assetTag, newLocation, assignedTo, details }) {
  const asset = await Asset.findOne({ tag: assetTag, tenantId })
  if (!asset) {
    throw new AppError(404, 'Ativo não encontrado.')
  }
  const oldLocation = asset.location || 'Não definida'
  asset.location = newLocation
  if (assignedTo) asset.assignedTo = assignedTo
  asset.history.push({
    action: 'MOVIMENTAÇÃO',
    userId,
    details: `Origem: ${oldLocation} -> Destino: ${newLocation}. Obs: ${details || 'Nenhuma'}`,
  })
  await asset.save()
  return asset
}
