export const ROLES = ['ADM', 'GESTOR', 'TECNICO', 'FUNCIONARIO'] as const
export type AppRole = (typeof ROLES)[number]

export function isAppRole(value: string | undefined): value is AppRole {
  return ROLES.includes(String(value ?? '').trim().toUpperCase() as AppRole)
}
