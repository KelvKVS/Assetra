import { defineStore } from 'pinia'
import api from '../services/api'
import { setSessionToken } from '../services/api'
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
  try {
    if (value) localStorage.setItem(AUTH_TOKEN_KEY, value)
    else localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function loadPersistedToken() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || ''
    setSessionToken(token)
  } catch {
    setSessionToken('')
  }
}

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
        const { data } = await api.post('/auth/login', {
          email,
          password,
          ...(slug ? { tenantSlug: slug } : {}),
        })
        this.user = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as Profile,
          tenantId: data.user.tenantId,
          tenant: data.user.tenant,
        }
        persistToken(data.token)
        clearLegacyMockStorage()
      } catch (error: unknown) {
        const ax = error as { response?: { data?: { message?: string } } }
        this.error = ax?.response?.data?.message ?? 'Falha no login. Confirme o backend (npm run dev), o ficheiro backend/.env e as credenciais do seed (npm run db:seed).'
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
      loadPersistedToken()
      try {
        const res = await api.get('/auth/me', { silent401: true } as Record<string, unknown>)
        if (res?.status === 200 && res.data?.user) {
          this.user = {
            id: res.data.user.id,
            name: res.data.user.name,
            email: res.data.user.email,
            role: res.data.user.role as Profile,
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
      }
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
