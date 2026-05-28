import { defineStore } from 'pinia'
import api from '../services/api'
import { setSessionToken } from '../services/api'
import { setUploadSessionToken } from '../services/uploadApi'
import type { Profile } from '../types/assetra'

const LEGACY_MOCK_SESSION = 'assetra-mock-session'
const LEGACY_MOCK_DATA = 'assetra-mock-data-v1'
const AUTH_TOKEN_KEY = 'assetra-auth-token'

export type TenantInfo = {
  slug: string
  name: string
}

type AuthUser = {
  id: string
  name: string
  email: string
  role: Profile
  department?: string | null
  tenantId?: string
  tenant?: TenantInfo
}

function clearLegacyMockStorage() {
  try {
    localStorage.removeItem(LEGACY_MOCK_SESSION)
    localStorage.removeItem(LEGACY_MOCK_DATA)
  } catch {
    /* ignore */
  }
}

function persistToken(token?: string) {
  const value = token?.trim() || ''
  setSessionToken(value)
  setUploadSessionToken(value)
  try {
    if (value) {
      localStorage.setItem(AUTH_TOKEN_KEY, value)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    /* ignore — modo privado / quota */
  }
}

function loadPersistedToken() {
  try {
    const stored = localStorage.getItem(AUTH_TOKEN_KEY)?.trim() || ''
    setSessionToken(stored)
    setUploadSessionToken(stored)
  } catch {
    setSessionToken('')
    setUploadSessionToken('')
  }
}

/** Evita dois GET /auth/me em paralelo (App.vue + router guard). */
let fetchMePromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    isLoading: false,
    error: '',
    bootstrapped: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    async login(email: string, password: string, tenantSlug?: string) {
      this.isLoading = true
      this.error = ''

      try {
        const slug = tenantSlug?.trim()
        const { data } = await api.post<{
          user: AuthUser & { tenant?: TenantInfo; tenantId?: string }
          token: string
        }>('/auth/login', {
          email,
          password,
          ...(slug ? { tenantSlug: slug } : {}),
        })
        if (!data.user || !data.token) {
          throw new Error('Resposta de login inválida.')
        }
        this.user = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as Profile,
          department: data.user.department ?? null,
          tenantId: data.user.tenantId,
          tenant: data.user.tenant,
        }
        persistToken(data.token)
        clearLegacyMockStorage()
      } catch (error: unknown) {
        const ax = error as { response?: { data?: { message?: string } } }
        this.error = ax?.response?.data?.message ?? 'Falha no login. Verifique e-mail, senha e organização.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async loginWithGoogle(credential: string, tenantSlug?: string) {
      this.isLoading = true
      this.error = ''
      try {
        const slug = tenantSlug?.trim()
        const { data } = await api.post('/auth/google', {
          credential,
          ...(slug ? { tenantSlug: slug } : {}),
        })
        this.user = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as Profile,
          department: data.user.department ?? null,
          tenantId: data.user.tenantId,
          tenant: data.user.tenant,
        }
        persistToken(data.token)
        clearLegacyMockStorage()
      } catch (error: unknown) {
        const ax = error as { response?: { data?: { message?: string } } }
        this.error = ax?.response?.data?.message ?? 'Falha no login com Google.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async fetchMe() {
      if (this.bootstrapped) return
      if (fetchMePromise) return fetchMePromise

      fetchMePromise = (async () => {
        loadPersistedToken()
        try {
          const res = await api.get('/auth/me')
          if (res.data?.user) {
            this.user = {
              id: res.data.user.id,
              name: res.data.user.name,
              email: res.data.user.email,
              role: res.data.user.role as Profile,
              department: res.data.user.department ?? null,
              tenantId: res.data.user.tenantId,
              tenant: res.data.user.tenant,
            }
            clearLegacyMockStorage()
          } else {
            this.user = null
            persistToken('')
          }
        } catch {
          this.user = null
          persistToken('')
        } finally {
          this.bootstrapped = true
          fetchMePromise = null
        }
      })()

      return fetchMePromise
    },
    async logout() {
      clearLegacyMockStorage()
      try {
        await api.post('/auth/logout')
      } catch {
        /* API offline */
      }
      this.user = null
      persistToken('')
    },
  },
})
