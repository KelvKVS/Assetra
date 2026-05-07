import { defineStore } from 'pinia'
import api from '../services/api'
import type { Asset, AssetStatus } from '../types/assetra'

export type AssetWithId = Asset & { id: string }

export type MovementRow = {
  id: string
  date: string
  assetTag: string
  origin: string
  destination: string
  responsible: string
}

export type MaintenanceRow = {
  id: string
  assetTag: string
  type: string
  description: string
  priority: string
  status: string
  assignedTechnicianEmail?: string
  assignedTechnicianName?: string
  attachments?: AttachmentRef[]
  openingDate: string
}

export type AttachmentRef = {
  filename: string
  originalName?: string
  mimetype?: string
  size?: number
  url: string
}

export type ApprovalRow = {
  id: string
  type: string
  assetTag: string
  description: string
  feedback?: string
  attachments?: AttachmentRef[]
  status: string
  requestedBy?: string
  requestedByName?: string
  requestedByRole?: string
  requiredApproverRole?: string
  decidedBy?: string
  decidedByName?: string
  decidedAt?: string | null
  notes?: string
  createdAt?: string
}

export type TaskRow = {
  id: string
  assetTag: string
  task: string
  priority: string
  status: string
  assignedTechnicianEmail?: string
  assignedTechnicianName?: string
}

export type DirectoryUser = {
  id: string
  name: string
  email: string
  role: string
  status: string
}

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    assets: [] as AssetWithId[],
    movements: [] as MovementRow[],
    maintenances: [] as MaintenanceRow[],
    users: [] as DirectoryUser[],
    approvals: [] as ApprovalRow[],
    /** Solicitações enviadas pelo utilizador autenticado. */
    myApprovals: [] as ApprovalRow[],
    tasks: [] as TaskRow[],
    error: '',
    loading: false,
  }),
  actions: {
    clearError() {
      this.error = ''
    },
    async fetchAssets() {
      const { data } = await api.get<AssetWithId[]>('/assets')
      this.assets = data.map((a) => ({
        ...a,
        status: a.status as AssetStatus,
      }))
    },
    async fetchMovements() {
      const { data } = await api.get<MovementRow[]>('/movements')
      this.movements = data
    },
    async fetchMaintenances() {
      const { data } = await api.get<MaintenanceRow[]>('/maintenances')
      this.maintenances = data
    },
    async fetchUsers() {
      const { data } = await api.get<DirectoryUser[]>('/users')
      this.users = data
    },
    async fetchApprovals() {
      const { data } = await api.get<ApprovalRow[]>('/approvals')
      this.approvals = data
    },
    async fetchTasks() {
      const { data } = await api.get<TaskRow[]>('/tasks')
      this.tasks = data
    },
    async reloadDashboardData() {
      this.loading = true
      this.error = ''
      const jobs = [
        () => this.fetchAssets(),
        () => this.fetchMovements(),
        () => this.fetchMaintenances(),
        () => this.fetchUsers(),
      ]
      const results = await Promise.allSettled(jobs.map((fn) => fn()))
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length === results.length) {
        this.error = 'Não foi possível carregar os dados do servidor.'
      }
      this.loading = false
    },
    async createAsset(payload: Asset) {
      await api.post('/assets', payload)
      await this.fetchAssets()
    },
    async updateAsset(id: string, payload: Partial<Asset> & { tag?: string }) {
      await api.put(`/assets/${id}`, payload)
      await this.fetchAssets()
    },
    async deleteAsset(id: string) {
      await api.delete(`/assets/${id}`)
      await this.fetchAssets()
    },
    async createMovement(payload: Omit<MovementRow, 'id' | 'date'>) {
      await api.post('/movements', payload)
      await this.fetchMovements()
    },
    async updateMovement(id: string, payload: Partial<Omit<MovementRow, 'id'>>) {
      await api.patch(`/movements/${id}`, payload)
      await this.fetchMovements()
    },
    async deleteMovement(id: string) {
      await api.delete(`/movements/${id}`)
      await this.fetchMovements()
    },
    async createMaintenance(payload: {
      assetTag: string
      type: string
      description?: string
      priority: string
      status: string
      assignedTechnicianEmail?: string
      attachments?: AttachmentRef[]
      openingDate?: string
    }) {
      await api.post('/maintenances', payload)
      await this.fetchMaintenances()
      await this.fetchAssets()
    },
    async updateMaintenance(id: string, payload: Partial<Omit<MaintenanceRow, 'id'>>) {
      await api.patch(`/maintenances/${id}`, payload)
      await this.fetchMaintenances()
      await this.fetchAssets()
    },
    async bulkAssignMaintenances(maintenanceIds: string[], assignedTechnicianEmail: string) {
      const ids = maintenanceIds.filter(Boolean)
      if (!ids.length) return
      await Promise.all(
        ids.map((id) =>
          api.patch(`/maintenances/${id}`, {
            assignedTechnicianEmail,
          }),
        ),
      )
      await this.fetchMaintenances()
      await this.fetchAssets()
    },
    async deleteMaintenance(id: string) {
      await api.delete(`/maintenances/${id}`)
      await this.fetchMaintenances()
      await this.fetchAssets()
    },
    async fetchApprovalsSafe() {
      try {
        await this.fetchApprovals()
      } catch {
        this.approvals = []
      }
    },
    async fetchMyApprovals() {
      const { data } = await api.get<ApprovalRow[]>('/approvals/mine')
      this.myApprovals = data
    },
    async fetchMyApprovalsSafe() {
      try {
        await this.fetchMyApprovals()
      } catch {
        this.myApprovals = []
      }
    },
    async uploadAttachments(files: File[]): Promise<AttachmentRef[]> {
      if (!files.length) return []
      const form = new FormData()
      for (const f of files) form.append('files', f)
      const { data } = await api.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return (data?.files ?? []) as AttachmentRef[]
    },
    async createApproval(payload: {
      type: 'Movimentação' | 'Manutenção'
      assetTag: string
      description: string
      feedback?: string
      attachments?: AttachmentRef[]
    }) {
      await api.post('/approvals', payload)
      await Promise.allSettled([this.fetchApprovalsSafe(), this.fetchMyApprovalsSafe()])
    },
    async respondApproval(id: string, decision: 'APPROVED' | 'REJECTED', notes?: string) {
      await api.post(`/approvals/${id}/respond`, { decision, notes })
      await this.fetchApprovals()
    },
    async fetchTasksSafe() {
      try {
        await this.fetchTasks()
      } catch {
        this.tasks = []
      }
    },
    async advanceTask(id: string) {
      await api.post(`/tasks/${id}/advance`)
      await this.fetchTasks()
      await this.fetchMaintenances()
      await this.fetchAssets()
    },
    async createUser(payload: {
      name: string
      email: string
      profile: string
      status: string
      password?: string
    }) {
      await api.post('/users', {
        name: payload.name,
        email: payload.email,
        profile: payload.profile,
        status: payload.status,
        password: payload.password,
      })
      await this.fetchUsers()
    },
    async updateUser(id: string, payload: Partial<{ name: string; email: string; profile: string; status: string; password: string }>) {
      await api.patch(`/users/${id}`, payload)
      await this.fetchUsers()
    },
    async deleteUser(id: string) {
      await api.delete(`/users/${id}`)
      await this.fetchUsers()
    },
  },
})
