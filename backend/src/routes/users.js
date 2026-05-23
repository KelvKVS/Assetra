import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, authorize } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { userCreateSchema, userUpdateSchema } from '../schemas/index.js'
import {
  checkUserEmailInTenant,
  createUserInTenant,
  deleteUserInTenant,
  listUsersByTenant,
  updateUserInTenant,
} from '../services/userService.js'
import { verifyGoogleIdToken } from '../services/googleTokenService.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  authorize(['ADM', 'GESTOR']),
  asyncHandler(async (req, res) => {
    const users = await listUsersByTenant(prisma, req.user.tenantId)
    res.json(users)
  }),
)

router.get(
  '/check-email',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email : ''
    const result = await checkUserEmailInTenant(prisma, req.user.tenantId, email)
    res.json(result)
  }),
)

router.post(
  '/verify-google',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const credential = typeof req.body?.credential === 'string' ? req.body.credential : ''
    const verified = await verifyGoogleIdToken(credential)
    const availability = await checkUserEmailInTenant(prisma, req.user.tenantId, verified.email)
    res.json({
      name: verified.name,
      email: verified.email,
      emailVerified: true,
      ...availability,
    })
  }),
)

router.post(
  '/',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const parsed = userCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const user = await createUserInTenant(prisma, req.user.tenantId, parsed.data)
    res.status(201).json(user)
  }),
)

router.patch(
  '/:id',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    const parsed = userUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    }
    const user = await updateUserInTenant(prisma, req.user.tenantId, req.params.id, parsed.data)
    res.json(user)
  }),
)

router.delete(
  '/:id',
  authMiddleware,
  authorize(['ADM']),
  asyncHandler(async (req, res) => {
    await deleteUserInTenant(prisma, req.user.tenantId, req.params.id)
    res.status(204).send()
  }),
)

export default router
