import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
