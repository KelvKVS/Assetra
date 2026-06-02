/** Filtros alinhados aos dados da API (sem mapeamento fixo por e-mail). */

export function assetsEligibleForRequests<
  T extends { assignedTo?: string | null },
>(
  assets: T[],
  user: { role?: string | null; email?: string | null } | null | undefined,
): T[] {
  const role = String(user?.role ?? '').trim().toUpperCase()
  if (role === 'FUNCIONARIO') {
    return assetsAssignedToEmail(assets, user?.email)
  }
  return assets
}

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

export function movementsInvolvingUser<
  T extends {
    responsible?: string | null
    fromUserEmail?: string | null
    toUserEmail?: string | null
    origin?: string | null
    destination?: string | null
  },
>(
  movements: T[],
  user: { name?: string | null; email?: string | null } | null | undefined,
): T[] {
  const name = user?.name?.trim().toLowerCase()
  const email = user?.email?.trim().toLowerCase()
  if (!name && !email) return []
  return movements.filter((m) => {
    const from = (m.fromUserEmail ?? '').trim().toLowerCase()
    const to = (m.toUserEmail ?? '').trim().toLowerCase()
    if (email && (from === email || to === email)) return true
    const responsible = (m.responsible ?? '').trim().toLowerCase()
    const origin = (m.origin ?? '').trim().toLowerCase()
    const destination = (m.destination ?? '').trim().toLowerCase()
    return Boolean(
      (email && (responsible.includes(email) || origin.includes(email) || destination.includes(email))) ||
        (name && (responsible.includes(name) || origin.includes(name) || destination.includes(name))),
    )
  })
}

export function maintenancesInvolvingUserByAssets<
  TMaintenance extends { assetTag?: string | null; assignedTechnicianEmail?: string | null },
  TAsset extends { tag?: string | null; assignedTo?: string | null },
>(
  maintenances: TMaintenance[],
  assets: TAsset[],
  email: string | undefined | null,
): TMaintenance[] {
  const normalizedEmail = email?.trim().toLowerCase() ?? ''
  const myAssetTags = new Set(
    assetsAssignedToEmail(assets, email)
      .map((asset) => (asset.tag ?? '').trim())
      .filter(Boolean),
  )
  return maintenances.filter((m) => {
    const assignedTechEmail = (m.assignedTechnicianEmail ?? '').trim().toLowerCase()
    if (normalizedEmail && assignedTechEmail === normalizedEmail) return true
    return myAssetTags.has((m.assetTag ?? '').trim())
  })
}
