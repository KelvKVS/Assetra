import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { userCreateSchema } from '../schemas/index.js'
import { createUserInTenant, deleteUserInTenant, listUsersByTenant } from '../services/userService.js'

const router = Router()

router.use(authMiddleware, authorize(['ADM']))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await listUsersByTenant(prisma, req.user.tenantId)
    res.json(users)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = userCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const user = await createUserInTenant(prisma, req.user.tenantId, parsed.data)
    res.status(201).json(user)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteUserInTenant(prisma, req.user.tenantId, req.params.id)
    res.status(204).send()
  }),
)

export default router
