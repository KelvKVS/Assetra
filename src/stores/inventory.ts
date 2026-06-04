import { defineStore } from 'pinia'
import api from '../services/api'
import uploadApi from '../services/uploadApi'
import { validateUploadFiles } from '../utils/uploadLimits'
import type { Asset, AssetStatus, AttachmentRef } from '../types/assetra'
import { mergeAttachments, normalizeAttachments } from '../utils/mediaUrl'
import { isListCacheFresh, unwrapList, type PaginatedResponse } from '../utils/listCache'
import { useAuthStore } from './auth'
import { useNotificationsStore } from './notifications'

export type DashboardChartSegment = { label: string; value: number; color: string }
export type DashboardBarItem = { label: string; value: number; color: string; percent?: number }

export type DashboardSummary = {
  counts: {
    assets: number
    openMaintenances: number
    maintenances: number
    movements: number
    activeUsers: number
    pendingApprovals: number
    approvals: number
    inProgressMaintenances: number
    decisionsToday: number
  }
  recentMovements: MovementRow[]
  ongoingMaintenances: Pick<
    MaintenanceRow,
    'id' | 'assetTag' | 'type' | 'description' | 'status' | 'priority'
  >[]
  pendingApprovalsPreview: Pick<
    ApprovalRow,
    'id' | 'assetTag' | 'type' | 'description' | 'status' | 'requestedByName'
  >[]
  charts: {
    admin?: {
      assetSegments: DashboardChartSegment[]
      sectorBars: DashboardBarItem[]
      maintSegments: DashboardChartSegment[]
      workloadBars: DashboardBarItem[]
      kpis: {
        assetsTotal: number
        sectorCount: number
        openMaint: number
        techCount: number
        maintenancesTotal: number
      }
    }
    manager?: {
      approvalSegments: DashboardChartSegment[]
      maintSegments: DashboardChartSegment[]
      approvalTypeBars: DashboardBarItem[]
      pendingTypeBars: DashboardBarItem[]
      kpis: {
        pendingCount: number
        approvalsTotal: number
        maintInProgress: number
        maintenancesTotal: number
      }
    }
  }
}

type ListCacheKey =
  | 'assets'
  | 'movements'
  | 'maintenances'
  | 'users'
  | 'approvals'
  | 'myApprovals'
  | 'tasks'
  | 'dashboard'

export type AssetWithId = Asset & { id: string }

export type MovementRow = {
  id: string
  date: string
  assetTag: string
  origin: string
  destination: string
  fromUserEmail?: string
  toUserEmail?: string
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
  destinationUserEmail?: string
  destinationSector?: string
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
  registrationPending?: boolean
  registrationDisputed?: boolean
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
    dashboard: null as DashboardSummary | null,
    error: '',
    loading: false,
    _cacheAt: {
      assets: 0,
      movements: 0,
      maintenances: 0,
      users: 0,
      approvals: 0,
      myApprovals: 0,
      tasks: 0,
      dashboard: 0,
    },
  }),
  actions: {
    clearError() {
      this.error = ''
    },
    invalidateListCache(keys?: ListCacheKey[]) {
      const all: ListCacheKey[] = keys ?? [
        'assets',
        'movements',
        'maintenances',
        'users',
        'approvals',
        'myApprovals',
        'tasks',
        'dashboard',
      ]
      for (const key of all) {
        this._cacheAt[key] = 0
      }
      if (all.includes('dashboard')) {
        this.dashboard = null
      }
    },
    async fetchDashboardSummary(opts?: { force?: boolean }) {
      if (isListCacheFresh(this._cacheAt.dashboard, opts?.force) && this.dashboard) {
        return this.dashboard
      }
      const { data } = await api.get<DashboardSummary>('/dashboard/summary')
      this.dashboard = data
      this._cacheAt.dashboard = Date.now()
      return data
    },
    async fetchAssets(opts?: { force?: boolean; lite?: boolean }) {
      if (isListCacheFresh(this._cacheAt.assets, opts?.force) && this.assets.length) {
        return
      }
      const mediaSnapshot = new Map(
        this.assets.map((a) => [String(a.id ?? a.tag), a.attachments] as const),
      )
      const params: Record<string, string> = {}
      if (opts?.lite) params.lite = '1'
      const { data } = await api.get<AssetWithId[] | PaginatedResponse<AssetWithId>>('/assets', {
        params,
      })
      const rows = unwrapList(data)
      this.assets = rows.map((a) => ({
        ...a,
        status: a.status as AssetStatus,
        attachments: mergeAttachments(mediaSnapshot.get(String(a.id ?? a.tag)), a.attachments),
      }))
      this._cacheAt.assets = Date.now()
    },
    async fetchMovements(opts?: { force?: boolean }) {
      if (isListCacheFresh(this._cacheAt.movements, opts?.force) && this.movements.length) {
        return
      }
      const { data } = await api.get<MovementRow[] | PaginatedResponse<MovementRow>>('/movements')
      this.movements = unwrapList(data)
      this._cacheAt.movements = Date.now()
    },
    async fetchMaintenances(opts?: { force?: boolean; lite?: boolean }) {
      if (isListCacheFresh(this._cacheAt.maintenances, opts?.force) && this.maintenances.length) {
        return
      }
      const params: Record<string, string> = {}
      if (opts?.lite) params.lite = '1'
      const { data } = await api.get<MaintenanceRow[] | PaginatedResponse<MaintenanceRow>>(
        '/maintenances',
        { params },
      )
      this.maintenances = unwrapList(data).map((m) => ({
        ...m,
        attachments: normalizeAttachments(m.attachments),
      }))
      this._cacheAt.maintenances = Date.now()
    },
    async fetchUsers(opts?: { force?: boolean }) {
      if (isListCacheFresh(this._cacheAt.users, opts?.force) && this.users.length) {
        return
      }
      const auth = useAuthStore()
      const role = String(auth.user?.role ?? '').toUpperCase()
      const path = role === 'ADM' || role === 'GESTOR' ? '/users' : '/users/directory'
      const { data } = await api.get<DirectoryUser[]>(path)
      this.users = data
      this._cacheAt.users = Date.now()
    },
    /** Utilizadores ativos para seleção (movimentação, etc.) — qualquer perfil autenticado. */
    async fetchUsersDirectory() {
      const { data } = await api.get<DirectoryUser[]>('/users/directory')
      this.users = data
    },
    async fetchApprovals(opts?: { force?: boolean }) {
      if (isListCacheFresh(this._cacheAt.approvals, opts?.force) && this.approvals.length) {
        return
      }
      const { data } = await api.get<ApprovalRow[]>('/approvals')
      this.approvals = data.map((item) => ({
        ...item,
        attachments: normalizeAttachments(item.attachments),
      }))
      this._cacheAt.approvals = Date.now()
    },
    async fetchTasks(opts?: { force?: boolean }) {
      if (isListCacheFresh(this._cacheAt.tasks, opts?.force) && this.tasks.length) {
        return
      }
      const { data } = await api.get<TaskRow[]>('/tasks')
      this.tasks = data
      this._cacheAt.tasks = Date.now()
    },
    /** Dashboard ADM/GESTOR/TECNICO: resumo + listas leves (cache 45s). */
    async loadDashboardBundle(opts?: { force?: boolean }) {
      this.loading = true
      this.error = ''
      const force = opts?.force
      const auth = useAuthStore()
      const role = String(auth.user?.role ?? '').trim().toUpperCase()
      const jobs: Promise<unknown>[] = [this.fetchDashboardSummary({ force })]
      if (role !== 'FUNCIONARIO') {
        jobs.push(
          this.fetchAssets({ force, lite: true }),
          this.fetchMaintenances({ force, lite: true }),
        )
      }
      if (['ADM', 'GESTOR', 'TECNICO'].includes(role)) {
        jobs.push(this.fetchMovements({ force }))
      }
      if (['ADM', 'GESTOR'].includes(role)) {
        jobs.push(this.fetchUsers({ force }))
      }
      const results = await Promise.allSettled(jobs)
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length === results.length) {
        this.error = 'Não foi possível carregar os dados do servidor.'
      }
      this.loading = false
    },
    async reloadDashboardData(opts?: { force?: boolean }) {
      await this.loadDashboardBundle(opts)
    },
    async createAsset(payload: Asset & { attachments?: AttachmentRef[] }) {
      await api.post('/assets', payload)
      this.invalidateListCache()
      await this.fetchAssets({ force: true })
    },
    async updateAsset(id: string, payload: Partial<Asset> & { tag?: string; attachments?: AttachmentRef[] }) {
      await api.put(`/assets/${id}`, payload)
      this.invalidateListCache()
      await this.fetchAssets({ force: true })
    },
    async deleteAsset(id: string) {
      await api.delete(`/assets/${id}`)
      this.invalidateListCache()
      await this.fetchAssets({ force: true })
    },
    async createMovement(payload: { assetTag: string; destinationEmail: string }) {
      await api.post('/movements', payload)
      this.invalidateListCache()
      await Promise.all([this.fetchMovements({ force: true }), this.fetchAssets({ force: true })])
    },
    async updateMovement(
      id: string,
      payload: { assetTag?: string; destinationEmail?: string; date?: string },
    ) {
      await api.patch(`/movements/${id}`, payload)
      this.invalidateListCache()
      await this.fetchMovements({ force: true })
      if (payload.destinationEmail != null) {
        await this.fetchAssets({ force: true })
      }
    },
    async deleteMovement(id: string) {
      await api.delete(`/movements/${id}`)
      this.invalidateListCache()
      await this.fetchMovements({ force: true })
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
      this.invalidateListCache()
      await Promise.all([
        this.fetchMaintenances({ force: true }),
        this.fetchAssets({ force: true }),
      ])
    },
    async updateMaintenance(id: string, payload: Partial<Omit<MaintenanceRow, 'id'>>) {
      await api.patch(`/maintenances/${id}`, payload)
      this.invalidateListCache()
      await Promise.all([
        this.fetchMaintenances({ force: true }),
        this.fetchAssets({ force: true }),
      ])
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
      this.invalidateListCache()
      await Promise.all([
        this.fetchMaintenances({ force: true }),
        this.fetchAssets({ force: true }),
      ])
    },
    async deleteMaintenance(id: string) {
      await api.delete(`/maintenances/${id}`)
      this.invalidateListCache()
      await Promise.all([
        this.fetchMaintenances({ force: true }),
        this.fetchAssets({ force: true }),
      ])
    },
    async fetchApprovalsSafe() {
      try {
        await this.fetchApprovals()
      } catch {
        this.approvals = []
      }
    },
    async fetchMyApprovals(opts?: { force?: boolean }) {
      if (isListCacheFresh(this._cacheAt.myApprovals, opts?.force) && this.myApprovals.length) {
        return
      }
      const { data } = await api.get<ApprovalRow[]>('/approvals/mine')
      this.myApprovals = data.map((item) => ({
        ...item,
        attachments: normalizeAttachments(item.attachments),
      }))
      this._cacheAt.myApprovals = Date.now()
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
      destinationUserEmail?: string
      feedback?: string
      attachments?: AttachmentRef[]
    }) {
      await api.post('/approvals', payload)
      this.invalidateListCache(['approvals', 'myApprovals', 'dashboard'])
      const authStore = useAuthStore()
      const canApprove = ['ADM', 'GESTOR'].includes(String(authStore.user?.role ?? '').trim().toUpperCase())
      if (canApprove) {
        await Promise.allSettled([
          this.fetchApprovals({ force: true }),
          this.fetchMyApprovals({ force: true }),
        ])
      } else {
        await this.fetchMyApprovals({ force: true })
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
      this.invalidateListCache()
      await Promise.all([
        this.fetchApprovals({ force: true }),
        this.fetchAssets({ force: true }),
        this.fetchMovements({ force: true }),
        this.fetchMaintenances({ force: true }),
        this.fetchTasks({ force: true }),
      ])
      void useNotificationsStore().fetchNotifications()
    },
    async fetchTasksSafe(opts?: { force?: boolean }) {
      try {
        await this.fetchTasks(opts)
      } catch {
        this.tasks = []
      }
    },
    async advanceTask(id: string) {
      await api.post(`/tasks/${id}/advance`)
      this.invalidateListCache()
      await Promise.all([
        this.fetchTasks({ force: true }),
        this.fetchMaintenances({ force: true }),
        this.fetchAssets({ force: true }),
      ])
    },
    async setMaintenanceValidationDue(id: string, validationDueAt: string) {
      await api.patch(`/maintenances/${id}/validation-due`, { validationDueAt })
      this.invalidateListCache()
      await Promise.all([
        this.fetchMaintenances({ force: true }),
        this.fetchTasks({ force: true }),
      ])
    },
    async requestMaintenanceExtension(
      id: string,
      payload: { proposedDueAt: string; reason: string },
    ) {
      await api.post(`/maintenances/${id}/extension-requests`, payload)
      this.invalidateListCache()
      await Promise.all([
        this.fetchMaintenances({ force: true }),
        this.fetchTasks({ force: true }),
      ])
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
      this.invalidateListCache()
      await Promise.all([
        this.fetchMaintenances({ force: true }),
        this.fetchTasks({ force: true }),
      ])
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
      const { data } = await api.post<{
        registrationEmailSent?: boolean
        emailTestOnly?: boolean
        emailDeliveryMode?: string
        emailHint?: string
        emailError?: string | null
        registrationConfirmUrl?: string
        registrationEmailPreviewUrl?: string | null
      }>('/users', payload, { timeout: 45_000 })
      await this.fetchUsers()
      return data
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
    async confirmUserRegistration(id: string) {
      await api.post(`/users/${id}/confirm-registration`)
      await this.fetchUsers()
    },
    async resendUserInvite(id: string) {
      const { data } = await api.post<{
        emailSent?: boolean
        emailTestOnly?: boolean
        emailHint?: string
        confirmUrl?: string
        emailPreviewUrl?: string | null
      }>(`/users/${id}/resend-invite`)
      return data
    },
  },
})
