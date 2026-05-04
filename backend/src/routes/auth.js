import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { loginSchema } from '../schemas/index.js'
import { authenticateUser } from '../services/authService.js'

const router = Router()

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados de login inválidos.' })
    }

    const { token, user } = await authenticateUser(prisma, parsed.data)

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    })

    return res.json({ user })
  }),
)

router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  return res.status(204).send()
})

router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    user: {
      id: req.user.sub,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId,
    },
  })
})

export default router
