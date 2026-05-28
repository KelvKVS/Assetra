import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { listNotificationsForUser } from '../services/notificationService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const rows = await listNotificationsForUser(req.user.tenantId, req.user)
    res.json(rows)
  }),
)

export default router
