import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { advanceTechnicalTask, listTechnicalTasks } from '../services/taskService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  authorize(['TECNICO', 'ADM']),
  asyncHandler(async (req, res) => {
    const tasks = await listTechnicalTasks(req.user.tenantId, req.user)
    res.json(tasks)
  }),
)

router.post(
  '/:id/advance',
  authMiddleware,
  authorize(['TECNICO', 'ADM']),
  asyncHandler(async (req, res) => {
    const row = await advanceTechnicalTask(req.user.tenantId, req.user, req.params.id)
    res.json(row)
  }),
)

export default router
