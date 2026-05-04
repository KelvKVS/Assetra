import Approval from '../models/Approval.js'
import { AppError } from '../utils/AppError.js'

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

export async function listApprovalsByRequester(tenantId, userId) {
  const rows = await Approval.find({ tenantId, requestedBy: userId }).sort({ createdAt: -1 })
  return rows.map(toDto)
}

export async function createApproval(tenantId, user, dto) {
  const a = new Approval({
    tenantId,
    type: dto.type,
    assetTag: dto.assetTag.trim(),
    description: dto.description.trim(),
    feedback: dto.feedback?.trim() || undefined,
    attachments: Array.isArray(dto.attachments) ? dto.attachments : [],
    requestedBy: user?.sub,
    requestedByName: user?.name,
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
  a.status = decision === 'APPROVED' ? 'Aprovada' : 'Reprovada'
  a.decidedBy = user?.sub
  a.decidedByName = user?.name
  a.decidedAt = new Date()
  a.notes = notes ?? ''
  await a.save()
  return toDto(a)
}
