/** URL pública do frontend em produção (Vercel). */
const PROD_FRONTEND_DEFAULT = 'https://assetra-seven.vercel.app'

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

/**
 * Base do frontend para links em e-mails, OAuth e notificações.
 * Em produção, ignora FRONTEND_URL se apontar para localhost (evita links errados no deploy).
 */
export function getFrontendBaseUrl() {
  const configured = String(process.env.FRONTEND_URL ?? '').trim().replace(/\/+$/, '')
  const isProd = process.env.NODE_ENV === 'production'

  if (configured && !(isProd && isLocalhostUrl(configured))) {
    return configured
  }

  if (isProd) {
    return PROD_FRONTEND_DEFAULT
  }

  return configured || 'http://localhost:5173'
}
