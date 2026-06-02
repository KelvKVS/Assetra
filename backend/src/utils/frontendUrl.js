/** URL pública do frontend em produção (Vercel). */
export const PROD_FRONTEND_DEFAULT = 'https://assetra-seven.vercel.app'

function isLocalhostHost(hostname) {
  const h = String(hostname ?? '').toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '::1'
}

function isLocalhostUrl(url) {
  const value = String(url ?? '').trim()
  if (!value) return false
  try {
    return isLocalhostHost(new URL(value).hostname)
  } catch {
    return /localhost|127\.0\.0\.1/i.test(value)
  }
}

function normalizeBaseUrl(url) {
  return String(url ?? '').trim().replace(/\/+$/, '')
}

/**
 * Base do frontend para OAuth e redirects no browser (dev = localhost).
 */
export function getFrontendBaseUrl() {
  const configured = normalizeBaseUrl(process.env.FRONTEND_URL)
  const isProd = process.env.NODE_ENV === 'production'

  if (configured && !(isProd && isLocalhostUrl(configured))) {
    return configured
  }

  if (isProd) {
    return PROD_FRONTEND_DEFAULT
  }

  return configured || 'http://localhost:5173'
}

/**
 * Base para links em e-mails e convites — sempre o site público (Vercel), nunca localhost.
 * Defina EMAIL_FRONTEND_URL no .env se usar outro domínio.
 */
export function getEmailFrontendBaseUrl() {
  const emailOnly = normalizeBaseUrl(
    process.env.EMAIL_FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL,
  )
  if (emailOnly) return emailOnly

  const configured = normalizeBaseUrl(process.env.FRONTEND_URL)
  if (configured && !isLocalhostUrl(configured)) {
    return configured
  }

  return PROD_FRONTEND_DEFAULT
}
