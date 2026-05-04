import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError.js'

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ token: string, user: { id: string, name: string, email: string, role: string, tenantId: string } }>}
 */
export async function authenticateUser(prisma, input) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  })

  if (!user) {
    throw new AppError(401, 'Credenciais inválidas.')
  }

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash)
  if (!passwordMatch) {
    throw new AppError(401, 'Credenciais inválidas.')
  }

  const token = jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  )

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
  }
}
