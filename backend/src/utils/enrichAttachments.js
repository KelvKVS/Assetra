import path from 'node:path'
import { buildUploadPublicUrl } from './publicApiUrl.js'
import { signUploadFileToken } from './uploadFileToken.js'

function filenameFromStoredAttachment(att) {
  const direct = String(att?.filename ?? '').trim()
  if (direct) return path.basename(direct)

  const rawUrl = String(att?.url ?? '').trim()
  if (!rawUrl) return ''

  const pathOnly = rawUrl.split('?')[0] ?? ''
  const segment = pathOnly.split('/').filter(Boolean).pop() ?? ''
  try {
    return path.basename(decodeURIComponent(segment))
  } catch {
    return path.basename(segment)
  }
}

/**
 * Garante URL relativa + token de leitura (?ft=) para <img> e links.
 * Sempre regenera a URL a partir do filename (evita tokens expirados ou URLs truncadas).
 */
export function enrichAttachmentUrls(_req, attachments, tenantId) {
  if (!Array.isArray(attachments) || !attachments.length) return []
  const tid = String(tenantId ?? '').trim()
  if (!tid) return attachments

  return attachments
    .map((att) => {
      const filename = filenameFromStoredAttachment(att)
      if (!filename) return null
      const fileToken = signUploadFileToken(filename, tid)
      return {
        filename,
        originalName: att?.originalName ? String(att.originalName).slice(0, 200) : undefined,
        mimetype: att?.mimetype ? String(att.mimetype).slice(0, 120) : undefined,
        ...(att?.size != null && att.size !== '' && Number.isFinite(Number(att.size))
          ? { size: Number(att.size) }
          : {}),
        url: buildUploadPublicUrl(filename, fileToken),
      }
    })
    .filter(Boolean)
}
