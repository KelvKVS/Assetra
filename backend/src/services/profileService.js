import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { AppError } from '../utils/AppError.js'
import { assertAvatarFilename, serializeSessionUser } from '../utils/userAvatar.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.resolve(__dirname, '../../uploads')

function assertUploadExists(filename) {
  const fullPath = path.join(uploadsDir, filename)
  if (!fs.existsSync(fullPath)) {
    throw new AppError(400, 'Ficheiro de imagem não encontrado. Envie a foto novamente.')
  }
}

/**
 * Apenas o utilizador autenticado pode alterar a própria foto (userId === session sub).
 */
export async function updateMyAvatar(userId, filename) {
  const safe = assertAvatarFilename(filename)
  if (!safe) {
    throw new AppError(400, 'Use uma imagem válida (PNG, JPG, WEBP ou GIF).')
  }
  assertUploadExists(safe)

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarFilename: safe, avatarExternalUrl: null },
    include: { tenant: true },
  })
  return serializeSessionUser(user)
}

export async function removeMyAvatar(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarFilename: null, avatarExternalUrl: null },
    include: { tenant: true },
  })
  return serializeSessionUser(user)
}

/**
 * Cria ou altera a senha de confirmação de ações sensíveis (perfil do utilizador).
 */
export async function updateMyPassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { tenant: true } })
  if (!user || !user.active) {
    throw new AppError(404, 'Utilizador não encontrado.')
  }

  const next = String(newPassword ?? '')
  if (next.length < 8) {
    throw new AppError(400, 'A senha deve ter pelo menos 8 caracteres.')
  }

  if (user.hasConfirmationPassword) {
    const current = String(currentPassword ?? '')
    if (!current) {
      throw new AppError(400, 'Informe a senha atual para alterar.')
    }
    let match = false
    try {
      match = await bcrypt.compare(current, user.passwordHash)
    } catch {
      match = false
    }
    if (!match) {
      throw new AppError(401, 'Senha atual incorreta.')
    }
  }

  const passwordHash = await bcrypt.hash(next, 10)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, hasConfirmationPassword: true },
    include: { tenant: true },
  })
  return serializeSessionUser(updated)
}
