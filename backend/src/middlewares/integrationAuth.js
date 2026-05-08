export function integrationApiKeyAuth(req, res, next) {
  const expected = String(process.env.INTEGRATION_API_KEY ?? '').trim()
  if (!expected) {
    return res.status(503).json({ message: 'Integração externa indisponível: INTEGRATION_API_KEY não configurada.' })
  }
  const provided = String(req.headers['x-api-key'] ?? '').trim()
  if (!provided || provided !== expected) {
    return res.status(401).json({ message: 'API key inválida para integração.' })
  }
  next()
}
