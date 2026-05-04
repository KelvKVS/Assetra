/** @typedef {'ADM'|'GESTOR'|'TECNICO'} Role */

const ROLE_TO_PROFILE = {
  ADM: 'Administrador',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
}

const PROFILE_TO_ROLE = {
  Administrador: 'ADM',
  Gestor: 'GESTOR',
  Técnico: 'TECNICO',
}

/** @param {Role} role */
export function roleToProfile(role) {
  return ROLE_TO_PROFILE[role] ?? 'Técnico'
}

/** @param {string} profile — rótulo em PT ou código ADM/GESTOR/TECNICO */
export function profileToRole(profile) {
  if (profile === 'ADM' || profile === 'GESTOR' || profile === 'TECNICO') {
    return /** @type {Role} */ (profile)
  }
  return /** @type {Role} */ (PROFILE_TO_ROLE[profile] ?? 'TECNICO')
}
