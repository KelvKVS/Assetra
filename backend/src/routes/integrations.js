import { Router } from 'express'
import { integrationApiKeyAuth } from '../middlewares/integrationAuth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { listMaintenancesForTenant, updateMaintenance } from '../services/maintenanceService.js'
import { listEntityAuditLogs } from '../services/auditService.js'

const router = Router()

router.use(integrationApiKeyAuth)

router.get(
  '/v1/maintenances',
  asyncHandler(async (req, res) => {
    const tenantId = String(req.query.tenantId ?? '').trim()
    if (!tenantId) return res.status(400).json({ message: 'Informe tenantId.' })
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
    const tenantId = String(req.body?.tenantId ?? '').trim()
    const assignedTechnicianEmail = String(req.body?.assignedTechnicianEmail ?? '').trim()
    if (!tenantId || !assignedTechnicianEmail) {
      return res.status(400).json({ message: 'tenantId e assignedTechnicianEmail são obrigatórios.' })
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
    const tenantId = String(req.query.tenantId ?? '').trim()
    if (!tenantId) return res.status(400).json({ message: 'Informe tenantId.' })
    const rows = await listEntityAuditLogs(tenantId, req.params.entityType, req.params.entityId, req.query.limit)
    res.json({
      version: 'v1',
      protocol: 'REST/JSON',
      data: rows,
    })
  }),
)

export default router
