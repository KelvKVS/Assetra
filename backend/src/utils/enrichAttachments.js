import { buildUploadPublicUrl } from './publicApiUrl.js'
import { signUploadFileToken } from './uploadFileToken.js'

/**
 * Garante URLs absolutas + token de leitura para <img> em frontend noutro domínio (Vercel).
 */
export function enrichAttachmentUrls(req, attachments, tenantId) {
  if (!Array.isArray(attachments) || !attachments.length) return []
  const tid = String(tenantId ?? '').trim()
  if (!tid) return attachments

  return attachments.map((att) => {
    const filename = String(att?.filename ?? '').trim()
    if (!filename) return att
    const fileToken = signUploadFileToken(filename, tid)
    return {
      ...att,
      url: buildUploadPublicUrl(req, filename, fileToken),
    }
  })
}
