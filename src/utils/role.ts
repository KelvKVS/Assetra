import type { Profile } from '../stores/mockData'

const ROLE_MAP: Record<string, Profile> = {
  ADM: 'Administrador',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
}

export function apiRoleToProfile(role: string): Profile {
  return ROLE_MAP[role] ?? 'Técnico'
}
