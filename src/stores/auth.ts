import { defineStore } from 'pinia'
import api from '../services/api'
import type { Profile } from './mockData'

type AuthUser = {
  id: string
  name: string
  email: string
  profile: Profile
}

const MOCK_SESSION_KEY = 'assetra-mock-session'

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
    setMockSession(user: AuthUser) {
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user))
    },
    clearMockSession() {
      localStorage.removeItem(MOCK_SESSION_KEY)
    },
    mockLogin(user: AuthUser) {
      this.error = ''
      this.user = user
      this.bootstrapped = true
      this.setMockSession(user)
    },
    async login(email: string, password: string) {
      this.isLoading = true
      this.error = ''
      try {
        const { data } = await api.post('/auth/login', { email, password })
        this.user = { ...data.user, profile: 'Administrador' }
        this.clearMockSession()
      } catch (error: any) {
        this.error = error?.response?.data?.message ?? 'Falha no login.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async fetchMe() {
      const rawSession = localStorage.getItem(MOCK_SESSION_KEY)
      if (rawSession) {
        try {
          this.user = JSON.parse(rawSession) as AuthUser
          this.bootstrapped = true
          return
        } catch {
          this.clearMockSession()
        }
      }

      try {
        const { data } = await api.get('/auth/me')
        this.user = { ...data.user, profile: 'Administrador' }
      } catch {
        this.user = null
      } finally {
        this.bootstrapped = true
      }
    },
    async logout() {
      this.clearMockSession()
      try {
        await api.post('/auth/logout')
      } catch {
        // Em modo mock o backend pode estar offline.
      }
      this.user = null
    },
  },
})
