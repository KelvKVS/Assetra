import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { getDashboardSummary } from '../services/dashboardService.js'

const router = Router()

router.get(
  '/summary',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const summary = await getDashboardSummary(req.user.tenantId, req.user)
    res.json(summary)
  }),
)

export default router
