import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { buildReportsSummary, buildReportExport, parseReportFiltersFromRequest } from '../services/reportService.js'

const router = Router()

router.get(
  '/summary',
  authMiddleware,
  authorize(['ADM', 'GESTOR']),
  asyncHandler(async (req, res) => {
    const filters = parseReportFiltersFromRequest(req)
    const summary = await buildReportsSummary(req.user.tenantId, filters)
    res.json(summary)
  }),
)

router.get(
  '/export/:type',
  authMiddleware,
  authorize(['ADM', 'GESTOR']),
  asyncHandler(async (req, res) => {
    const filters = parseReportFiltersFromRequest(req)
    const type = String(req.params.type ?? '').trim()
    const data = await buildReportExport(req.user.tenantId, filters, type)
    res.json({
      type,
      filters,
      data,
    })
  }),
)

export default router
