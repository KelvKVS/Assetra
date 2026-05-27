/**
 * Persiste apenas metadados + URL curta; URLs públicas com token são geradas no toDto/enrich.
 */
export function sanitizeAttachmentsForDb(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 6)
    .map((att) => {
      const filename = String(att?.filename ?? '').trim()
      if (!filename) return null
      return {
        filename,
        originalName: att.originalName ? String(att.originalName).slice(0, 200) : undefined,
        mimetype: att.mimetype ? String(att.mimetype).slice(0, 120) : undefined,
        size: typeof att.size === 'number' && att.size >= 0 ? att.size : undefined,
        url: `/api/uploads/${filename}`,
      }
    })
    .filter(Boolean)
}
