import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { movementCreateSchema, movementUpdateSchema } from '../schemas/index.js'
import {
  createMovement,
  deleteMovement,
  listMovementsForTenant,
  updateMovement,
} from '../services/movementService.js'

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
    const row = await createMovement(req.user.tenantId, req.user.sub, parsed.data)
    res.status(201).json(row)
  }),
)

router.patch(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const parsed = movementUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await updateMovement(req.user.tenantId, req.params.id, parsed.data)
    res.json(row)
  }),
)

router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    await deleteMovement(req.user.tenantId, req.params.id)
    res.status(204).send()
  }),
)

export default router
