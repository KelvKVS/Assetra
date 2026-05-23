export function isDemoAssetraEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith('@assetra.local')
}

export function requiresGoogleImport(email: string): boolean {
  return !isDemoAssetraEmail(email)
}
