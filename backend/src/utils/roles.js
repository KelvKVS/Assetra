/** Papéis válidos no tenant (string em Prisma User.role). */
export const ROLES = /** @type {const} */ (['ADM', 'GESTOR', 'TECNICO', 'FUNCIONARIO'])

/** @param {string} role */
export function isValidRole(role) {
  return ROLES.includes(String(role ?? '').trim().toUpperCase())
}
