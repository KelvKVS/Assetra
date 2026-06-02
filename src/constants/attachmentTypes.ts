/** Tipos de anexo aceites — alinhado com backend/src/config/allowedUploadTypes.js */

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

/** Valor do atributo HTML `accept` nos inputs de ficheiro. */
export const UPLOAD_ACCEPT_ATTR = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
].join(',')

export const UPLOAD_TYPES_SHORT_LABEL = 'Imagens · PDF · Word · Excel · CSV'

export function fileExtension(name: string) {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

export function isAllowedUploadFile(file: File) {
  const mime = String(file.type ?? '').toLowerCase().split(';')[0].trim()
  if (ALLOWED_UPLOAD_MIMES.has(mime)) return true
  return ALLOWED_UPLOAD_EXTENSIONS.has(fileExtension(file.name))
}

export function isImageAttachment(mime?: string, filename?: string) {
  const m = String(mime ?? '').toLowerCase()
  if (m.startsWith('image/')) return true
  const ext = fileExtension(filename ?? '')
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)
}

export type AttachmentKind = 'image' | 'pdf' | 'spreadsheet' | 'document' | 'other'

export function attachmentKind(mime?: string, filename?: string): AttachmentKind {
  if (isImageAttachment(mime, filename)) return 'image'
  const m = String(mime ?? '').toLowerCase()
  const ext = fileExtension(filename ?? '')
  if (m === 'application/pdf' || ext === '.pdf') return 'pdf'
  if (
    m.includes('spreadsheet') ||
    m.includes('excel') ||
    ext === '.xls' ||
    ext === '.xlsx' ||
    ext === '.csv'
  ) {
    return 'spreadsheet'
  }
  if (m.includes('word') || ext === '.doc' || ext === '.docx' || ext === '.txt') return 'document'
  return 'other'
}

export function formatAttachmentCount(count: number) {
  if (!count) return 'Sem anexos'
  return count === 1 ? '1 anexo' : `${count} anexos`
}
