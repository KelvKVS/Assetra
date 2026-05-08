import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { integrationApiKeyAuth } from '../middlewares/integrationAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { listMaintenancesForTenant, updateMaintenance } from '../services/maintenanceService.js'
import { listEntityAuditLogs } from '../services/auditService.js'

const router = Router()
const integrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições na API de integração. Aguarde e tente novamente.' },
})

router.use(integrationApiKeyAuth)
router.use(integrationLimiter)

router.get(
  '/v1/maintenances',
  asyncHandler(async (req, res) => {
    const tenantId = String(req.integrationTenantId ?? '').trim()
    if (!tenantId) return res.status(400).json({ message: 'Tenant de integração não resolvido.' })
    const rows = await listMaintenancesForTenant(tenantId)
    res.json({
      version: 'v1',
      protocol: 'REST/JSON',
      data: rows,
    })
  }),
)

router.post(
  '/v1/maintenances/:id/reassign',
  asyncHandler(async (req, res) => {
    const tenantId = String(req.integrationTenantId ?? '').trim()
    const assignedTechnicianEmail = String(req.body?.assignedTechnicianEmail ?? '').trim()
    if (!tenantId || !assignedTechnicianEmail) {
      return res.status(400).json({ message: 'assignedTechnicianEmail é obrigatório.' })
    }
    const row = await updateMaintenance(tenantId, req.params.id, {
      assignedTechnicianEmail,
      status: 'Aberta',
    })
    res.json({
      version: 'v1',
      protocol: 'REST/JSON',
      data: row,
    })
  }),
)

router.get(
  '/v1/audit/:entityType/:entityId',
  asyncHandler(async (req, res) => {
    const tenantId = String(req.integrationTenantId ?? '').trim()
    if (!tenantId) return res.status(400).json({ message: 'Tenant de integração não resolvido.' })
    const rows = await listEntityAuditLogs(tenantId, req.params.entityType, req.params.entityId, req.query.limit)
    res.json({
      version: 'v1',
      protocol: 'REST/JSON',
      data: rows,
    })
  }),
)

export default router
