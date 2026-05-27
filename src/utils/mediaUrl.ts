import { apiBaseUrl } from '../services/api'
import type { AttachmentRef } from '../types/assetra'

/**
 * Converte `/api/uploads/...` em URL absoluta do backend em produção (Vercel + Render).
 */
export function resolveMediaUrl(url?: string): string {
  if (!url?.trim()) return ''
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const base = apiBaseUrl.replace(/\/+$/, '')
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  if (path.startsWith('/api/')) {
    if (base.endsWith('/api')) {
      return `${base}${path.slice(4)}`
    }
    return `${base}${path}`
  }

  return path
}

export function normalizeAttachment(att: AttachmentRef): AttachmentRef {
  return { ...att, url: resolveMediaUrl(att.url) }
}

export function normalizeAttachments(list?: AttachmentRef[]): AttachmentRef[] | undefined {
  if (!list?.length) return list
  return list.map(normalizeAttachment)
}
