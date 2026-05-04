import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { maintenanceCreateSchema, maintenanceUpdateSchema } from '../schemas/index.js'
import {
  createMaintenance,
  deleteMaintenance,
  listMaintenancesForTenant,
  updateMaintenance,
} from '../services/maintenanceService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const rows = await listMaintenancesForTenant(req.user.tenantId)
    res.json(rows)
  }),
)

router.post(
  '/',
  authMiddleware,
  authorize(['ADM', 'GESTOR', 'TECNICO']),
  asyncHandler(async (req, res) => {
    const parsed = maintenanceCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await createMaintenance(req.user.tenantId, req.user.sub, parsed.data)
    res.status(201).json(row)
  }),
)

router.patch(
  '/:id',
  authMiddleware,
  authorize(['ADM', 'GESTOR', 'TECNICO']),
  asyncHandler(async (req, res) => {
    const parsed = maintenanceUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await updateMaintenance(req.user.tenantId, req.params.id, parsed.data)
    res.json(row)
  }),
)

router.delete(
  '/:id',
  authMiddleware,
  authorize(['ADM', 'GESTOR', 'TECNICO']),
  asyncHandler(async (req, res) => {
    await deleteMaintenance(req.user.tenantId, req.params.id)
    res.status(204).send()
  }),
)

export default router
