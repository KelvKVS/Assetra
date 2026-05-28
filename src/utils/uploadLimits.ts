/** Espelha backend/src/config/uploadLimits.js (800 MB por ficheiro, até 6). */
export const MAX_UPLOAD_FILE_BYTES = 800 * 1024 * 1024
export const MAX_UPLOAD_FILES = 6

export function formatUploadBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    const gb = mb / 1024
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`
  }
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`
}

export const UPLOAD_LIMITS_HINT = `Até ${MAX_UPLOAD_FILES} ficheiros · ${formatUploadBytes(MAX_UPLOAD_FILE_BYTES)} cada`

export function validateUploadFiles(
  files: File[],
): { ok: true; files: File[] } | { ok: false; message: string } {
  if (!files.length) return { ok: true, files: [] }
  if (files.length > MAX_UPLOAD_FILES) {
    return { ok: false, message: `Máximo de ${MAX_UPLOAD_FILES} ficheiros por envio.` }
  }
  const limit = formatUploadBytes(MAX_UPLOAD_FILE_BYTES)
  for (const file of files) {
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      return { ok: false, message: `"${file.name}" excede o limite de ${limit}.` }
    }
  }
  return { ok: true, files }
}

/** Junta ficheiros novos aos já escolhidos, respeitando quantidade e tamanho. */
export function mergeUploadFiles(
  existing: File[],
  incoming: FileList | File[],
): { files: File[]; error?: string } {
  const merged = [...existing, ...Array.from(incoming)].slice(0, MAX_UPLOAD_FILES)
  const check = validateUploadFiles(merged)
  if (!check.ok) return { files: existing, error: check.message }
  return { files: check.files }
}
