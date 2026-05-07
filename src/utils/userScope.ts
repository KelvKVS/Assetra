/** Filtros alinhados aos dados da API (sem mapeamento fixo por e-mail). */

export function assetsAssignedToEmail<T extends { assignedTo?: string | null }>(
  assets: T[],
  email: string | undefined | null,
): T[] {
  if (!email?.trim()) return []
  const e = email.trim().toLowerCase()
  return assets.filter((a) => (a.assignedTo ?? '').trim().toLowerCase() === e)
}

export function movementsWhereResponsibleIsName<T extends { responsible?: string | null }>(
  movements: T[],
  displayName: string | undefined | null,
): T[] {
  if (!displayName?.trim()) return []
  const n = displayName.trim().toLowerCase()
  return movements.filter((m) => (m.responsible ?? '').trim().toLowerCase() === n)
}

export function movementsInvolvingUser<T extends { responsible?: string | null }>(
  movements: T[],
  user: { name?: string | null; email?: string | null } | null | undefined,
): T[] {
  const name = user?.name?.trim().toLowerCase()
  const email = user?.email?.trim().toLowerCase()
  if (!name && !email) return []
  return movements.filter((m) => {
    const responsible = (m.responsible ?? '').trim().toLowerCase()
    return Boolean(responsible && (responsible === name || responsible === email))
  })
}

export function maintenancesInvolvingUserByAssets<
  TMaintenance extends { assetTag?: string | null },
  TAsset extends { tag?: string | null; assignedTo?: string | null },
>(
  maintenances: TMaintenance[],
  assets: TAsset[],
  email: string | undefined | null,
): TMaintenance[] {
  const myAssetTags = new Set(
    assetsAssignedToEmail(assets, email)
      .map((asset) => (asset.tag ?? '').trim())
      .filter(Boolean),
  )
  return maintenances.filter((m) => myAssetTags.has((m.assetTag ?? '').trim()))
}
