import jwt from 'jsonwebtoken'

const FILE_TOKEN_TYPE = 'upload_file'

export function signUploadFileToken(filename, tenantId) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado.')
  return jwt.sign(
    { type: FILE_TOKEN_TYPE, filename, tenantId },
    secret,
    { expiresIn: '30d' },
  )
}

export function verifyUploadFileToken(token, filename) {
  const secret = process.env.JWT_SECRET
  if (!secret || !token) return null
  try {
    const payload = jwt.verify(token, secret)
    if (payload?.type !== FILE_TOKEN_TYPE) return null
    if (payload.filename !== filename) return null
    return { tenantId: String(payload.tenantId ?? '') }
  } catch {
    return null
  }
}
