import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { AppError } from '../utils/AppError.js'
import { profileToRole } from '../utils/profileRole.js'
import { isDemoAssetraEmail, normalizeEmail, requiresGoogleVerification } from '../utils/emailPolicy.js'

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 */
export async function listUsersByTenant(prisma, tenantId) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.active ? 'Ativo' : 'Inativo',
  }))
}

function resolveRole(input) {
  if (input.role) return input.role
  if (input.profile) return profileToRole(input.profile)
  throw new AppError(400, 'Informe role ou profile.')
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} email
 */
export async function checkUserEmailInTenant(prisma, tenantId, email) {
  const normalized = normalizeEmail(email)
  if (!normalized) {
    return {
      formatValid: false,
      available: false,
      isDemo: false,
      requiresGoogleImport: false,
      message: 'Informe um e-mail válido.',
    }
  }

  const isDemo = isDemoAssetraEmail(normalized)
  const requiresGoogleImport = requiresGoogleVerification(normalized)

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  if (!emailLooksValid) {
    return {
      formatValid: false,
      available: false,
      isDemo,
      requiresGoogleImport,
      message: 'Formato de e-mail inválido.',
    }
  }

  const existing = await prisma.user.findFirst({
    where: { tenantId, email: normalized },
    select: { id: true, active: true },
  })

  if (existing) {
    return {
      formatValid: true,
      available: false,
      isDemo,
      requiresGoogleImport,
      message: 'Este e-mail já está cadastrado nesta organização.',
    }
  }

  if (isDemo) {
    return {
      formatValid: true,
      available: true,
      isDemo: true,
      requiresGoogleImport: false,
      message: 'Conta de demonstração (@assetra.local). Cadastro manual com senha.',
    }
  }

  return {
    formatValid: true,
    available: true,
    isDemo: false,
    requiresGoogleImport: true,
    message:
      'E-mail disponível. O colaborador fará o primeiro acesso com «Entrar com Google» usando esta conta.',
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {object} input
 */
export async function createUserInTenant(prisma, tenantId, input) {
  const email = normalizeEmail(input.email)
  const isDemo = isDemoAssetraEmail(email)

  if (isDemo) {
    if (!email.endsWith('@assetra.local')) {
      throw new AppError(400, 'Contas de demonstração devem usar o domínio @assetra.local.')
    }
  }

  const availability = await checkUserEmailInTenant(prisma, tenantId, input.email)
  if (!availability.available) {
    throw new AppError(400, availability.message || 'E-mail indisponível.')
  }

  const role = resolveRole(input)
  const active = input.status !== 'Inativo'
  const defaultPassword = isDemo
    ? input.password || 'senha123'
    : input.password || `Google-${randomUUID().slice(0, 12)}`
  if (isDemo && (!input.password || input.password.length < 8)) {
    throw new AppError(400, 'Contas demo exigem senha inicial de pelo menos 8 caracteres.')
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        passwordHash,
        role,
        active,
        tenantId,
      },
    })
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.active ? 'Ativo' : 'Inativo',
      accountType: isDemo ? 'demo' : 'google',
    }
  } catch {
    throw new AppError(400, 'E-mail já existe nesta organização ou dados inválidos.')
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} userId
 * @param {object} input
 */
export async function updateUserInTenant(prisma, tenantId, userId, input) {
  const data = {}
  if (input.name != null) data.name = input.name
  if (input.email != null) data.email = input.email.toLowerCase()
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10)
  if (input.role != null) data.role = input.role
  if (input.profile != null && input.role == null) data.role = profileToRole(input.profile)
  if (input.status != null) data.active = input.status === 'Ativo'

  try {
    const existing = await prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!existing) {
      throw new AppError(404, 'Usuário não encontrado neste tenant.')
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    })
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.active ? 'Ativo' : 'Inativo',
    }
  } catch {
    throw new AppError(400, 'Não foi possível atualizar (e-mail duplicado ou usuário inexistente).')
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} userId
 */
export async function deleteUserInTenant(prisma, tenantId, userId) {
  const result = await prisma.user.deleteMany({
    where: { id: userId, tenantId },
  })
  if (result.count === 0) {
    throw new AppError(404, 'Usuário não encontrado neste tenant.')
  }
}
