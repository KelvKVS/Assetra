import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError.js'

const googleClient = new OAuth2Client()

function buildSessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenant: {
      slug: user.tenant.slug,
      name: user.tenant.name,
    },
  }
}

function signSessionToken(user) {
  const secret = process.env.JWT_SECRET
  if (!secret || String(secret).length < 16) {
    throw new AppError(
      500,
      'Configuração inválida: defina JWT_SECRET com pelo menos 16 caracteres em backend/.env.',
    )
  }
  try {
    return jwt.sign(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        role: String(user.role),
        tenantId: user.tenantId,
        tenantSlug: user.tenant.slug,
      },
      secret,
      { expiresIn: '1h' },
    )
  } catch {
    throw new AppError(500, 'Não foi possível criar a sessão. Verifique JWT_SECRET.')
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ email: string, password: string, tenantSlug?: string }} input
 */
export async function authenticateUser(prisma, input) {
  const email = input.email.trim().toLowerCase()
  const tenantSlug = input.tenantSlug?.trim() || undefined

  let user
  if (tenantSlug) {
    const slug = tenantSlug.toLowerCase()
    const tenant = await prisma.tenant.findFirst({
      where: { slug, active: true },
    })
    if (!tenant) {
      throw new AppError(401, 'Credenciais inválidas.')
    }
    user = await prisma.user.findFirst({
      where: { email, tenantId: tenant.id, active: true },
      include: { tenant: true },
    })
  } else {
    const matches = await prisma.user.findMany({
      where: { email, active: true },
      include: { tenant: true },
    })
    const withActiveTenant = matches.filter((u) => u.tenant?.active)
    if (withActiveTenant.length === 0) {
      user = null
    } else if (withActiveTenant.length === 1) {
      user = withActiveTenant[0]
    } else {
      throw new AppError(
        400,
        'Este e-mail está registado em mais do que uma organização. Indique o slug da organização no login.',
      )
    }
  }

  if (!user || !user.active) {
    throw new AppError(401, 'Credenciais inválidas.')
  }

  if (!user.tenant?.active) {
    throw new AppError(401, 'Credenciais inválidas.')
  }

  if (!user.passwordHash || typeof user.passwordHash !== 'string') {
    throw new AppError(401, 'Credenciais inválidas.')
  }

  let passwordMatch = false
  try {
    passwordMatch = await bcrypt.compare(input.password, user.passwordHash)
  } catch {
    throw new AppError(401, 'Credenciais inválidas.')
  }
  if (!passwordMatch) {
    throw new AppError(401, 'Credenciais inválidas.')
  }

  const token = signSessionToken(user)

  return {
    token,
    user: buildSessionUser(user),
  }
}

/**
 * Login com Google (sem auto-cadastro).
 * - Só autentica se o utilizador já existir e estiver ativo no tenant.
 * - Se email existir em múltiplos tenants e não informar slug => erro 400.
 */
export async function authenticateGoogleUser(prisma, input) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  if (!googleClientId?.trim()) {
    throw new AppError(500, 'Configuração inválida: defina GOOGLE_CLIENT_ID em backend/.env.')
  }

  let payload
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.credential,
      audience: googleClientId,
    })
    payload = ticket.getPayload()
  } catch {
    throw new AppError(401, 'Token Google inválido.')
  }

  const email = String(payload?.email ?? '')
    .trim()
    .toLowerCase()
  const name = String(payload?.name ?? '').trim()
  if (!email || !name) {
    throw new AppError(401, 'Não foi possível obter dados do utilizador Google.')
  }

  const tenantSlug = input.tenantSlug?.trim().toLowerCase() || undefined
  let user

  if (tenantSlug) {
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug, active: true } })
    if (!tenant) {
      throw new AppError(400, 'Organização inválida/inativa. Verifique o slug.')
    }
    user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email, active: true },
      include: { tenant: true },
    })
    if (!user) {
      throw new AppError(
        401,
        'Utilizador Google não cadastrado nesta organização. Peça ao administrador para criar a conta.',
      )
    }
  } else {
    const matches = await prisma.user.findMany({
      where: { email, active: true },
      include: { tenant: true },
    })
    const withActiveTenant = matches.filter((u) => u.tenant?.active)
    if (withActiveTenant.length === 0) {
      throw new AppError(
        401,
        'Utilizador Google não cadastrado. Peça ao administrador para criar a conta.',
      )
    }
    if (withActiveTenant.length > 1) {
      throw new AppError(
        400,
        'Este e-mail Google existe em mais de uma organização. Informe o slug da organização.',
      )
    }
    user = withActiveTenant[0]
  }

  const token = signSessionToken(user)
  return { token, user: buildSessionUser(user) }
}
