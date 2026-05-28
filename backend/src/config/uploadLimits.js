/** Limites de upload (multer) — configurável por env. */
export const MAX_UPLOAD_FILE_BYTES = Math.max(
  1024,
  Number(process.env.MAX_UPLOAD_FILE_BYTES) || 800 * 1024 * 1024,
)

export const MAX_UPLOAD_FILES = Math.max(
  1,
  Math.min(20, Number(process.env.MAX_UPLOAD_FILES) || 6),
)

export function formatUploadLimitLabel(bytes = MAX_UPLOAD_FILE_BYTES) {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    const gb = mb / 1024
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`
  }
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`
}
