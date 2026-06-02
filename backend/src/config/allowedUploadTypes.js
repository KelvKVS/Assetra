import path from 'node:path'

/** MIME explícitos aceites no upload corporativo. */
export const ALLOWED_UPLOAD_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
])

/** Extensões permitidas (fallback quando o browser envia application/octet-stream). */
export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
])

export function isAllowedUploadFile(file) {
  const mime = String(file?.mimetype ?? '').toLowerCase().split(';')[0].trim()
  if (ALLOWED_UPLOAD_MIMES.has(mime)) return true
  const ext = path.extname(String(file?.originalname ?? '')).toLowerCase()
  return ALLOWED_UPLOAD_EXTENSIONS.has(ext)
}

export function allowedUploadTypesLabel() {
  return 'imagens (PNG, JPG, WEBP, GIF), PDF, Word, Excel e CSV'
}
