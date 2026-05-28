import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  adminIntegrationCreateSchema,
  adminIntegrationUpdateSchema,
} from '../schemas/index.js'
import {
  createAdminIntegration,
  deleteAdminIntegration,
  listAdminIntegrations,
  updateAdminIntegration,
} from '../services/financeIntegrationService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const rows = await listAdminIntegrations(req.user.tenantId)
    res.json(rows)
  }),
)

router.post(
  '/',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const parsed = adminIntegrationCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await createAdminIntegration(req.user.tenantId, parsed.data)
    res.status(201).json(row)
  }),
)

router.patch(
  '/:id',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const parsed = adminIntegrationUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await updateAdminIntegration(req.user.tenantId, String(req.params.id ?? ''), parsed.data)
    res.json(row)
  }),
)

router.delete(
  '/:id',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    await deleteAdminIntegration(req.user.tenantId, String(req.params.id ?? ''))
    res.status(204).send()
  }),
)

export default router
