import jwt from 'jsonwebtoken'

export const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token
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
