import Asset from '../models/Asset.js'
import { AppError } from './AppError.js'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function normalizeRole(role) {
  return String(role ?? '').trim().toUpperCase()
}

export function isEmployeeRole(role) {
  return normalizeRole(role) === 'FUNCIONARIO'
}

/** Funcionário só vê ativos atribuídos ao seu e-mail; demais perfis veem todos. */
export function buildAssetListFilter(tenantId, user) {
  const base = { tenantId }
  if (!isEmployeeRole(user?.role)) return base
  const email = normalizeEmail(user?.email)
  if (!email) return { ...base, assignedTo: '__none__' }
  return { ...base, assignedTo: email }
}

export async function findAssetByTagOrShortCode(tenantId, tagOrCode) {
  const raw = String(tagOrCode ?? '').trim()
  if (!raw) return null
  const byTag = await Asset.findOne({ tenantId, tag: raw })
  if (byTag) return byTag
  return Asset.findOne({
    tenantId,
    shortCode: { $regex: new RegExp(`^${escapeRegex(raw)}$`, 'i') },
  })
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function assertAssetAssignedToUser(asset, user) {
  if (!asset) {
    throw new AppError(404, 'Ativo não encontrado.')
  }
  if (!isEmployeeRole(user?.role)) return
  const email = normalizeEmail(user?.email)
  const assigned = normalizeEmail(asset.assignedTo)
  if (!email || assigned !== email) {
    throw new AppError(
      403,
      'Só pode solicitar manutenção ou movimentação de ativos atribuídos a si.',
    )
  }
}

export async function assertUserCanRequestAsset(tenantId, user, assetTagOrCode) {
  const asset = await findAssetByTagOrShortCode(tenantId, assetTagOrCode)
  assertAssetAssignedToUser(asset, user)
  return asset
}
