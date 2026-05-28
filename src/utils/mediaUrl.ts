import { apiBaseUrl } from '../services/api'
import type { AttachmentRef } from '../types/assetra'
import { filenameFromUploadUrl } from './attachmentPayload'

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

  if (base === '/api' || base.endsWith('/api')) {
    if (base.endsWith('/api')) {
      return `${base}${path.slice(4)}${query}`
    }
  }

  if (base.endsWith('/api')) {
    return `${base}${path.slice(4)}${query}`
  }

  return `${base}${path}${query}`
}

export function attachmentMediaKey(att: AttachmentRef): string {
  return String(att.filename ?? '').trim() || filenameFromUploadUrl(att.url)
}

function hasUploadFileToken(url?: string): boolean {
  return /(?:\?|&)ft=/i.test(String(url ?? ''))
}

/** Escolhe a referência com URL mais completa (prioriza token ?ft=). */
export function pickStrongerAttachment(
  a?: AttachmentRef | null,
  b?: AttachmentRef | null,
): AttachmentRef | null {
  const ea = a ? ensureAttachment(a) : null
  const eb = b ? ensureAttachment(b) : null
  if (!ea && !eb) return null
  if (!ea) return eb
  if (!eb) return ea
  const aToken = hasUploadFileToken(ea.url)
  const bToken = hasUploadFileToken(eb.url)
  if (aToken && !bToken) return ea
  if (bToken && !aToken) return eb
  return (ea.url?.length ?? 0) >= (eb.url?.length ?? 0) ? ea : eb
}

/** Garante filename + URL resolvível para exibição. */
export function ensureAttachment(att: AttachmentRef): AttachmentRef | null {
  const filename = attachmentMediaKey(att)
  if (!filename) return null

  const hasUploadPath = String(att.url ?? '').includes('/uploads/')
  const pathUrl = `/api/uploads/${filename}`
  const candidate = hasUploadPath ? String(att.url) : pathUrl
  const url = resolveMediaUrl(candidate)

  if (!url) return null

  return {
    ...att,
    filename,
    url,
  }
}

export function ensureAttachments(list?: AttachmentRef[]): AttachmentRef[] | undefined {
  if (!list?.length) return list
  const normalized = list.map(ensureAttachment).filter((a): a is AttachmentRef => Boolean(a?.url))
  return normalized.length ? normalized : undefined
}

/**
 * Após recarregar ativos (ex.: movimentação), preserva URLs válidas se a API devolver dados incompletos.
 */
export function mergeAttachments(
  previous?: AttachmentRef[],
  incoming?: AttachmentRef[],
): AttachmentRef[] | undefined {
  const next = ensureAttachments(incoming) ?? []
  if (!previous?.length) return next.length ? next : undefined
  if (!next.length) return ensureAttachments(previous)

  const prevByKey = new Map<string, AttachmentRef>()
  for (const att of previous) {
    const key = attachmentMediaKey(att)
    if (key) prevByKey.set(key, att)
  }

  const merged = next.map((att) => {
    const key = attachmentMediaKey(att)
    const prev = key ? prevByKey.get(key) : undefined
    return pickStrongerAttachment(att, prev) ?? att
  })

  const seen = new Set(merged.map(attachmentMediaKey).filter(Boolean))
  for (const att of previous) {
    const key = attachmentMediaKey(att)
    if (key && !seen.has(key)) {
      const safe = ensureAttachment(att)
      if (safe) merged.push(safe)
    }
  }

  const finalized = merged.map((att) => ensureAttachment(att)).filter((a): a is AttachmentRef => Boolean(a?.url))
  return finalized.length ? finalized : ensureAttachments(previous)
}

export function normalizeAttachment(att: AttachmentRef): AttachmentRef {
  return ensureAttachment(att) ?? { ...att, url: '' }
}

export function normalizeAttachments(list?: AttachmentRef[]): AttachmentRef[] | undefined {
  return ensureAttachments(list)
}
