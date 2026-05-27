import path from 'node:path'

/**
 * URL relativa servida pelo mesmo origin do frontend (proxy /api no Vite ou rewrite na Vercel).
 * Evita imagens quebradas em localhost:5173 → localhost:3000 cross-origin.
 */
export function buildUploadPublicUrl(filename, fileAccessToken) {
  const safeName = path.basename(String(filename ?? '').trim())
  if (!safeName) return ''
  const ft = fileAccessToken ? `?ft=${encodeURIComponent(fileAccessToken)}` : ''
  return `/api/uploads/${safeName}${ft}`
}

/** Mantido para OAuth Google e redirects externos. */
export function getPublicApiBase(req) {
  const fromEnv = String(process.env.API_PUBLIC_URL ?? process.env.PUBLIC_API_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (fromEnv) return fromEnv

  const proto = req?.protocol === 'https' || req?.get?.('x-forwarded-proto') === 'https' ? 'https' : 'http'
  const host = req?.get?.('host')
  if (host) return `${proto}://${host}`

  return 'http://localhost:3000'
}
