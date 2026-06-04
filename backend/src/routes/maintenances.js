import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  extensionRequestCreateSchema,
  extensionRequestDecideSchema,
  maintenanceCreateSchema,
  maintenanceUpdateSchema,
  validationDueSchema,
} from '../schemas/index.js'
import { parseListQuery, sendListResponse } from '../utils/pagination.js'
import {
  createMaintenance,
  decideMaintenanceExtension,
  deleteMaintenance,
  listMaintenancesForTenant,
  requestMaintenanceExtension,
  setMaintenanceValidationDue,
  updateMaintenance,
} from '../services/maintenanceService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const listQuery = parseListQuery(req.query)
    const result = await listMaintenancesForTenant(req.user.tenantId, listQuery)
    sendListResponse(res, result)
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
    const row = await createMaintenance(req.user.tenantId, req.user.sub, parsed.data, req.user)
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
    const row = await updateMaintenance(req.user.tenantId, req.params.id, parsed.data, req.user)
    res.json(row)
  }),
)

router.delete(
  '/:id',
  authMiddleware,
  authorize(['ADM', 'GESTOR', 'TECNICO']),
  asyncHandler(async (req, res) => {
    await deleteMaintenance(req.user.tenantId, req.params.id, req.user)
    res.status(204).send()
  }),
)

router.patch(
  '/:id/validation-due',
  authMiddleware,
  authorize(['ADM', 'GESTOR']),
  asyncHandler(async (req, res) => {
    const parsed = validationDueSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await setMaintenanceValidationDue(
      req.user.tenantId,
      req.params.id,
      parsed.data.validationDueAt,
      req.user,
    )
    res.json(row)
  }),
)

router.post(
  '/:id/extension-requests',
  authMiddleware,
  authorize(['TECNICO', 'ADM']),
  asyncHandler(async (req, res) => {
    const parsed = extensionRequestCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await requestMaintenanceExtension(
      req.user.tenantId,
      req.user,
      req.params.id,
      parsed.data,
    )
    res.status(201).json(row)
  }),
)

router.patch(
  '/:id/extension-requests/:requestId',
  authMiddleware,
  authorize(['ADM', 'GESTOR']),
  asyncHandler(async (req, res) => {
    const parsed = extensionRequestDecideSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const row = await decideMaintenanceExtension(
      req.user.tenantId,
      req.user,
      req.params.id,
      req.params.requestId,
      parsed.data.decision,
      parsed.data.notes,
    )
    res.json(row)
  }),
)

export default router
