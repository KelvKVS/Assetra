import path from 'node:path'
import { buildUploadPublicUrl } from './publicApiUrl.js'
import { signUploadFileToken } from './uploadFileToken.js'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

export function buildUserAvatarUrl(user) {
  const filename = path.basename(String(user?.avatarFilename ?? '').trim())
  if (filename && user?.tenantId) {
    const token = signUploadFileToken(filename, user.tenantId)
    return buildUploadPublicUrl(filename, token)
  }
  const external = String(user?.avatarExternalUrl ?? '').trim()
  if (/^https?:\/\//i.test(external)) return external
  return null
}

export function assertAvatarFilename(filename) {
  const safe = path.basename(String(filename ?? '').trim())
  if (!safe) {
    return null
  }
  const ext = path.extname(safe).toLowerCase()
  if (!IMAGE_EXT.has(ext)) {
    return null
  }
  return safe
}

export function serializeSessionUser(user) {
  if (!user?.tenant) {
    throw new Error('serializeSessionUser requires tenant relation')
  }
  return {
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
    avatarFilename: user.avatarFilename ?? null,
    avatarExternalUrl: user.avatarExternalUrl ?? null,
    avatarUrl: buildUserAvatarUrl(user),
  }
}
