import bcrypt from 'bcryptjs'
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { googleAuthSchema, loginSchema, passwordVerifySchema } from '../schemas/index.js'
import {
  authenticateGoogleUser,
  authenticateUser,
  resolveGoogleLoginUser,
} from '../services/authService.js'
import {
  buildGoogleAuthUrl,
  exchangeGoogleCodeForEmail,
  parseGoogleOAuthState,
  readTenantPickCookie,
  redirectToDashboard,
  redirectToLoginPick,
  redirectWithError,
  signTenantPickCookie,
} from '../services/googleOAuthService.js'
import { AppError } from '../utils/AppError.js'

const router = Router()
const isProd = process.env.NODE_ENV === 'production'

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    // Render (API) + Vercel (frontend) precisam de cookie cross-site em produção.
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000,
  }
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados de login inválidos.' })
    }

    const result = await authenticateUser(prisma, parsed.data)

    res.cookie('token', result.token, getCookieOptions())
    return res.json({ user: result.user, token: result.token })
  }),
)

/** Login Google por redirecionamento (não depende de origens JavaScript no browser). */
router.get(
  '/google/start',
  asyncHandler(async (req, res) => {
    const tenantSlug = typeof req.query.tenantSlug === 'string' ? req.query.tenantSlug : undefined
    const { url } = buildGoogleAuthUrl(tenantSlug)
    return res.redirect(url)
  }),
)

router.get(
  '/google/tenant-choices',
  asyncHandler(async (req, res) => {
    const tenants = readTenantPickCookie(req.cookies?.google_tenant_pick)
    if (!tenants?.length) {
      return res.status(400).json({ message: 'Nenhuma escolha de organização pendente. Entre com Google novamente.' })
    }
    return res.json({ tenants })
  }),
)

router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const oauthError = typeof req.query.error === 'string' ? req.query.error : ''
    if (oauthError) {
      return redirectWithError(res, 'Login Google cancelado ou recusado.')
    }

    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const stateRaw = typeof req.query.state === 'string' ? req.query.state : ''
    if (!code) {
      return redirectWithError(res, 'Código Google ausente. Tente novamente.')
    }

    let statePayload
    try {
      statePayload = parseGoogleOAuthState(stateRaw)
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Estado OAuth inválido.'
      return redirectWithError(res, message)
    }

    try {
      const email = await exchangeGoogleCodeForEmail(code)
      const { token, user } = await resolveGoogleLoginUser(prisma, {
        email,
        tenantSlug: statePayload?.tenantSlug,
      })
      res.clearCookie('google_tenant_pick', getCookieOptions())
      res.cookie('token', token, getCookieOptions())
      return redirectToDashboard(res)
    } catch (err) {
      if (err instanceof AppError && err.details?.code === 'MULTIPLE_TENANTS') {
        const pickToken = signTenantPickCookie(err.details.tenants)
        res.cookie('google_tenant_pick', pickToken, {
          ...getCookieOptions(),
          maxAge: 10 * 60 * 1000,
        })
        return redirectToLoginPick(res)
      }
      const message =
        err instanceof AppError ? err.message : 'Não foi possível concluir o login com Google.'
      return redirectWithError(res, message)
    }
  }),
)

router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const parsed = googleAuthSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Dados de autenticação Google inválidos.' })
    }

    const { token, user } = await authenticateGoogleUser(prisma, parsed.data)
    res.cookie('token', token, getCookieOptions())
    return res.json({ user, token })
  }),
)

router.post('/logout', (_req, res) => {
  res.clearCookie('token', getCookieOptions())
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
  optionalAuthMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      return res.json({ user: null })
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { tenant: true },
    })
    if (!user || !user.active || !user.tenant?.active) {
      res.clearCookie('token', getCookieOptions())
      return res.json({ user: null })
    }
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department ?? null,
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
