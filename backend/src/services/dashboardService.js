import Asset from '../models/Asset.js'
import Maintenance from '../models/Maintenance.js'
import Movement from '../models/Movement.js'
import Approval from '../models/Approval.js'
import prisma from '../lib/prisma.js'
import { buildAssetListFilter } from '../utils/assetAccess.js'
import { listMovementsForTenant } from './movementService.js'

const ASSET_STATUS_COLORS = {
  'Em uso': '#3b82f6',
  Disponível: '#22c55e',
  'Em manutenção': '#f59e0b',
}

const MAINT_STATUS_COLORS = {
  Aberta: '#94a3b8',
  'Em andamento': '#3b82f6',
  Concluída: '#22c55e',
}

const APPROVAL_STATUS_COLORS = {
  Pendente: '#f59e0b',
  Aprovada: '#22c55e',
  Reprovada: '#ef4444',
}

function groupCount(docs, field, colorMap = {}) {
  const map = new Map()
  for (const doc of docs) {
    const key = String(doc[field] ?? 'Outro').trim() || 'Outro'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([label, value]) => ({
    label,
    value,
    color: colorMap[label] ?? '#64748b',
  }))
}

function topBars(entries, maxItems = 6, color = '#6366f1') {
  return entries
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems)
    .map((row) => ({ ...row, color, percent: 0 }))
}

async function countActiveUsers(tenantId) {
  return prisma.user.count({ where: { tenantId, active: true } })
}

function todayDecisionsCount(approvals) {
  const today = new Date().toDateString()
  return approvals.filter(
    (a) => a.decidedAt && new Date(a.decidedAt).toDateString() === today,
  ).length
}

function mapMovementPreview(rows) {
  return rows.slice(0, 5).map((m) => ({
    id: m.id,
    assetTag: m.assetTag,
    origin: m.origin,
    destination: m.destination,
    responsible: m.responsible,
    date: m.date,
  }))
}

function mapMaintPreview(rows) {
  return rows
    .filter((m) => m.status !== 'Concluída')
    .slice(0, 6)
    .map((m) => ({
      id: m.id,
      assetTag: m.assetTag,
      type: m.type,
      description: m.description,
      status: m.status,
      priority: m.priority,
    }))
}

function mapApprovalPreview(rows) {
  return rows
    .filter((a) => a.status === 'Pendente')
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      assetTag: a.assetTag,
      type: a.type,
      description: a.description,
      status: a.status,
      requestedByName: a.requestedByName,
    }))
}

/**
 * Resumo agregado para o dashboard (contagens, gráficos e pré-visualizações).
 */
export async function getDashboardSummary(tenantId, user) {
  const role = String(user?.role ?? '').trim().toUpperCase()
  const assetFilter = buildAssetListFilter(tenantId, user)

  const [assets, maintenances, approvals, movements, activeUsers] = await Promise.all([
    Asset.find(assetFilter)
      .select('status sector assignedTo tag')
      .lean(),
    Maintenance.find({ tenantId })
      .select('status type assignedTechnicianEmail assignedTechnicianName assetTag description priority')
      .lean(),
    ['ADM', 'GESTOR'].includes(role)
      ? Approval.find({ tenantId })
          .select('status type assetTag description requestedByName decidedAt createdAt')
          .sort({ createdAt: -1 })
          .lean()
      : Promise.resolve([]),
    ['ADM', 'GESTOR', 'TECNICO'].includes(role)
      ? listMovementsForTenant(tenantId).then((r) => r.items)
      : Promise.resolve([]),
    ['ADM', 'GESTOR'].includes(role) ? countActiveUsers(tenantId) : Promise.resolve(0),
  ])

  const assetSegments = groupCount(assets, 'status', ASSET_STATUS_COLORS)
  const sectorEntries = groupCount(assets, 'sector')
  const sectorBars = topBars(sectorEntries, 6, '#6366f1')
  const maintSegments = groupCount(maintenances, 'status', MAINT_STATUS_COLORS)
  const openMaintenances = maintenances.filter((m) => m.status !== 'Concluída')
  const workloadEntries = groupCount(
    openMaintenances.map((m) => ({
      ...m,
      workloadLabel:
        String(m.assignedTechnicianName || m.assignedTechnicianEmail || '').trim() || 'Não atribuído',
    })),
    'workloadLabel',
  )
  const workloadBars = topBars(workloadEntries, 5, '#14b8a6')

  const approvalSegments = groupCount(approvals, 'status', APPROVAL_STATUS_COLORS)
  const approvalTypeBars = topBars(groupCount(approvals, 'type'), 4, '#3b82f6')
  const pendingApprovals = approvals.filter((a) => a.status === 'Pendente')
  const pendingTypeBars = topBars(groupCount(pendingApprovals, 'type'), 4, '#f59e0b')

  const counts = {
    assets: assets.length,
    openMaintenances: openMaintenances.length,
    maintenances: maintenances.length,
    movements: movements.length,
    activeUsers,
    pendingApprovals: pendingApprovals.length,
    approvals: approvals.length,
    inProgressMaintenances: maintenances.filter((m) => m.status === 'Em andamento').length,
    decisionsToday: todayDecisionsCount(approvals),
  }

  const payload = {
    counts,
    recentMovements: mapMovementPreview(movements),
    ongoingMaintenances: mapMaintPreview(maintenances),
    pendingApprovalsPreview: mapApprovalPreview(approvals),
    charts: {},
  }

  if (['ADM'].includes(role)) {
    payload.charts.admin = {
      assetSegments,
      sectorBars,
      maintSegments,
      workloadBars,
      kpis: {
        assetsTotal: assets.length,
        sectorCount: sectorEntries.length,
        openMaint: openMaintenances.length,
        techCount: workloadBars.length,
        maintenancesTotal: maintenances.length,
      },
    }
  }

  if (['GESTOR', 'ADM'].includes(role)) {
    payload.charts.manager = {
      approvalSegments,
      maintSegments,
      approvalTypeBars,
      pendingTypeBars,
      kpis: {
        pendingCount: pendingApprovals.length,
        approvalsTotal: approvals.length,
        maintInProgress: counts.inProgressMaintenances,
        maintenancesTotal: maintenances.length,
      },
    }
  }

  return payload
}
