const MAP: Record<string, string> = {
  ADM: 'Administrador',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
}

export function roleLabelPt(role: string | undefined): string {
  if (!role) return 'Usuário'
  return MAP[role] ?? role
}
