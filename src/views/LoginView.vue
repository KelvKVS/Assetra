<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Left Side - Branding -->
      <div class="login-branding">
        <div class="brand-content">
          <div class="brand-logo">
            <Box size="64" color="#3b82f6" strokeWidth="1.5" />
          </div>
          <h1 class="brand-title">Assetra</h1>
          <p class="brand-subtitle">Gestão corporativa de ativos de tecnologia</p>
          <div class="brand-features">
            <div class="feature-item">
              <CheckCircle size="16" />
              <span>Controle completo do inventário</span>
            </div>
            <div class="feature-item">
              <CheckCircle size="16" />
              <span>Gestão de manutenções</span>
            </div>
            <div class="feature-item">
              <CheckCircle size="16" />
              <span>Movimentações e transferências</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side - Login Form -->
      <div class="login-form-section">
        <div class="login-form-content">
          <div class="login-header">
            <h2>Entrar no sistema</h2>
            <p class="muted">Selecione seu perfil de acesso</p>
          </div>

          <!-- Profile Selector -->
          <div class="profile-selector">
            <div
              v-for="prof in profiles"
              :key="prof.value"
              :class="['profile-card', { active: profile === prof.value }]"
              @click="profile = prof.value"
            >
              <component :is="prof.icon" size="24" />
              <span>{{ prof.label }}</span>
            </div>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label>
                <Mail size="16" />
                E-mail
              </label>
              <input
                v-model.trim="email"
                type="email"
                autocomplete="username"
                required
                class="input-field"
                placeholder="seu.email@assetra.local"
              />
            </div>

            <div class="form-group">
              <label>
                <Lock size="16" />
                Senha
              </label>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                minlength="8"
                class="input-field"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" :disabled="authStore.isLoading" class="login-btn">
              <Loader v-if="authStore.isLoading" class="spinner" size="20" />
              <LogIn v-else size="20" />
              {{ authStore.isLoading ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>

          <!-- Error Alert -->
          <div v-if="authStore.error" class="error-alert">
            <AlertCircle size="20" />
            <p>{{ authStore.error }}</p>
          </div>

          <!-- Demo Credentials -->
          <div class="demo-credentials">
            <h4>Credenciais de demonstração:</h4>
            <div class="credential-item">
              <span class="credential-label">Admin:</span>
              <code>admin@assetra.local</code> / <code>Admin@12345</code>
            </div>
            <p class="demo-note">
              <Info size="14" />
              Gestor e Técnico entram direto (sem senha)
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMockDataStore, type Profile } from '../stores/mockData'
import {
  Box,
  CheckCircle,
  Mail,
  Lock,
  Loader,
  LogIn,
  AlertCircle,
  Info,
  Shield,
  UserCog,
  Wrench
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const mockStore = useMockDataStore()
mockStore.hydrate()

const profiles = [
  { value: 'Administrador' as Profile, label: 'Administrador', icon: Shield },
  { value: 'Gestor' as Profile, label: 'Gestor', icon: UserCog },
  { value: 'Técnico' as Profile, label: 'Técnico', icon: Wrench },
]

const profile = ref<Profile>('Administrador')
const email = ref('admin@assetra.local')
const password = ref('Admin@12345')

const isMockProfile = computed(() => profile.value !== 'Administrador')

const handleLogin = async () => {
  try {
    if (isMockProfile.value) {
      // Mock login for Gestor and Técnico
      const matchedUser = mockStore.users.find(
        (user) => user.profile === profile.value && user.status === 'Ativo'
      )
      
      if (!matchedUser) {
        authStore.error = `Não existe usuário ativo para o perfil ${profile.value}.`
        return
      }

      authStore.mockLogin({
        id: `mock-${profile.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`,
        name: matchedUser.name,
        email: matchedUser.email,
        profile: matchedUser.profile,
      })
      
      await router.push('/dashboard')
      return
    }

    // Real admin login
    await authStore.login(email.value, password.value)
    await router.push('/dashboard')
  } catch (err: any) {
    // If backend is offline, fallback to mock admin login
    if (email.value === 'admin@assetra.local' && password.value === 'Admin@12345') {
      authStore.mockLogin({
        id: 'mock-admin',
        name: 'Kelvin Siqueira',
        email: 'admin@assetra.local',
        profile: 'Administrador',
      })
      await router.push('/dashboard')
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}

.login-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 1100px;
  width: 100%;
  background: var(--bg-card);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-light);
  min-height: 650px;
}

/* Left Side - Branding */
.login-branding {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  padding: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-branding::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.brand-logo {
  width: 96px;
  height: 96px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.brand-title {
  margin: 0 0 8px;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
}

.brand-subtitle {
  margin: 0 0 32px;
  font-size: 15px;
  opacity: 0.9;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  max-width: 280px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  opacity: 0.95;
}

.feature-item svg {
  flex-shrink: 0;
  color: #22c55e;
}

/* Right Side - Login Form */
.login-form-section {
  padding: 48px;
  display: flex;
  align-items: center;
  overflow-y: auto;
}

.login-form-content {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.login-header {
  margin-bottom: 32px;
}

.login-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* Profile Selector */
.profile-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: var(--bg-hover);
  border: 2px solid var(--border-light);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.profile-card:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.profile-card.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.profile-card svg {
  transition: transform 0.2s ease;
}

.profile-card:hover svg {
  transform: scale(1.1);
}

/* Login Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group label svg {
  flex-shrink: 0;
  color: var(--text-muted);
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  border: 2px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.2s ease;
  font-family: inherit;
}

.input-field:hover {
  border-color: var(--primary);
}

.input-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.input-field::placeholder {
  color: var(--text-muted);
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  font-family: inherit;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Error Alert */
.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--danger-light);
  border: 1px solid var(--danger);
  border-radius: 10px;
  margin-bottom: 24px;
  animation: shake 0.5s ease;
}

.error-alert svg {
  flex-shrink: 0;
  color: var(--danger);
}

.error-alert p {
  margin: 0;
  font-size: 14px;
  color: var(--danger);
  font-weight: 500;
}

/* Demo Credentials */
.demo-credentials {
  padding: 20px;
  background: var(--bg-hover);
  border-radius: 10px;
  border: 1px solid var(--border-light);
}

.demo-credentials h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.credential-item {
  margin-bottom: 8px;
  font-size: 14px;
}

.credential-label {
  color: var(--text-secondary);
  margin-right: 6px;
}

.credential-item code {
  background: var(--bg-primary);
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: var(--primary);
  border: 1px solid var(--border-light);
  font-size: 13px;
}

.demo-note {
  margin: 12px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  font-style: normal;
}

.demo-note svg {
  flex-shrink: 0;
}

/* Animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

/* Responsive */
@media (max-width: 900px) {
  .login-container {
    grid-template-columns: 1fr;
    max-width: 500px;
  }

  .login-branding {
    padding: 32px 24px;
    min-height: auto;
  }

  .brand-features {
    display: none;
  }

  .login-form-section {
    padding: 32px 24px;
  }

  .profile-selector {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .profile-card {
    padding: 12px 8px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 0;
  }

  .login-container {
    border-radius: 0;
    min-height: 100vh;
  }

  .login-header h2 {
    font-size: 24px;
  }
}
</style>
