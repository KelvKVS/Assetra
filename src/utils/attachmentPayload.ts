import type { AttachmentRef } from '../types/assetra'

/** Extrai o nome do ficheiro de uma URL de upload (com ou sem ?ft=). */
export function filenameFromUploadUrl(url?: string): string {
  if (!url?.trim()) return ''
  const path = url.trim().split('?')[0] ?? ''
  const segment = path.split('/').filter(Boolean).pop() ?? ''
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** Payload mínimo aceite pela API — evita URLs longas e campos nulos que quebram o Zod em produção. */
export function prepareAttachmentsForApi(list: AttachmentRef[]): AttachmentRef[] {
  return list
    .map((att) => {
      const filename = String(att.filename ?? '').trim() || filenameFromUploadUrl(att.url)
      if (!filename) return null
      const sizeRaw = att.size
      const size =
        sizeRaw != null && sizeRaw !== '' && !Number.isNaN(Number(sizeRaw)) ? Number(sizeRaw) : undefined
      return {
        filename,
        ...(att.originalName ? { originalName: String(att.originalName).slice(0, 200) } : {}),
        ...(att.mimetype ? { mimetype: String(att.mimetype).slice(0, 120) } : {}),
        ...(size !== undefined ? { size } : {}),
        url: `/api/uploads/${filename}`,
      }
    })
    .filter((a): a is AttachmentRef => a != null)
    .slice(0, 6)
}
