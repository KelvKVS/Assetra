const SECRET_KEYS = new Set([
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apiSecret',
  'clientSecret',
  'password',
  'secret',
])

export function parseJsonObject(raw, fallback = {}) {
  if (!raw) return { ...fallback }
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw }
  try {
    const parsed = JSON.parse(String(raw))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    /* ignore */
  }
  return { ...fallback }
}

export function stringifyJsonObject(obj) {
  return JSON.stringify(obj ?? {}, null, 0)
}

export function normalizeAuthConfig(input = {}) {
  const out = {}
  for (const [key, value] of Object.entries(input ?? {})) {
    const k = String(key ?? '').trim()
    if (!k) continue
    if (value == null) continue
    out[k] = typeof value === 'string' ? value.trim() : value
  }
  return out
}

export function mergeAuthConfig(existingRaw, incoming = {}) {
  const existing = parseJsonObject(existingRaw)
  const next = { ...existing }
  for (const [key, value] of Object.entries(normalizeAuthConfig(incoming))) {
    if (SECRET_KEYS.has(key) && value === '') continue
    next[key] = value
  }
  return next
}

function maskSecret(value) {
  const text = String(value ?? '')
  if (!text) return ''
  if (text.length <= 4) return '••••'
  return `${'•'.repeat(Math.min(8, text.length))}${text.slice(-2)}`
}

export function maskAuthConfig(config = {}) {
  const masked = {}
  let hasSecrets = false
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_KEYS.has(key) && String(value ?? '').trim()) {
      hasSecrets = true
      masked[key] = maskSecret(value)
    } else if (String(value ?? '').trim()) {
      masked[key] = value
    }
  }
  return { masked, hasSecrets }
}

export function hasConnectionDetails({ baseUrl, endpointPath, authType, authConfig }) {
  const url = String(baseUrl ?? '').trim()
  const path = String(endpointPath ?? '').trim()
  const cfg = normalizeAuthConfig(authConfig)
  const hasSecret = Object.entries(cfg).some(([key, value]) => {
    if (!String(value ?? '').trim()) return false
    if (authType === 'Custom') return true
    return SECRET_KEYS.has(key) || key === 'username' || key === 'clientId'
  })
  return Boolean(url || path || hasSecret || authType === 'None')
}
