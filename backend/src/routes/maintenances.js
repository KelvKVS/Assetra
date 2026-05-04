import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { maintenanceOpenSchema } from '../schemas/index.js'
import { listMaintenancesForTenant, openMaintenance } from '../services/maintenanceService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const maintenances = await listMaintenancesForTenant(req.user.tenantId)
    res.json(maintenances)
  }),
)

router.post(
  '/',
  authMiddleware,
  authorize(['ADM', 'GESTOR', 'TECNICO']),
  asyncHandler(async (req, res) => {
    const parsed = maintenanceOpenSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const asset = await openMaintenance(req.user.tenantId, req.user.sub, parsed.data)
    res.status(201).json(asset)
  }),
)

export default router
