import { defineStore } from 'pinia'
import api from '../services/api'
import type { Profile } from './mockData'

type AuthUser = {
  id: string
  name: string
  email: string
  role: Profile
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
        this.user = { 
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as Profile
        }
        this.clearMockSession()
      } catch (error: any) {
        // FALLBACK: Se o backend estiver offline ou erro, tenta mock login
        const demoUsers = [
          { email: 'admin@assetra.com.br', pass: 'Admin@123', name: 'Admin Assetra', role: 'ADM' as Profile },
          { email: 'gestor@assetra.com.br', pass: 'Gestor@123', name: 'Gestor Assetra', role: 'GESTOR' as Profile },
          { email: 'tecnico@assetra.com.br', pass: 'Tecnico@123', name: 'Tecnico Assetra', role: 'TECNICO' as Profile }
        ]

        const matched = demoUsers.find(u => u.email === email && u.pass === password)
        
        if (matched) {
          this.mockLogin({
            id: `mock-${matched.role.toLowerCase()}`,
            name: matched.name,
            email: matched.email,
            role: matched.role
          })
          return
        }

        this.error = error?.response?.data?.message ?? 'Falha no login. Verifique suas credenciais.'
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
        this.user = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as Profile
        }
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
        // Backend offline.
      }
      this.user = null
    },
  },
})
