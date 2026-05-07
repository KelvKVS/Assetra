import Approval from '../models/Approval.js'
import { AppError } from '../utils/AppError.js'

function resolveRequiredApproverRole(requestedByRole) {
  if (requestedByRole === 'TECNICO') return 'GESTOR'
  if (requestedByRole === 'GESTOR') return 'ADM'
  return 'ADM'
}

function toDto(doc) {
  const o = doc.toObject ? doc.toObject() : doc
  return {
    id: String(o._id),
    type: o.type,
    assetTag: o.assetTag,
    description: o.description,
    feedback: o.feedback ?? '',
    attachments: Array.isArray(o.attachments) ? o.attachments : [],
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
  const rows = await Approval.find({ tenantId, requiredApproverRole: approverRole }).sort({ createdAt: -1 })
  return rows.map(toDto)
}

export async function listApprovalsByRequester(tenantId, userId) {
  const rows = await Approval.find({ tenantId, requestedBy: userId }).sort({ createdAt: -1 })
  return rows.map(toDto)
}

export async function createApproval(tenantId, user, dto) {
  const requestedByRole = String(user?.role ?? '').toUpperCase()
  if (!['ADM', 'GESTOR', 'TECNICO'].includes(requestedByRole)) {
    throw new AppError(403, 'Perfil sem permissão para solicitar aprovação.')
  }

  const a = new Approval({
    tenantId,
    type: dto.type,
    assetTag: dto.assetTag.trim(),
    description: dto.description.trim(),
    feedback: dto.feedback?.trim() || undefined,
    attachments: Array.isArray(dto.attachments) ? dto.attachments : [],
    requestedBy: user?.sub,
    requestedByName: user?.name,
    requestedByRole,
    requiredApproverRole: resolveRequiredApproverRole(requestedByRole),
    status: 'Pendente',
  })
  await a.save()
  return toDto(a)
}

export async function respondToApproval(tenantId, user, approvalId, decision, notes) {
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
  if (String(a.requiredApproverRole) !== String(user?.role)) {
    throw new AppError(403, 'Esta solicitação deve ser decidida por outro perfil.')
  }
  a.status = decision === 'APPROVED' ? 'Aprovada' : 'Reprovada'
  a.decidedBy = user?.sub
  a.decidedByName = user?.name
  a.decidedAt = new Date()
  a.notes = notes ?? ''
  await a.save()
  return toDto(a)
}
