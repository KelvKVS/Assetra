import prisma from '../lib/prisma.js'
import Asset from '../models/Asset.js'
import Maintenance from '../models/Maintenance.js'
import Movement from '../models/Movement.js'

function normalizeFilters(raw = {}) {
  const startDate = String(raw.startDate ?? '').trim()
  const endDate = String(raw.endDate ?? '').trim()
  const sector = String(raw.sector ?? '').trim().toLowerCase()
  return { startDate, endDate, sector }
}

function buildDateRange(field, filters) {
  const where = {}
  if (filters.startDate) {
    where.$gte = new Date(`${filters.startDate}T00:00:00.000Z`)
  }
  if (filters.endDate) {
    where.$lte = new Date(`${filters.endDate}T23:59:59.999Z`)
  }
  if (!Object.keys(where).length) return {}
  return { [field]: where }
}

function applySectorToAssets(assets, sector) {
  if (!sector) return assets
  return assets.filter((asset) => String(asset.sector ?? '').trim().toLowerCase() === sector)
}

function mapAssetSectorByTag(assets) {
  const map = new Map()
  for (const asset of assets) {
    map.set(String(asset.tag ?? '').trim(), String(asset.sector ?? '').trim().toLowerCase())
  }
  return map
}

function toMovementDto(row) {
  return {
    id: String(row._id),
    date: row.occurredAt ? new Date(row.occurredAt).toISOString() : '',
    assetTag: row.assetTag,
    origin: row.origin,
    destination: row.destination,
    responsible: row.responsible,
  }
}

function toMaintenanceDto(row) {
  return {
    id: String(row._id),
    assetTag: row.assetTag,
    type: row.type,
    description: row.description ?? '',
    priority: row.priority,
    status: row.status,
    assignedTechnicianEmail: row.assignedTechnicianEmail ?? '',
    assignedTechnicianName: row.assignedTechnicianName ?? '',
    openingDate: row.openingDate ? new Date(row.openingDate).toISOString() : '',
  }
}

function toAssetDto(row) {
  return {
    id: String(row._id),
    tag: row.tag,
    description: row.description,
    sector: row.sector,
    status: row.status,
    assignedTo: row.assignedTo ?? '',
  }
}

export async function buildReportsSummary(tenantId, rawFilters = {}) {
  const filters = normalizeFilters(rawFilters)
  const assets = await Asset.find({ tenantId }).lean()
  const scopedAssets = applySectorToAssets(assets, filters.sector)
  const scopedAssetTags = new Set(scopedAssets.map((asset) => String(asset.tag ?? '').trim()))

  const movementDateFilter = buildDateRange('occurredAt', filters)
  const maintenanceDateFilter = buildDateRange('openingDate', filters)

  const allMovements = await Movement.find({ tenantId, ...movementDateFilter }).lean()
  const allMaintenances = await Maintenance.find({ tenantId, ...maintenanceDateFilter }).lean()

  const filteredMovements = allMovements.filter((row) => scopedAssetTags.has(String(row.assetTag ?? '').trim()))
  const filteredMaintenances = allMaintenances.filter((row) => scopedAssetTags.has(String(row.assetTag ?? '').trim()))

  const assetsBySectorMap = new Map()
  for (const asset of scopedAssets) {
    const label = String(asset.sector ?? '').trim() || 'Sem setor'
    const current = assetsBySectorMap.get(label) ?? 0
    assetsBySectorMap.set(label, current + 1)
  }
  const assetsBySectorRaw = Array.from(assetsBySectorMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
  const max = assetsBySectorRaw[0]?.value ?? 1
  const assetsBySector = assetsBySectorRaw.map((item) => ({
    ...item,
    percent: Math.round((item.value / max) * 100),
  }))

  const concludedMaintenances = filteredMaintenances.filter((row) => row.status === 'Concluída').length
  const pendingMaintenances = filteredMaintenances.filter((row) => row.status !== 'Concluída').length
  const depreciatedAssets = scopedAssets.filter((row) => row.status === 'Em manutenção').length
  const compliantAssets = scopedAssets.filter((row) => row.status !== 'Em manutenção').length

  return {
    filters,
    sectors: [...new Set(assets.map((asset) => String(asset.sector ?? '').trim()).filter(Boolean))].sort(),
    totals: {
      assets: scopedAssets.length,
      movements: filteredMovements.length,
      maintenances: filteredMaintenances.length,
    },
    kpis: {
      sectorCount: new Set(scopedAssets.map((asset) => String(asset.sector ?? '').trim())).size,
      maintenanceRate: scopedAssets.length ? Number(((filteredMaintenances.length / scopedAssets.length) * 100).toFixed(1)) : 0,
      depreciatedAssets,
      inventoryCompliance: scopedAssets.length ? Math.round((compliantAssets / scopedAssets.length) * 100) : 0,
      concludedMaintenances,
      pendingMaintenances,
    },
    charts: {
      assetsBySector,
      maintenanceStatus: {
        total: filteredMaintenances.length,
        concluded: concludedMaintenances,
        pending: pendingMaintenances,
      },
    },
    exportsPreview: {
      assets: scopedAssets.map(toAssetDto),
      movements: filteredMovements.map(toMovementDto),
      maintenances: filteredMaintenances.map(toMaintenanceDto),
    },
  }
}

export async function buildReportExport(tenantId, rawFilters = {}, type = 'location') {
  const summary = await buildReportsSummary(tenantId, rawFilters)
  if (type === 'location') return summary.exportsPreview.assets
  if (type === 'movements') return summary.exportsPreview.movements
  if (type === 'maintenance-costs') return summary.exportsPreview.maintenances
  if (type === 'users') {
    const users = await prisma.user.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: 'asc' },
    })
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.active ? 'Ativo' : 'Inativo',
    }))
  }
  return []
}

export function parseReportFiltersFromRequest(req) {
  return normalizeFilters({
    startDate: req.query?.startDate,
    endDate: req.query?.endDate,
    sector: req.query?.sector,
  })
}
