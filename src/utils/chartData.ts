export type ChartSegment = {
  label: string
  value: number
  color: string
}

export type ChartSegmentWithPercent = ChartSegment & { percent: number }

export type BarSeriesItem = {
  label: string
  value: number
  percent: number
  color: string
}

export type TrendPoint = {
  label: string
  value: number
  percent: number
}

export function withPercents(segments: ChartSegment[]): ChartSegmentWithPercent[] {
  const total = segments.reduce((sum, item) => sum + item.value, 0)
  if (!total) {
    return segments.map((item) => ({ ...item, percent: 0 }))
  }
  return segments.map((item) => ({
    ...item,
    percent: Math.round((item.value / total) * 100),
  }))
}

export function conicGradientFromSegments(segments: ChartSegmentWithPercent[]): string {
  const active = segments.filter((item) => item.value > 0 && item.percent > 0)
  if (!active.length) return 'conic-gradient(#334155 0% 100%)'

  let cursor = 0
  const stops = active.map((item) => {
    const start = cursor
    cursor += item.percent
    return `${item.color} ${start}% ${cursor}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export function toBarSeries(
  entries: Array<{ label: string; value: number }>,
  options: { maxItems?: number; color?: string } = {},
): BarSeriesItem[] {
  const maxItems = options.maxItems ?? 6
  const color = options.color ?? '#3b82f6'
  const sorted = [...entries].sort((a, b) => b.value - a.value).slice(0, maxItems)
  const peak = sorted[0]?.value ?? 0
  if (!peak) return []

  return sorted.map((item) => ({
    label: item.label,
    value: item.value,
    percent: Math.round((item.value / peak) * 100),
    color,
  }))
}

export function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyFn(item).trim() || '—'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

export function parsePtDisplayDate(raw?: string | null): Date | null {
  if (!raw) return null
  const text = String(raw).trim()
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) {
    const day = Number(match[1])
    const month = Number(match[2]) - 1
    const year = Number(match[3])
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const iso = new Date(text)
  return Number.isNaN(iso.getTime()) ? null : iso
}

/** Agrupa contagens nos últimos N meses (inclui mês atual). */
export function trendByMonth(
  dates: Array<Date | null>,
  months = 6,
): TrendPoint[] {
  const now = new Date()
  const buckets: { label: string; value: number; start: Date }[] = []

  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = start.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')
    buckets.push({ label, value: 0, start })
  }

  for (const date of dates) {
    if (!date) continue
    const bucket = buckets.find(
      (b) => date.getFullYear() === b.start.getFullYear() && date.getMonth() === b.start.getMonth(),
    )
    if (bucket) bucket.value += 1
  }

  const peak = Math.max(...buckets.map((b) => b.value), 1)
  return buckets.map((b) => ({
    label: b.label,
    value: b.value,
    percent: Math.round((b.value / peak) * 100),
  }))
}
