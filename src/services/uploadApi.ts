import axios from 'axios'

const defaultApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'

/** Timeout para uploads grandes (800 MB em ligações lentas). */
const UPLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000

/**
 * Em produção na Vercel, POST /api passa pelo proxy (~4,5 MB).
 * Defina VITE_API_UPLOAD_BASE_URL com a URL direta do Render, ex.:
 * https://assetra-44la.onrender.com/api
 */
export function resolveUploadApiBaseUrl(): string {
  const direct = (import.meta.env.VITE_API_UPLOAD_BASE_URL as string | undefined)?.trim()
  if (direct) return direct.replace(/\/+$/, '')
  return defaultApiBase
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
