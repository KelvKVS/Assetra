import jwt from 'jsonwebtoken'

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers?.authorization
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined
  const token = req.cookies?.token || bearerToken
  if (!token) {
    return res.status(401).json({ message: 'Não autenticado.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' })
  }
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
