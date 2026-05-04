import { Router } from 'express'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { taskCompleteSchema } from '../schemas/index.js'
import { completeTechnicalTask, listTechnicalTasks } from '../services/taskService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const tasks = await listTechnicalTasks(req.user.tenantId)
    res.json(tasks)
  }),
)

router.post(
  '/:id/complete',
  authMiddleware,
  authorize(['TECNICO', 'ADM']),
  asyncHandler(async (req, res) => {
    const parsed = taskCompleteSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    await completeTechnicalTask(req.user.tenantId, req.user.sub, req.params.id, parsed.data.notes)
    res.json({ message: 'Tarefa concluída e ativo liberado' })
  }),
)

export default router
