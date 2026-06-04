/**
 * Query de listagem: ?page=1&limit=50&lite=1
 * Sem page/limit → lista completa (compatível com clientes antigos).
 */
export function parseListQuery(query = {}) {
  const pageRaw = query.page
  const limitRaw = query.limit
  const paginated = pageRaw != null && String(pageRaw).trim() !== ''
  const page = paginated ? Math.max(1, parseInt(String(pageRaw), 10) || 1) : 1
  const limit = paginated
    ? Math.min(200, Math.max(1, parseInt(String(limitRaw ?? 50), 10) || 50))
    : null
  const lite = query.lite === '1' || query.lite === 'true'
  return { paginated, page, limit, lite, skip: paginated && limit ? (page - 1) * limit : 0 }
}

export function buildListResult({ items, total, paginated, page, limit }) {
  if (!paginated) {
    return { items, paginated: false }
  }
  const safeLimit = limit || 50
  const pages = Math.max(1, Math.ceil(total / safeLimit))
  return {
    items,
    paginated: true,
    total,
    page,
    limit: safeLimit,
    pages,
  }
}

export function sendListResponse(res, result) {
  if (result.paginated) {
    return res.json({
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    })
  }
  return res.json(result.items)
}
