import type { Asset } from '../types/assetra'

type AssetLike = Pick<Asset, 'tag' | 'description' | 'sector' | 'shortCode'>

function normalize(s: string) {
  return s.trim().toLowerCase()
}

/** Pesquisa por tag, código breve, descrição, setor ou sufixo da tag. */
export function matchAssetSearch(asset: AssetLike, query: string): boolean {
  const q = normalize(query)
  if (!q) return true

  const tag = normalize(asset.tag ?? '')
  const shortCode = normalize(asset.shortCode ?? '')
  const description = normalize(asset.description ?? '')
  const sector = normalize(asset.sector ?? '')

  if (tag.includes(q) || shortCode.includes(q) || description.includes(q) || sector.includes(q)) {
    return true
  }

  const tagParts = tag.split(/[-_/]/).filter(Boolean)
  if (tagParts.some((part) => part.startsWith(q) || part === q)) return true
  if (tag.endsWith(q)) return true

  return false
}

export function assetSearchLabel(asset: AssetLike): string {
  const code = asset.shortCode?.trim()
  if (code) return `${asset.tag} · ${code}`
  return asset.tag
}
