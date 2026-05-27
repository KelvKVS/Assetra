import path from 'node:path'

/**
 * Persiste apenas metadados + URL curta; URLs públicas com token são geradas no toDto/enrich.
 */
export function sanitizeAttachmentsForDb(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 6)
    .map((att) => {
      let filename = String(att?.filename ?? '').trim()
      if (!filename && att?.url) {
        const segment = String(att.url).split('?')[0].split('/').filter(Boolean).pop() ?? ''
        try {
          filename = decodeURIComponent(segment)
        } catch {
          filename = segment
        }
      }
      filename = path.basename(filename)
      if (!filename) return null

      let size
      if (att?.size != null && att.size !== '') {
        const n = Number(att.size)
        if (Number.isFinite(n) && n >= 0) size = n
      }

      return {
        filename,
        originalName: att.originalName ? String(att.originalName).slice(0, 200) : undefined,
        mimetype: att.mimetype ? String(att.mimetype).slice(0, 120) : undefined,
        ...(size !== undefined ? { size } : {}),
        url: `/api/uploads/${filename}`,
      }
    })
    .filter(Boolean)
}
