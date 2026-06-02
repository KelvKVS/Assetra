import { defineStore } from 'pinia'
import api from '../services/api'
import uploadApi from '../services/uploadApi'
import { validateUploadFiles } from '../utils/uploadLimits'
import type { Asset, AssetStatus, AttachmentRef } from '../types/assetra'
import { mergeAttachments, normalizeAttachments } from '../utils/mediaUrl'
import { useAuthStore } from './auth'
import { useNotificationsStore } from './notifications'

export type AssetWithId = Asset & { id: string }

export type MovementRow = {
  id: string
  date: string
  assetTag: string
  origin: string
  destination: string
  responsible: string
}

export type ExtensionRequestRow = {
  id: string
  requestedBy?: string
  requestedByName?: string
  currentDueAt?: string
  currentDueDisplay?: string
  proposedDueAt?: string
  proposedDueDisplay?: string
  reason?: string
  status: string
  decidedByName?: string
  decidedAt?: string
  notes?: string
  createdAt?: string
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
  validationDueAt?: string
  validationDueDisplay?: string
  lastReturnNotes?: string
  lastReturnedAt?: string
  lastReturnedByName?: string
  extensionRequests?: ExtensionRequestRow[]
  pendingExtension?: ExtensionRequestRow | null
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
  maintenanceId?: string
  approvalPhase?: 'abertura' | 'validacao' | 'movimentacao' | string
  phaseLabel?: string
  requestCode?: string
  osCode?: string
  maintenanceStatus?: string
  maintenanceType?: string
  parentApprovalId?: string
  parentRequestCode?: string
  workflowStep?: number | null
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
  validationDueAt?: string
  validationDueDisplay?: string
  dueUrgency?: 'none' | 'ok' | 'soon' | 'overdue'
  hasPendingExtension?: boolean
  pendingExtension?: {
    id: string
    proposedDueDisplay?: string
    reason?: string
  } | null
  lastReturnNotes?: string
  lastReturnedAt?: string
  lastReturnedByName?: string
}

export type DirectoryUser = {
  id: string
  name: string
  email: string
  role: string
  department?: string | null
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
      const mediaSnapshot = new Map(
        this.assets.map((a) => [String(a.id ?? a.tag), a.attachments] as const),
      )
      const { data } = await api.get<AssetWithId[]>('/assets')
      this.assets = data.map((a) => ({
        ...a,
        status: a.status as AssetStatus,
        attachments: mergeAttachments(mediaSnapshot.get(String(a.id ?? a.tag)), a.attachments),
      }))
    },
    async fetchMovements() {
      const { data } = await api.get<MovementRow[]>('/movements')
      this.movements = data
    },
    async fetchMaintenances() {
      const { data } = await api.get<MaintenanceRow[]>('/maintenances')
      this.maintenances = data.map((m) => ({
        ...m,
        attachments: normalizeAttachments(m.attachments),
      }))
    },
    async fetchUsers() {
      const { data } = await api.get<DirectoryUser[]>('/users')
      this.users = data
    },
    async fetchApprovals() {
      const { data } = await api.get<ApprovalRow[]>('/approvals')
      this.approvals = data.map((item) => ({
        ...item,
        attachments: normalizeAttachments(item.attachments),
      }))
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
    async createAsset(payload: Asset & { attachments?: AttachmentRef[] }) {
      await api.post('/assets', payload)
      await this.fetchAssets()
    },
    async updateAsset(id: string, payload: Partial<Asset> & { tag?: string; attachments?: AttachmentRef[] }) {
      await api.put(`/assets/${id}`, payload)
      await this.fetchAssets()
    },
    async deleteAsset(id: string) {
      await api.delete(`/assets/${id}`)
      await this.fetchAssets()
    },
    async createMovement(payload: Omit<MovementRow, 'id' | 'date'>) {
      const tagKey = payload.assetTag.trim().toLowerCase()
      const mediaSnapshot = new Map(
        this.assets.map((a) => [a.tag.trim().toLowerCase(), a.attachments] as const),
      )
      await api.post('/movements', payload)
      await this.fetchMovements()
      await this.fetchAssets()
      const idx = this.assets.findIndex((a) => a.tag.trim().toLowerCase() === tagKey)
      if (idx < 0) return
      const current = this.assets[idx]
      const prevMedia = mediaSnapshot.get(tagKey)
      this.assets[idx] = {
        ...current,
        sector: payload.destination.trim(),
        assignedTo: payload.responsible.includes('@')
          ? payload.responsible.trim().toLowerCase()
          : current.assignedTo,
        attachments: mergeAttachments(prevMedia, current.attachments) ?? prevMedia,
      }
    },
    async updateMovement(id: string, payload: Partial<Omit<MovementRow, 'id'>>) {
      const tagKey = payload.assetTag?.trim().toLowerCase()
      const mediaSnapshot =
        payload.destination != null
          ? new Map(this.assets.map((a) => [a.tag.trim().toLowerCase(), a.attachments] as const))
          : null
      await api.patch(`/movements/${id}`, payload)
      await this.fetchMovements()
      if (payload.destination == null) return
      await this.fetchAssets()
      if (!tagKey) return
      const idx = this.assets.findIndex((a) => a.tag.trim().toLowerCase() === tagKey)
      if (idx < 0) return
      const current = this.assets[idx]
      const prevMedia = mediaSnapshot?.get(tagKey)
      this.assets[idx] = {
        ...current,
        sector: payload.destination?.trim() ?? current.sector,
        attachments: mergeAttachments(prevMedia, current.attachments) ?? prevMedia,
      }
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
      this.myApprovals = data.map((item) => ({
        ...item,
        attachments: normalizeAttachments(item.attachments),
      }))
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
      const check = validateUploadFiles(files)
      if (!check.ok) throw new Error(check.message)
      const form = new FormData()
      for (const f of check.files) form.append('files', f)
      // Não definir Content-Type manualmente — o browser precisa incluir o boundary do multipart.
      const { data } = await uploadApi.post('/uploads', form)
      return normalizeAttachments((data?.files ?? []) as AttachmentRef[]) ?? []
    },
    async createApproval(payload: {
      type: 'Movimentação' | 'Manutenção'
      maintenanceId?: string
      assetTag: string
      description: string
      destinationSector?: string
      feedback?: string
      attachments?: AttachmentRef[]
    }) {
      await api.post('/approvals', payload)
      const authStore = useAuthStore()
      const canApprove = ['ADM', 'GESTOR'].includes(String(authStore.user?.role ?? '').trim().toUpperCase())
      if (canApprove) {
        await Promise.allSettled([this.fetchApprovalsSafe(), this.fetchMyApprovalsSafe()])
      } else {
        await this.fetchMyApprovalsSafe()
      }
      void useNotificationsStore().fetchNotifications()
    },
    async respondApproval(
      id: string,
      decision: 'APPROVED' | 'REJECTED',
      notes?: string,
      assignedTechnicianEmail?: string,
      validationDueAt?: string,
    ) {
      await api.post(`/approvals/${id}/respond`, {
        decision,
        notes,
        ...(assignedTechnicianEmail?.trim()
          ? { assignedTechnicianEmail: assignedTechnicianEmail.trim().toLowerCase() }
          : {}),
        ...(validationDueAt?.trim() ? { validationDueAt: validationDueAt.trim() } : {}),
      })
      await Promise.all([
        this.fetchApprovals(),
        this.fetchAssets(),
        this.fetchMovements(),
        this.fetchMaintenances(),
        this.fetchTasksSafe(),
      ])
      void useNotificationsStore().fetchNotifications()
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
    async setMaintenanceValidationDue(id: string, validationDueAt: string) {
      await api.patch(`/maintenances/${id}/validation-due`, { validationDueAt })
      await Promise.all([this.fetchMaintenances(), this.fetchTasksSafe()])
    },
    async requestMaintenanceExtension(
      id: string,
      payload: { proposedDueAt: string; reason: string },
    ) {
      await api.post(`/maintenances/${id}/extension-requests`, payload)
      await Promise.all([this.fetchMaintenances(), this.fetchTasksSafe()])
    },
    async decideMaintenanceExtension(
      maintenanceId: string,
      requestId: string,
      decision: 'APPROVED' | 'REJECTED',
      notes?: string,
    ) {
      await api.patch(`/maintenances/${maintenanceId}/extension-requests/${requestId}`, {
        decision,
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
      })
      await Promise.all([this.fetchMaintenances(), this.fetchTasksSafe()])
    },
    async checkUserEmail(email: string) {
      const { data } = await api.get<{
        formatValid: boolean
        available: boolean
        isDemo: boolean
        requiresGoogleImport: boolean
        message: string
      }>('/users/check-email', { params: { email } })
      return data
    },
    async verifyGoogleForUserImport(credential: string) {
      const { data } = await api.post<{
        name: string
        email: string
        emailVerified: boolean
        formatValid: boolean
        available: boolean
        isDemo: boolean
        requiresGoogleImport: boolean
        message: string
      }>('/users/verify-google', { credential })
      return data
    },
    async fetchDepartmentOptions() {
      const { data } = await api.get<{ departments: string[] }>('/users/departments')
      return data.departments ?? []
    },
    async createUser(payload: {
      name: string
      email: string
      profile: string
      status: string
      department?: string | null
      password?: string
      googleCredential?: string
    }) {
      await api.post('/users', {
        name: payload.name,
        email: payload.email,
        profile: payload.profile,
        status: payload.status,
        department: payload.department ?? undefined,
        password: payload.password,
        googleCredential: payload.googleCredential,
      })
      await this.fetchUsers()
    },
    async updateUser(
      id: string,
      payload: Partial<{
        name: string
        email: string
        profile: string
        status: string
        department: string | null
        password: string
      }>,
    ) {
      await api.patch(`/users/${id}`, payload)
      await this.fetchUsers()
    },
    async deleteUser(id: string) {
      await api.delete(`/users/${id}`)
      await this.fetchUsers()
    },
  },
})
