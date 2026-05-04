import Asset from '../models/Asset.js'
import { AppError } from '../utils/AppError.js'

export async function listTechnicalTasks(tenantId) {
  const assets = await Asset.find({
    tenantId,
    status: 'MANUTENCAO',
  })

  return assets.map((asset) => {
    const lastMaint = [...asset.history].reverse().find((h) => h.action.includes('MANUTENCAO'))
    return {
      id: asset._id,
      assetTag: asset.tag,
      task: lastMaint ? lastMaint.details : 'Reparo/Manutenção Geral',
      priority: 'Média',
      status: asset.status === 'MANUTENCAO' ? 'Em andamento' : 'Pendente',
    }
  })
}

export async function completeTechnicalTask(tenantId, userId, assetId, notes) {
  const asset = await Asset.findOne({ _id: assetId, tenantId })
  if (!asset) {
    throw new AppError(404, 'Tarefa/Ativo não encontrado.')
  }
  asset.status = 'ATIVO'
  asset.history.push({
    action: 'MANUTENCAO_FECHAMENTO',
    userId,
    details: `Manutenção concluída: ${notes || 'Sem observações técnicas'}`,
  })
  await asset.save()
  return asset
}
