import { defineStore } from 'pinia'

export type AssetStatus = 'Em uso' | 'Disponível' | 'Em manutenção'
export type MaintenanceType = 'Corretiva' | 'Preventiva'
export type MaintenancePriority = 'Alta' | 'Média' | 'Baixa'
export type MaintenanceStatus = 'Aberta' | 'Em andamento' | 'Agendada' | 'Concluída'
export type Profile = 'ADM' | 'GESTOR' | 'TECNICO'
export type UserStatus = 'Ativo' | 'Inativo'

export type Asset = {
  tag: string
  description: string
  sector: string
  status: AssetStatus
}

export type Movement = {
  id: number
  date: string
  assetTag: string
  origin: string
  destination: string
  responsible: string
}

export type Maintenance = {
  id: number
  assetTag: string
  type: MaintenanceType
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

const STORAGE_KEY = 'assetra-mock-data-v1'

type MockState = {
  assets: Asset[]
  movements: Movement[]
  maintenances: Maintenance[]
  users: User[]
  hydrated: boolean
}

const defaultState = (): Omit<MockState, 'hydrated'> => ({
  assets: [
    { tag: 'AST-001', description: 'Notebook Dell Latitude 5420', sector: 'Financeiro', status: 'Em uso' },
    { tag: 'AST-002', description: 'Desktop Lenovo M75q', sector: 'RH', status: 'Disponível' },
    { tag: 'AST-003', description: 'Monitor LG 24"', sector: 'Compras', status: 'Em manutenção' },
  ],
  movements: [
    { id: 1, date: '08/04/2026', assetTag: 'AST-001', origin: 'Estoque', destination: 'Financeiro', responsible: 'João Melo' },
    { id: 2, date: '02/04/2026', assetTag: 'AST-017', origin: 'Compras', destination: 'TI', responsible: 'Lara Costa' },
    { id: 3, date: '30/03/2026', assetTag: 'AST-010', origin: 'RH', destination: 'Estoque', responsible: 'Kelvin Siqueira' },
  ],
  maintenances: [
    {
      id: 1,
      assetTag: 'AST-003',
      type: 'Corretiva',
      openingDate: '10/04/2026',
      priority: 'Alta',
      status: 'Em andamento',
      description: 'Falha intermitente de vídeo durante o uso',
    },
    {
      id: 2,
      assetTag: 'AST-025',
      type: 'Preventiva',
      openingDate: '05/04/2026',
      priority: 'Média',
      status: 'Agendada',
      description: 'Rotina de verificação e limpeza programada',
    },
    {
      id: 3,
      assetTag: 'AST-007',
      type: 'Corretiva',
      openingDate: '28/03/2026',
      priority: 'Baixa',
      status: 'Concluída',
      description: 'Substituição de teclado após desgaste',
    },
  ],
  users: [
    { name: 'Kelvin Siqueira', email: 'admin@assetra.local', profile: 'ADM', status: 'Ativo' },
    { name: 'Ana Cordeiro', email: 'ana.cordeiro@assetra.local', profile: 'GESTOR', status: 'Ativo' },
    { name: 'João Melo', email: 'joao.melo@assetra.local', profile: 'TECNICO', status: 'Ativo' },
  ],
})

export const useMockDataStore = defineStore('mock-data', {
  state: (): MockState => ({
    ...defaultState(),
    hydrated: false,
  }),
  actions: {
    hydrate() {
      if (this.hydrated) return

      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Omit<MockState, 'hydrated'>
          this.assets = parsed.assets ?? this.assets
          this.movements = parsed.movements ?? this.movements
          this.maintenances = parsed.maintenances ?? this.maintenances
          this.users = parsed.users ?? this.users
        } catch {
          const fallback = defaultState()
          this.assets = fallback.assets
          this.movements = fallback.movements
          this.maintenances = fallback.maintenances
          this.users = fallback.users
        }
      }

      this.hydrated = true
    },
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          assets: this.assets,
          movements: this.movements,
          maintenances: this.maintenances,
          users: this.users,
        }),
      )
    },
    addAsset(asset: Asset) {
      const exists = this.assets.some((item) => item.tag.toLowerCase() === asset.tag.toLowerCase())
      if (exists) return false
      this.assets.unshift(asset)
      this.persist()
      return true
    },
    updateAsset(originalTag: string, asset: Asset) {
      const exists = this.assets.some(
        (item) => item.tag.toLowerCase() === asset.tag.toLowerCase() && item.tag.toLowerCase() !== originalTag.toLowerCase(),
      )
      if (exists) return false
      this.assets = this.assets.map((item) => (item.tag === originalTag ? asset : item))
      this.persist()
      return true
    },
    addMovement(movement: Omit<Movement, 'id' | 'date'>) {
      this.movements.unshift({
        id: this.movements.length + 1,
        date: new Date().toLocaleDateString('pt-BR'),
        ...movement,
      })
      this.persist()
    },
    updateMovement(id: number, movement: Omit<Movement, 'id'>) {
      this.movements = this.movements.map((item) => (item.id === id ? { id, ...movement } : item))
      this.persist()
    },
    addMaintenance(maintenance: Omit<Maintenance, 'id'>) {
      this.maintenances.unshift({
        id: this.maintenances.length + 1,
        ...maintenance,
      })
      this.persist()
    },
    updateMaintenance(id: number, maintenance: Omit<Maintenance, 'id'>) {
      this.maintenances = this.maintenances.map((item) => (item.id === id ? { id, ...maintenance } : item))
      this.persist()
    },
    addUser(user: User) {
      const exists = this.users.some((item) => item.email.toLowerCase() === user.email.toLowerCase())
      if (exists) return false
      this.users.unshift(user)
      this.persist()
      return true
    },
    updateUser(originalEmail: string, user: User) {
      const exists = this.users.some(
        (item) =>
          item.email.toLowerCase() === user.email.toLowerCase() && item.email.toLowerCase() !== originalEmail.toLowerCase(),
      )
      if (exists) return false
      this.users = this.users.map((item) => (item.email === originalEmail ? user : item))
      this.persist()
      return true
    },
    removeAsset(tag: string) {
      this.assets = this.assets.filter((item) => item.tag !== tag)
      this.persist()
    },
    removeMovement(id: number) {
      this.movements = this.movements.filter((item) => item.id !== id)
      this.persist()
    },
    removeMaintenance(id: number) {
      this.maintenances = this.maintenances.filter((item) => item.id !== id)
      this.persist()
    },
    removeUser(email: string) {
      this.users = this.users.filter((item) => item.email !== email)
      this.persist()
    },
    resetAllData() {
      const fallback = defaultState()
      this.assets = fallback.assets
      this.movements = fallback.movements
      this.maintenances = fallback.maintenances
      this.users = fallback.users
      this.persist()
    },
  },
})
