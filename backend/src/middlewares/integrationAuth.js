function parseTenantApiKeys(raw) {
  const pairs = String(raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  const map = new Map()
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf(':')
    if (separatorIndex < 1) continue
    const tenantId = pair.slice(0, separatorIndex).trim()
    const key = pair.slice(separatorIndex + 1).trim()
    if (!tenantId || !key) continue
    map.set(tenantId, key)
  }
  return map
}

function readTenantId(req) {
  const headerTenant = String(req.headers['x-tenant-id'] ?? '').trim()
  if (headerTenant) return headerTenant
  const queryTenant = String(req.query?.tenantId ?? '').trim()
  if (queryTenant) return queryTenant
  return String(req.body?.tenantId ?? '').trim()
}

export function integrationApiKeyAuth(req, res, next) {
  const providedKey = String(req.headers['x-api-key'] ?? '').trim()
  if (!providedKey) {
    return res.status(401).json({ message: 'API key inválida para integração.' })
  }

  const tenantId = readTenantId(req)
  const tenantApiKeys = parseTenantApiKeys(process.env.INTEGRATION_API_KEYS)

  if (tenantApiKeys.size > 0) {
    if (!tenantId) {
      return res.status(400).json({ message: 'Informe tenantId (header X-Tenant-Id, query ou body).' })
    }
    const expectedKey = tenantApiKeys.get(tenantId)
    if (!expectedKey || expectedKey !== providedKey) {
      return res.status(401).json({ message: 'API key inválida para o tenant informado.' })
    }
    req.integrationTenantId = tenantId
    return next()
  }

  const singleKey = String(process.env.INTEGRATION_API_KEY ?? '').trim()
  const singleTenantId = String(process.env.INTEGRATION_TENANT_ID ?? '').trim()
  if (!singleKey || !singleTenantId) {
    return res.status(503).json({
      message:
        'Integração externa indisponível: configure INTEGRATION_API_KEYS ou (INTEGRATION_API_KEY + INTEGRATION_TENANT_ID).',
    })
  }
  if (providedKey !== singleKey) {
    return res.status(401).json({ message: 'API key inválida para integração.' })
  }
  if (tenantId && tenantId !== singleTenantId) {
    return res.status(403).json({ message: 'tenantId não permitido para esta API key.' })
  }
  req.integrationTenantId = singleTenantId
  return next()
}
