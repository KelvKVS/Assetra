/** Tipos partilhados do domínio (API + UI). Sem dados mockados. */

export type AssetStatus = 'Em uso' | 'Disponível' | 'Em manutenção'
export type MaintenanceType = 'Corretiva' | 'Preventiva'
export type MaintenancePriority = 'Alta' | 'Média' | 'Baixa'
export type MaintenanceStatus = 'Aberta' | 'Em andamento' | 'Agendada' | 'Concluída'
export type Profile = 'ADM' | 'GESTOR' | 'TECNICO'
export type UserStatus = 'Ativo' | 'Inativo'

export type Asset = {
  id?: string
  tag: string
  description: string
  sector: string
  status: AssetStatus
  /** E-mail do utilizador (mesmo domínio que o login) a quem o ativo está atribuído. */
  assignedTo?: string | null
}

export type Movement = {
  id: string
  date: string
  assetTag: string
  origin: string
  destination: string
  responsible: string
}

export type Maintenance = {
  id: string
  assetTag: string
  type: MaintenanceType | string
  openingDate: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  description: string
}

export type User = {
  name: string
  email: string
  profile: Profile
  status: UserStatus
}
