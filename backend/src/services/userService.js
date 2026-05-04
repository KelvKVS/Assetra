import bcrypt from 'bcryptjs'
import { AppError } from '../utils/AppError.js'

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 */
export async function listUsersByTenant(prisma, tenantId) {
  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, role: true, createdAt: true, tenantId: true },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {{ name: string, email: string, password?: string, role: string }} input
 */
export async function createUserInTenant(prisma, tenantId, input) {
  const passwordHash = await bcrypt.hash(input.password || 'Mudar@123', 10)
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        tenantId,
      },
    })
    return { id: user.id, name: user.name, email: user.email, role: user.role }
  } catch {
    throw new AppError(400, 'E-mail já cadastrado ou dados inválidos.')
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
