/** TTL padrão para listagens na Pinia (evita refetch em navegação rápida). */
export const LIST_CACHE_MS = 45_000

export function isListCacheFresh(fetchedAt: number, force?: boolean): boolean {
  if (force) return false
  if (!fetchedAt) return false
  return Date.now() - fetchedAt < LIST_CACHE_MS
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

/** Aceita array legado ou envelope paginado. */
export function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  return []
}
