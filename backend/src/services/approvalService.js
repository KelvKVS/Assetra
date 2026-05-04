import Asset from '../models/Asset.js'
import { AppError } from '../utils/AppError.js'

export async function listPendingApprovals(tenantId) {
  const assets = await Asset.find({
    tenantId,
    'history.action': { $in: ['MANUTENCAO_SOLICITADA', 'MOVIMENTACAO_SOLICITADA'] },
  })

  const pendingApprovals = []
  assets.forEach((asset) => {
    asset.history.forEach((h) => {
      if (h.action.endsWith('_SOLICITADA')) {
        pendingApprovals.push({
          id: h._id,
          assetId: asset._id,
          assetTag: asset.tag,
          type: h.action.includes('MANUTENCAO') ? 'Manutenção' : 'Movimentação',
          description: h.details,
          status: 'Pendente',
          date: h.date,
        })
      }
    })
  })
  return pendingApprovals
}

export async function respondToApproval(tenantId, userId, historyEntryId, decision, notes) {
  const asset = await Asset.findOne({ 'history._id': historyEntryId, tenantId })
  if (!asset) {
    throw new AppError(404, 'Solicitação não encontrada.')
  }
  const historyItem = asset.history.id(historyEntryId)
  historyItem.action =
    decision === 'APPROVED'
      ? historyItem.action.replace('_SOLICITADA', '_APROVADA')
      : historyItem.action.replace('_SOLICITADA', '_REPROVADA')

  asset.history.push({
    action: decision === 'APPROVED' ? 'SISTEMA_APROVACAO' : 'SISTEMA_REPROVACAO',
    userId,
    details: `${decision === 'APPROVED' ? 'Aprovado' : 'Reprovado'}: ${notes || 'Sem observações'}`,
  })
  await asset.save()
  return { ok: true }
}
