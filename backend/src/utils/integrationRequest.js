import { AppError } from './AppError.js'
import { normalizeAuthConfig, parseJsonObject } from './integrationAuthConfig.js'

export function buildIntegrationUrl(baseUrl, endpointPath) {
  const base = String(baseUrl ?? '').trim().replace(/\/+$/, '')
  const path = String(endpointPath ?? '').trim()
  if (!base) {
    throw new AppError(400, 'Informe a URL base para testar a conexão.')
  }
  if (!path) return base
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export function buildIntegrationHeaders(authType, authConfigRaw, extraHeadersRaw = {}) {
  const authConfig = normalizeAuthConfig(
    typeof authConfigRaw === 'string' ? parseJsonObject(authConfigRaw) : authConfigRaw,
  )
  const extraHeaders = normalizeAuthConfig(
    typeof extraHeadersRaw === 'string' ? parseJsonObject(extraHeadersRaw) : extraHeadersRaw,
  )
  const headers = { Accept: 'application/json', ...extraHeaders }

  if (authType === 'Bearer') {
    const token = String(authConfig.token ?? '').trim()
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (authType === 'ApiKey') {
    const key = String(authConfig.apiKey ?? '').trim()
    const headerName = String(authConfig.apiKeyHeader ?? 'X-API-Key').trim() || 'X-API-Key'
    if (key) headers[headerName] = key
  } else if (authType === 'Basic') {
    const user = String(authConfig.username ?? '').trim()
    const pass = String(authConfig.password ?? '')
    if (user) {
      const encoded = Buffer.from(`${user}:${pass}`).toString('base64')
      headers.Authorization = `Basic ${encoded}`
    }
  } else if (authType === 'OAuth2') {
    const token = String(authConfig.accessToken ?? authConfig.token ?? '').trim()
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (authType === 'Custom') {
    const token = String(authConfig.token ?? '').trim()
    const headerName = String(authConfig.headerName ?? 'Authorization').trim() || 'Authorization'
    const prefix = String(authConfig.prefix ?? 'Bearer').trim()
    if (token) headers[headerName] = prefix ? `${prefix} ${token}` : token
  }

  return headers
}

function previewBody(text, max = 600) {
  const raw = String(text ?? '')
  if (raw.length <= max) return raw
  return `${raw.slice(0, max)}…`
}

export async function executeIntegrationTest(payload) {
  const authType = payload.authType ?? 'Bearer'
  const url = buildIntegrationUrl(payload.baseUrl, payload.endpointPath)
  const headers = buildIntegrationHeaders(authType, payload.authConfig, payload.extraHeaders)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    const bodyText = await response.text()
    let parsed = null
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      parsed = null
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
      preview: parsed ?? previewBody(bodyText),
      message: response.ok
        ? 'Conexão bem-sucedida.'
        : `A API respondeu com erro HTTP ${response.status}.`,
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new AppError(408, 'Tempo esgotado ao contactar a API (15s).')
    }
    throw new AppError(502, `Não foi possível contactar a API: ${err?.message ?? 'erro de rede'}`)
  } finally {
    clearTimeout(timeout)
  }
}
