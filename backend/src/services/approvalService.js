import Approval from '../models/Approval.js'
import Maintenance from '../models/Maintenance.js'
import prisma from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { createMaintenance, refreshAssetStatusForTag } from './maintenanceService.js'
import { findAssetByTag } from './assetService.js'
import { parseDestinationFromDescription, registerMovementFromApproval } from './movementService.js'
import { logAudit } from './auditService.js'
import { publishDomainEventSafely } from '../lib/eventBus.js'
import { enrichAttachmentUrls } from '../utils/enrichAttachments.js'
import { sanitizeAttachmentsForDb } from '../utils/sanitizeAttachments.js'

function resolveRequiredApproverRole(requestedByRole) {
  if (requestedByRole === 'FUNCIONARIO' || requestedByRole === 'TECNICO') return 'GESTOR'
  if (requestedByRole === 'GESTOR') return 'ADM'
  return 'ADM'
}

function normalizeRole(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
}

function parsePriorityFromFeedback(feedback) {
  const text = String(feedback ?? '')
  if (/severidade:\s*alta/i.test(text)) return 'Alta'
  if (/severidade:\s*baixa/i.test(text)) return 'Baixa'
  return 'Média'
}

function isExecutionValidationApproval(approval, maintenance) {
  if (!maintenance) return false
  if (/validação de execução técnica/i.test(String(approval.description ?? ''))) return true
  return maintenance.status === 'Em andamento'
}

async function resolveTechnicianEmailForSpawn(tenantId, approval, overrideEmail) {
  const override = String(overrideEmail ?? '')
    .trim()
    .toLowerCase()
  if (override) {
    const tech = await prisma.user.findFirst({
      where: { tenantId, email: override, role: 'TECNICO', active: true },
    })
    if (!tech) {
      throw new AppError(400, 'Técnico selecionado inválido ou inativo.')
    }
    return tech.email.toLowerCase()
  }

  const requesterId = String(approval.requestedBy ?? '').trim()
  if (requesterId) {
    const requester = await prisma.user.findFirst({
      where: { tenantId, id: requesterId },
    })
    if (requester?.role === 'TECNICO' && requester.active) {
      return requester.email.toLowerCase()
    }
  }

  const fallback = await prisma.user.findFirst({
    where: { tenantId, role: 'TECNICO', active: true },
    orderBy: { name: 'asc' },
  })
  if (!fallback) {
    throw new AppError(400, 'Não há técnicos ativos para executar esta manutenção.')
  }
  return fallback.email.toLowerCase()
}

async function applyMaintenanceApprovalEffects(
  tenantId,
  user,
  approval,
  decision,
  assignedTechnicianEmail,
) {
  if (String(approval.type) !== 'Manutenção') return

  const maintenanceId = String(approval.maintenanceId ?? '').trim()
  if (maintenanceId) {
    const maintenance = await Maintenance.findOne({ _id: maintenanceId, tenantId })
    if (!maintenance) return
    if (!isExecutionValidationApproval(approval, maintenance)) return

    maintenance.status = decision === 'APPROVED' ? 'Concluída' : 'Em andamento'
    await maintenance.save()
    await refreshAssetStatusForTag(tenantId, maintenance.assetTag)
    await logAudit({
      tenantId,
      actor: user,
      entityType: 'Maintenance',
      entityId: String(maintenance._id),
      action: 'STATUS_FROM_APPROVAL',
      before: null,
      after: { status: maintenance.status },
      metadata: { approvalId: String(approval._id), decision },
    })
    return
  }

  if (decision !== 'APPROVED') return

  const techEmail = await resolveTechnicianEmailForSpawn(
    tenantId,
    approval,
    assignedTechnicianEmail,
  )
  const details = [approval.description, approval.feedback].filter(Boolean).join('\n\n')
  const created = await createMaintenance(
    tenantId,
    user?.sub,
    {
      assetTag: approval.assetTag,
      type: 'Corretiva',
      description: details.slice(0, 2000),
      priority: parsePriorityFromFeedback(approval.feedback),
      status: 'Aberta',
      assignedTechnicianEmail: techEmail,
      attachments: approval.attachments ?? [],
    },
    user,
  )

  approval.maintenanceId = String(created.id)
  await approval.save()
}

function canUserDecideApproval(requiredRole, userRole) {
  if (!requiredRole || !userRole) return false
  if (userRole === 'ADM') {
    // ADM pode atuar como fallback da cadeia de aprovação.
    return requiredRole === 'ADM' || requiredRole === 'GESTOR'
  }
  return requiredRole === userRole
}

function toDto(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    type: o.type,
    maintenanceId: o.maintenanceId ?? '',
    assetTag: o.assetTag,
    description: o.description,
    feedback: o.feedback ?? '',
    destinationSector: o.destinationSector ?? '',
    attachments: enrichAttachmentUrls(null, o.attachments, o.tenantId),
    status: o.status,
    requestedBy: o.requestedBy ?? '',
    requestedByName: o.requestedByName ?? '',
    requestedByRole: o.requestedByRole ?? '',
    requiredApproverRole: o.requiredApproverRole ?? '',
    decidedBy: o.decidedBy ?? '',
    decidedByName: o.decidedByName ?? '',
    decidedAt: o.decidedAt ?? null,
    notes: o.notes ?? '',
    createdAt: o.createdAt,
  }
}

export async function listApprovalsForTenant(tenantId) {
  const rows = await Approval.find({ tenantId }).sort({ createdAt: -1 })
  return rows.map(toDto)
}

export async function listApprovalsForApprover(tenantId, approverRole) {
  const role = normalizeRole(approverRole)
  const filter =
    role === 'ADM'
      ? { tenantId, requiredApproverRole: { $in: ['ADM', 'GESTOR'] } }
      : { tenantId, requiredApproverRole: role }
  const rows = await Approval.find(filter).sort({ createdAt: -1 })
  return rows.map(toDto)
}

export async function listApprovalsByRequester(tenantId, userId) {
  const rows = await Approval.find({ tenantId, requestedBy: userId }).sort({ createdAt: -1 })
  return rows.map(toDto)
}

export async function createApproval(tenantId, user, dto) {
  const requestedByRole = String(user?.role ?? '').toUpperCase()
  if (!['ADM', 'GESTOR', 'TECNICO', 'FUNCIONARIO'].includes(requestedByRole)) {
    throw new AppError(403, 'Perfil sem permissão para solicitar aprovação.')
  }

  const normalizedType = String(dto.type ?? '').trim()
  const normalizedMaintenanceId = String(dto.maintenanceId ?? '').trim()
  if (normalizedType === 'Movimentação') {
    const dest =
      dto.destinationSector?.trim() || parseDestinationFromDescription(dto.description)
    if (!dest) {
      throw new AppError(400, 'Indique o setor de destino para a movimentação.')
    }
  }
  if (normalizedType === 'Manutenção') {
    const duplicateQuery = normalizedMaintenanceId
      ? { tenantId, type: 'Manutenção', maintenanceId: normalizedMaintenanceId, status: 'Pendente' }
      : {
          tenantId,
          type: 'Manutenção',
          assetTag: String(dto.assetTag ?? '').trim(),
          requestedBy: user?.sub,
          status: 'Pendente',
        }
    const existingPending = await Approval.findOne(duplicateQuery)
    if (existingPending) {
      throw new AppError(409, 'Já existe uma validação pendente para esta ordem. Aguarde a decisão do gestor.')
    }
  }

  const a = new Approval({
    tenantId,
    type: normalizedType,
    maintenanceId: normalizedMaintenanceId,
    assetTag: dto.assetTag.trim(),
    description: dto.description.trim(),
    feedback: dto.feedback?.trim() || undefined,
    destinationSector:
      normalizedType === 'Movimentação' ? dto.destinationSector?.trim() || undefined : undefined,
    attachments: sanitizeAttachmentsForDb(dto.attachments),
    requestedBy: user?.sub,
    requestedByName: user?.name,
    requestedByRole,
    requiredApproverRole: resolveRequiredApproverRole(requestedByRole),
    status: 'Pendente',
  })
  await a.save()
  await logAudit({
    tenantId,
    actor: user,
    entityType: 'Approval',
    entityId: String(a._id),
    action: 'CREATE',
    before: null,
    after: toDto(a),
  })
  await publishDomainEventSafely('approval.created', {
    tenantId,
    approvalId: String(a._id),
    type: a.type,
    status: a.status,
    requiredApproverRole: a.requiredApproverRole,
  }, { service: 'approvalService', action: 'createApproval' })
  return toDto(a)
}

export async function respondToApproval(
  tenantId,
  user,
  approvalId,
  decision,
  notes,
  assignedTechnicianEmail,
) {
  const a = await Approval.findOne({ _id: approvalId, tenantId })
  if (!a) {
    throw new AppError(404, 'Solicitação não encontrada.')
  }
  if (a.status !== 'Pendente') {
    throw new AppError(400, 'Esta solicitação já foi respondida.')
  }
  if (String(a.requestedBy ?? '') === String(user?.sub ?? '')) {
    throw new AppError(403, 'Não é permitido aprovar a própria solicitação.')
  }
  const requiredRole = normalizeRole(a.requiredApproverRole)
  const userRole = normalizeRole(user?.role)
  if (!canUserDecideApproval(requiredRole, userRole)) {
    throw new AppError(403, 'Esta solicitação deve ser decidida por outro perfil.')
  }
  const before = toDto(a)
  a.status = decision === 'APPROVED' ? 'Aprovada' : 'Reprovada'
  a.decidedBy = user?.sub
  a.decidedByName = user?.name
  a.decidedAt = new Date()
  a.notes = notes ?? ''
  await a.save()

  if (decision === 'APPROVED' && String(a.type) === 'Movimentação') {
    const destination =
      String(a.destinationSector ?? '').trim() || parseDestinationFromDescription(a.description)
    if (!destination) {
      throw new AppError(
        400,
        'Não foi possível aplicar a movimentação: setor de destino em falta na solicitação.',
      )
    }
    const asset = await findAssetByTag(tenantId, a.assetTag)
    const origin = asset?.sector ?? ''
    await registerMovementFromApproval(tenantId, user?.sub, {
      assetTag: a.assetTag,
      origin,
      destination,
      responsible: a.requestedByName || a.requestedBy || 'Solicitante',
    })
  }

  await applyMaintenanceApprovalEffects(
    tenantId,
    user,
    a,
    decision,
    assignedTechnicianEmail,
  )
  await logAudit({
    tenantId,
    actor: user,
    entityType: 'Approval',
    entityId: String(a._id),
    action: 'DECIDE',
    before,
    after: toDto(a),
    metadata: { decision },
  })
  await publishDomainEventSafely('approval.decided', {
    tenantId,
    approvalId: String(a._id),
    decision,
    status: a.status,
    maintenanceId: a.maintenanceId ?? '',
  }, { service: 'approvalService', action: 'respondToApproval' })
  return toDto(a)
}
