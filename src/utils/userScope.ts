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
