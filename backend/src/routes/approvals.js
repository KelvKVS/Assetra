import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { approvalRespondSchema } from '../schemas/index.js'
import { listPendingApprovals, respondToApproval } from '../services/approvalService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const pending = await listPendingApprovals(req.user.tenantId)
    res.json(pending)
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
    await respondToApproval(req.user.tenantId, req.user.sub, req.params.id, parsed.data.decision, parsed.data.notes)
    res.json({ message: 'Decisão registrada com sucesso' })
  }),
)

export default router
