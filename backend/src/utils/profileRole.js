/** @typedef {'ADM'|'GESTOR'|'TECNICO'|'FUNCIONARIO'} Role */

const ROLE_TO_PROFILE = {
  ADM: 'Administrador',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
  FUNCIONARIO: 'Funcionário',
}

const PROFILE_TO_ROLE = {
  Administrador: 'ADM',
  Gestor: 'GESTOR',
  Técnico: 'TECNICO',
  Funcionário: 'FUNCIONARIO',
  Funcionario: 'FUNCIONARIO',
}

/** @param {Role} role */
export function roleToProfile(role) {
  return ROLE_TO_PROFILE[role] ?? 'Técnico'
}

/** @param {string} profile — rótulo em PT ou código ADM/GESTOR/TECNICO/FUNCIONARIO */
export function profileToRole(profile) {
  if (profile === 'ADM' || profile === 'GESTOR' || profile === 'TECNICO' || profile === 'FUNCIONARIO') {
    return /** @type {Role} */ (profile)
  }
  return /** @type {Role} */ (PROFILE_TO_ROLE[profile] ?? 'FUNCIONARIO')
}
