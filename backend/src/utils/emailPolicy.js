const DEMO_DOMAIN = 'assetra.local'

/** E-mails fictícios do seed / demonstração (login com senha local). */
export function isDemoAssetraEmail(email) {
  const normalized = String(email ?? '')
    .trim()
    .toLowerCase()
  if (!normalized.includes('@')) return false
  const domain = normalized.split('@').pop() ?? ''
  return domain === DEMO_DOMAIN
}

/** Contas finais: e-mail real verificado no Google. */
export function requiresGoogleVerification(email) {
  return !isDemoAssetraEmail(email)
}

export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}
