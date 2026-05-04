import bcrypt from 'bcryptjs'
import { AppError } from '../utils/AppError.js'
import { profileToRole } from '../utils/profileRole.js'

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
 * @param {object} input
 */
export async function createUserInTenant(prisma, tenantId, input) {
  const role = resolveRole(input)
  const active = input.status !== 'Inativo'
  const passwordHash = await bcrypt.hash(input.password || 'Mudar@123', 10)
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role,
        active,
        tenantId,
      },
    })
    return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.active ? 'Ativo' : 'Inativo' }
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
