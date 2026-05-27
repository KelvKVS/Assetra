/**
 * URL pública da API (ex.: https://assetra-backend.onrender.com).
 * Em produção com frontend noutro domínio, uploads devem devolver URLs absolutas.
 */
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

export function buildUploadPublicUrl(req, filename, fileAccessToken) {
  const base = getPublicApiBase(req)
  const encoded = encodeURIComponent(filename)
  const ft = fileAccessToken ? `?ft=${encodeURIComponent(fileAccessToken)}` : ''
  return `${base}/api/uploads/${encoded}${ft}`
}
