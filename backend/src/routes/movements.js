import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { movementCreateSchema } from '../schemas/index.js'
import { listMovementsForTenant, registerMovement } from '../services/movementService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const movements = await listMovementsForTenant(req.user.tenantId)
    res.json(movements)
  }),
)

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const parsed = movementCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const asset = await registerMovement(req.user.tenantId, req.user.sub, parsed.data)
    res.status(201).json(asset)
  }),
)

export default router
