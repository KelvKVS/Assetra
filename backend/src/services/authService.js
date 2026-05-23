import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError.js'
import { verifyGoogleIdToken } from './googleTokenService.js'

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
        type: 'session',
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

function mapTenantChoices(users) {
  return users.map((u) => ({
    slug: u.tenant.slug,
    name: u.tenant.name,
  }))
}

/**
 * Resolve utilizador Google pelo e-mail (sem auto-cadastro).
 */
export async function resolveGoogleLoginUser(prisma, { email, tenantSlug }) {
  const normalizedEmail = String(email ?? '')
    .trim()
    .toLowerCase()
  if (!normalizedEmail) {
    throw new AppError(401, 'Não foi possível obter o e-mail da conta Google.')
  }

  const matches = await prisma.user.findMany({
    where: { email: normalizedEmail, active: true },
    include: { tenant: true },
  })
  const withActiveTenant = matches.filter((u) => u.tenant?.active)

  if (withActiveTenant.length === 0) {
    throw new AppError(
      401,
      'Este e-mail ainda não está cadastrado no Assetra. Peça ao administrador da sua empresa para criar o seu acesso.',
    )
  }

  const slug = tenantSlug?.trim().toLowerCase() || undefined
  let user

  if (withActiveTenant.length === 1) {
    user = withActiveTenant[0]
  } else if (slug) {
    user = withActiveTenant.find((u) => String(u.tenant?.slug ?? '').toLowerCase() === slug)
    if (!user) {
      throw new AppError(400, 'Este e-mail não está cadastrado na organização selecionada.', {
        code: 'TENANT_MISMATCH',
        tenants: mapTenantChoices(withActiveTenant),
      })
    }
  } else {
    throw new AppError(409, 'Selecione a organização da sua conta para continuar.', {
      code: 'MULTIPLE_TENANTS',
      tenants: mapTenantChoices(withActiveTenant),
    })
  }

  const token = signSessionToken(user)
  return { token, user: buildSessionUser(user) }
}

/**
 * Login com Google via credencial GIS (ADM / fluxo legado no browser).
 */
export async function authenticateGoogleUser(prisma, input) {
  const verified = await verifyGoogleIdToken(input.credential)
  return resolveGoogleLoginUser(prisma, {
    email: verified.email,
    tenantSlug: input.tenantSlug,
  })
}
