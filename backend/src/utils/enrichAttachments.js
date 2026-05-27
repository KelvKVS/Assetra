import { buildUploadPublicUrl } from './publicApiUrl.js'
import { signUploadFileToken } from './uploadFileToken.js'

/**
 * Garante URL relativa + token de leitura (?ft=) para <img> e links.
 */
export function enrichAttachmentUrls(_req, attachments, tenantId) {
  if (!Array.isArray(attachments) || !attachments.length) return []
  const tid = String(tenantId ?? '').trim()
  if (!tid) return attachments

  return attachments.map((att) => {
    const filename = String(att?.filename ?? '').trim()
    if (!filename) return att
    const fileToken = signUploadFileToken(filename, tid)
    return {
      ...att,
      url: buildUploadPublicUrl(filename, fileToken),
    }
  })
}
