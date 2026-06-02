import Approval from '../models/Approval.js'
import Maintenance from '../models/Maintenance.js'

const PHASE_LABELS = {
  abertura: 'Abertura da ordem de serviço',
  validacao: 'Validação de conclusão',
  movimentacao: 'Movimentação de ativo',
}

export function formatRequestCode(approvalId) {
  const id = String(approvalId ?? '').trim()
  if (!id) return ''
  return `REQ-${id.slice(-6).toUpperCase()}`
}

export function formatOsCode(maintenanceId) {
  const id = String(maintenanceId ?? '').trim()
  if (!id) return ''
  return `OS-${id.slice(-8).toUpperCase()}`
}

export function inferApprovalPhase(doc) {
  const stored = String(doc?.approvalPhase ?? '').trim().toLowerCase()
  if (stored && PHASE_LABELS[stored]) return stored

  if (doc?.type === 'Movimentação') return 'movimentacao'
  if (doc?.type === 'Manutenção') {
    if (/validação de execução técnica/i.test(String(doc?.description ?? ''))) {
      return 'validacao'
    }
    return 'abertura'
  }
  return 'abertura'
}

export function isValidationPhase(phase) {
  return phase === 'validacao'
}

export async function findOpeningApprovalForMaintenance(tenantId, maintenanceId) {
  const mid = String(maintenanceId ?? '').trim()
  if (!mid) return null

  let row = await Approval.findOne({
    tenantId,
    maintenanceId: mid,
    type: 'Manutenção',
    approvalPhase: 'abertura',
  }).sort({ createdAt: 1 })

  if (row) return row

  const candidates = await Approval.find({
    tenantId,
    maintenanceId: mid,
    type: 'Manutenção',
  }).sort({ createdAt: 1 })

  return (
    candidates.find(
      (c) =>
        !/validação de execução técnica/i.test(String(c.description ?? '')) &&
        inferApprovalPhase(c) === 'abertura',
    ) ?? candidates[0] ??
    null
  )
}

export async function enrichApprovalsList(rows) {
  if (!rows?.length) return []

  const tenantId = rows[0]?.tenantId
  const maintenanceIds = [
    ...new Set(
      rows
        .map((r) => String(r.maintenanceId ?? '').trim())
        .filter(Boolean),
    ),
  ]

  const maintenances = maintenanceIds.length
    ? await Maintenance.find({ tenantId, _id: { $in: maintenanceIds } }).select('status type assetTag')
    : []
  const maintenanceMap = new Map(maintenances.map((m) => [String(m._id), m]))

  const openingByMaintenance = new Map()
  if (maintenanceIds.length) {
    const related = await Approval.find({
      tenantId,
      maintenanceId: { $in: maintenanceIds },
      type: 'Manutenção',
    }).sort({ createdAt: 1 })

    for (const mid of maintenanceIds) {
      const forMid = related.filter((r) => String(r.maintenanceId) === mid)
      const opening =
        forMid.find((r) => String(r.approvalPhase) === 'abertura') ??
        forMid.find((r) => inferApprovalPhase(r) === 'abertura') ??
        forMid[0]
      if (opening) openingByMaintenance.set(mid, opening)
    }
  }

  return rows.map((doc) => {
    const o = doc.toObject ? doc.toObject() : doc
    const phase = inferApprovalPhase(o)
    const maintenanceId = String(o.maintenanceId ?? '').trim()
    const maintenance = maintenanceId ? maintenanceMap.get(maintenanceId) : null
    const opening = maintenanceId ? openingByMaintenance.get(maintenanceId) : null
    const parentId =
      String(o.parentApprovalId ?? '').trim() ||
      (phase === 'validacao' && opening ? String(opening._id) : '')

    return {
      approvalPhase: phase,
      phaseLabel: PHASE_LABELS[phase] ?? phase,
      requestCode: formatRequestCode(o._id),
      osCode: formatOsCode(maintenanceId),
      maintenanceStatus: maintenance?.status ?? '',
      maintenanceType: maintenance?.type ?? '',
      parentApprovalId: parentId,
      parentRequestCode: parentId ? formatRequestCode(parentId) : '',
      workflowStep: phase === 'validacao' ? 2 : phase === 'abertura' ? 1 : null,
    }
  })
}

export function mergeApprovalDto(baseDto, enrichment) {
  return { ...baseDto, ...enrichment }
}
