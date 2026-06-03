import axios from 'axios'

const defaultApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'

/** Backend Render em produção (fallback se .env.production não for aplicado). */
const PROD_RENDER_API = 'https://assetra-44la.onrender.com/api'

/** Timeout para uploads grandes (800 MB em ligações lentas). */
const UPLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000

/**
 * Em produção na Vercel, POST /api passa pelo proxy (~4,5 MB).
 * Apenas envio (POST) usa URL direta ao Render. Leitura (<img>) usa /api via mediaUrl.ts.
 */
export function resolveUploadApiBaseUrl(): string {
  const direct = (import.meta.env.VITE_API_UPLOAD_BASE_URL as string | undefined)?.trim()
  if (direct) return direct.replace(/\/+$/, '')

  const apiBase = defaultApiBase.replace(/\/+$/, '')
  if (apiBase.startsWith('http')) return apiBase

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.vercel.app') || host.includes('assetra')) {
      return PROD_RENDER_API
    }
  }

  return apiBase || '/api'
}

let sessionToken = ''

export function setUploadSessionToken(token?: string) {
  sessionToken = token?.trim() || ''
}

const uploadApi = axios.create({
  baseURL: resolveUploadApiBaseUrl(),
  withCredentials: true,
  timeout: UPLOAD_TIMEOUT_MS,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
})

uploadApi.interceptors.request.use((config) => {
  if (sessionToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${sessionToken}`
  }
  return config
})

export default uploadApi
