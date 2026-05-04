import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError.js'

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

  const secret = process.env.JWT_SECRET
  if (!secret || String(secret).length < 16) {
    throw new AppError(500, 'Configuração inválida: defina JWT_SECRET com pelo menos 16 caracteres em backend/.env.')
  }

  let token
  try {
    token = jwt.sign(
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

  return {
    token,
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
  }
}
