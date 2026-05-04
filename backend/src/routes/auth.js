import bcrypt from 'bcryptjs'
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { loginSchema, passwordVerifySchema } from '../schemas/index.js'
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

router.post(
  '/verify-password',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const parsed = passwordVerifySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Senha não informada.' })
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
    })
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Sessão inválida.' })
    }
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Senha incorreta.' })
    }
    return res.json({ ok: true })
  }),
)

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { tenant: true },
    })
    if (!user || !user.active || !user.tenant?.active) {
      return res.status(401).json({ message: 'Sessão inválida.' })
    }
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenant: {
          slug: user.tenant.slug,
          name: user.tenant.name,
        },
      },
    })
  }),
)

export default router
