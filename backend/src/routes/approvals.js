import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { approvalCreateSchema, approvalRespondSchema } from '../schemas/index.js'
import {
  createApproval,
  listApprovalsForTenant,
  listApprovalsByRequester,
  respondToApproval,
} from '../services/approvalService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  authorize(['ADM', 'GESTOR']),
  asyncHandler(async (req, res) => {
    const rows = await listApprovalsForTenant(req.user.tenantId)
    res.json(rows)
  }),
)

router.get(
  '/mine',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const rows = await listApprovalsByRequester(req.user.tenantId, req.user.sub)
    res.json(rows)
  }),
)

router.post(
  '/',
  authMiddleware,
  authorize(['ADM', 'GESTOR', 'TECNICO']),
  asyncHandler(async (req, res) => {
    const parsed = approvalCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await createApproval(req.user.tenantId, req.user, parsed.data)
    res.status(201).json(row)
  }),
)

router.post(
  '/:id/respond',
  authMiddleware,
  authorize(['ADM', 'GESTOR']),
  asyncHandler(async (req, res) => {
    const parsed = approvalRespondSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await respondToApproval(
      req.user.tenantId,
      req.user,
      req.params.id,
      parsed.data.decision,
      parsed.data.notes,
    )
    res.json(row)
  }),
)

export default router
