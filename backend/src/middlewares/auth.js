import jwt from 'jsonwebtoken'

function readAuthToken(req) {
  const authHeader = req.headers?.authorization
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined
  return req.cookies?.token || bearerToken
}

export const authMiddleware = (req, res, next) => {
  const token = readAuthToken(req)
  if (!token) {
    return res.status(401).json({ message: 'Não autenticado.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload?.type && payload.type !== 'session') {
      return res.status(401).json({ message: 'Sessão inválida.' })
    }
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' })
  }
}

/** Para bootstrap de sessão: sem token ou token inválido → req.user = null (sem 401). */
export const optionalAuthMiddleware = (req, res, next) => {
  const token = readAuthToken(req)
  if (!token) {
    req.user = null
    return next()
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    req.user = null
  }
  return next()
}

export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = String(req.user?.role ?? '')
      .trim()
      .toUpperCase()
    const normalizedAllowedRoles = (allowedRoles ?? []).map((role) =>
      String(role ?? '')
        .trim()
        .toUpperCase(),
    )
    if (!req.user || !userRole || !normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Acesso negado: permissão insuficiente.' })
    }
    next()
  }
}
