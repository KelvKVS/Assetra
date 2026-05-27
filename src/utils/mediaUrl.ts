import { apiBaseUrl } from '../services/api'
import type { AttachmentRef } from '../types/assetra'

/**
 * Converte `/api/uploads/...` na URL que o browser deve pedir.
 * Em dev: mantém relativo (proxy Vite). Em produção: prefixa VITE_API_BASE_URL se necessário.
 */
export function resolveMediaUrl(url?: string): string {
  if (!url?.trim()) return ''
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const qIdx = trimmed.indexOf('?')
  const pathOnly = qIdx >= 0 ? trimmed.slice(0, qIdx) : trimmed
  const query = qIdx >= 0 ? trimmed.slice(qIdx) : ''

  const base = apiBaseUrl.replace(/\/+$/, '')
  const path = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`

  if (!path.startsWith('/api/')) {
    return `${path}${query}`
  }

  // Dev com proxy: base = "/api" → manter "/api/uploads/..."
  if (base === '/api' || base.endsWith('/api')) {
    if (base.endsWith('/api')) {
      return `${base}${path.slice(4)}${query}`
    }
  }

  // Produção: base = "https://backend.../api"
  if (base.endsWith('/api')) {
    return `${base}${path.slice(4)}${query}`
  }

  return `${base}${path}${query}`
}

export function normalizeAttachment(att: AttachmentRef): AttachmentRef {
  return { ...att, url: resolveMediaUrl(att.url) }
}

export function normalizeAttachments(list?: AttachmentRef[]): AttachmentRef[] | undefined {
  if (!list?.length) return list
  return list.map(normalizeAttachment)
}
