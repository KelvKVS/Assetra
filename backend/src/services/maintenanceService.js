import Asset from '../models/Asset.js'
import { AppError } from '../utils/AppError.js'

export async function listMaintenancesForTenant(tenantId) {
  const assets = await Asset.find({
    tenantId,
    'history.action': { $in: ['MANUTENCAO_ABERTURA', 'MANUTENCAO_UPDATE', 'MANUTENCAO_FECHAMENTO'] },
  })

  const maintenances = []
  assets.forEach((asset) => {
    asset.history.forEach((h) => {
      if (h.action.startsWith('MANUTENCAO_')) {
        maintenances.push({
          id: h._id,
          assetId: asset._id,
          assetTag: asset.tag,
          assetName: asset.name,
          action: h.action,
          date: h.date,
          details: h.details,
          userId: h.userId,
          status: asset.status,
        })
      }
    })
  })
  return maintenances.sort((a, b) => b.date - a.date)
}

export async function openMaintenance(tenantId, userId, { assetTag, details, type }) {
  const asset = await Asset.findOne({ tag: assetTag, tenantId })
  if (!asset) {
    throw new AppError(404, 'Ativo não encontrado.')
  }
  asset.status = 'MANUTENCAO'
  asset.history.push({
    action: 'MANUTENCAO_ABERTURA',
    userId,
    details: `[${type}] ${details}`,
  })
  await asset.save()
  return asset
}
