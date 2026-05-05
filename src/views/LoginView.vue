<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Left Side - Branding -->
      <div class="login-branding">
        <div class="brand-content">
          <div class="brand-logo">
            <Box :size="64" color="#3b82f6" strokeWidth="1.5" />
          </div>
          <h1 class="brand-title">Assetra</h1>
          <p class="brand-subtitle">Gestão corporativa de ativos de tecnologia</p>
          <div class="brand-features">
            <div class="feature-item">
              <CheckCircle :size="16" />
              <span>Controle completo do inventário</span>
            </div>
            <div class="feature-item">
              <CheckCircle :size="16" />
              <span>Gestão de manutenções</span>
            </div>
            <div class="feature-item">
              <CheckCircle :size="16" />
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
            <p class="muted">Digite suas credenciais de acesso</p>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label>
                <Building2 :size="16" />
                Organização
              </label>
              <input
                v-model.trim="tenantSlug"
                type="text"
                autocomplete="organization"
                class="input-field"
                placeholder="default"
                spellcheck="false"
              />
            </div>

            <div class="form-group">
              <label>
                <Mail :size="16" />
                E-mail
              </label>
              <input
                v-model.trim="email"
                type="email"
                autocomplete="username"
                required
                class="input-field"
                placeholder="admin@assetra.local"
              />
            </div>

            <div class="form-group">
              <label>
                <Lock :size="16" />
                Senha
              </label>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                class="input-field"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" :disabled="authStore.isLoading" class="login-btn">
              <Loader v-if="authStore.isLoading" class="spinner" :size="20" />
              <LogIn v-else :size="20" />
              {{ authStore.isLoading ? 'Entrando...' : 'Entrar' }}
            </button>

            <button
              type="button"
              class="google-btn"
              :disabled="authStore.isLoading"
              @click="handleGoogleLogin"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.6C16.9 2.8 14.7 2 12 2 6.9 2 2.8 6.2 2.8 11.4s4.1 9.4 9.2 9.4c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.6H12z"/>
              </svg>
              {{ authStore.isLoading ? 'Aguarde...' : 'Entrar / Cadastrar com Google' }}
            </button>
            <p v-if="!googleReady" class="google-hint">
              Configure <code>VITE_GOOGLE_CLIENT_ID</code> no frontend para ativar o Google.
            </p>
          </form>

          <!-- Error Alert -->
          <div v-if="authStore.error" class="error-alert">
            <AlertCircle :size="20" />
            <p>{{ authStore.error }}</p>
          </div>

          <!-- Demo Credentials -->
          <div class="demo-credentials">
            <h4>Contas de demonstração</h4>

            <div class="demo-grid">
              <button
                type="button"
                class="demo-user"
                @click="fillForm('admin@assetra.local', 'senha123', 'default')"
              >
                <span class="role-tag adm">ADM</span>
                <code>admin@assetra.local</code>
                <span class="demo-slug">default</span>
              </button>

              <button
                type="button"
                class="demo-user"
                @click="fillForm('gestor@assetra.local', 'senha123', 'default')"
              >
                <span class="role-tag gestor">GESTOR</span>
                <code>gestor@assetra.local</code>
                <span class="demo-slug">default</span>
              </button>

              <button
                type="button"
                class="demo-user"
                @click="fillForm('tecnico@assetra.local', 'senha123', 'default')"
              >
                <span class="role-tag tecnico">TÉCNICO</span>
                <code>tecnico@assetra.local</code>
                <span class="demo-slug">default</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  Box,
  CheckCircle,
  Building2,
  Mail,
  Lock,
  Loader,
  LogIn,
  AlertCircle
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const tenantSlug = ref('default')
const email = ref('')
const password = ref('')
const googleReady = ref(false)

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const hasValidGoogleClientId = Boolean(
  googleClientId?.trim() && !googleClientId.toLowerCase().includes('seu-client-id'),
)

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          prompt: () => void
        }
      }
    }
  }
}

watch(
  () => route.params.tenantSlug,
  (slug) => {
    if (typeof slug === 'string' && slug.trim()) {
      tenantSlug.value = slug.trim()
    } else {
      tenantSlug.value = 'default'
    }
  },
  { immediate: true },
)

const fillForm = (e: string, p: string, slug = 'default') => {
  email.value = e
  password.value = p
  tenantSlug.value = slug
}

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value, tenantSlug.value || undefined)
    router.push('/dashboard')
  } catch (err) {
    // Erros são tratados no store
  }
}

const onGoogleCredential = async (response: { credential?: string }) => {
  const token = response?.credential
  if (!token) {
    authStore.error = 'Não foi possível obter credencial do Google.'
    return
  }
  try {
    await authStore.loginWithGoogle(token, tenantSlug.value || undefined)
    router.push('/dashboard')
  } catch {
    // mensagem já tratada no store
  }
}

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existing = document.getElementById('google-identity-script')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Erro ao carregar Google script')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Erro ao carregar Google script'))
    document.head.appendChild(script)
  })
}

const handleGoogleLogin = () => {
  if (!hasValidGoogleClientId) {
    authStore.error = 'Login Google indisponível: configure VITE_GOOGLE_CLIENT_ID no frontend.'
    return
  }
  if (!googleReady.value || !window.google?.accounts?.id) {
    authStore.error = 'Login Google ainda não inicializado. Recarregue a página e tente novamente.'
    return
  }
  window.google.accounts.id.prompt()
}

onMounted(async () => {
  if (!hasValidGoogleClientId) {
    googleReady.value = false
    return
  }
  try {
    await loadGoogleScript()
    if (!window.google?.accounts?.id) return
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: onGoogleCredential,
    })
    googleReady.value = true
  } catch {
    googleReady.value = false
  }
})

onBeforeUnmount(() => {
  // Mantemos script global carregado; apenas limpamos estado local.
  googleReady.value = false
})
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
  grid-template-columns: 1fr 1.2fr;
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
}

.feature-item svg {
  color: #22c55e;
}

/* Right Side - Login Form */
.login-form-section {
  padding: 48px;
  display: flex;
  align-items: center;
  background: var(--bg-card);
}

.login-form-content {
  width: 100%;
  max-width: 420px;
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

.input-field {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  border: 2px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 700;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.google-btn:hover:not(:disabled) {
  border-color: var(--primary);
  transform: translateY(-1px);
}

.google-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.google-btn svg {
  width: 18px;
  height: 18px;
}

.google-hint {
  margin: -10px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.login-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

/* Error Alert */
.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--danger-light);
  border: 1px solid var(--danger);
  border-radius: 10px;
  margin-bottom: 24px;
  color: var(--danger);
}

/* Demo Credentials */
.demo-credentials {
  padding: 20px;
  background: var(--bg-hover);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

.demo-credentials h4 {
  margin: 0 0 16px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.demo-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.demo-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  text-align: left;
  color: inherit;
}

.demo-user:hover {
  border-color: var(--primary);
  transform: translateX(4px);
}

.demo-user:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.role-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 55px;
  text-align: center;
}

.role-tag.adm { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.role-tag.gestor { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
.role-tag.tecnico { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }

.demo-user code {
  font-size: 12px;
  color: var(--text-primary);
}

.demo-slug {
  margin-left: auto;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  text-transform: lowercase;
  flex-shrink: 0;
}

.demo-user code {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Responsividade */
@media (max-width: 900px) {
  .login-container {
    grid-template-columns: 1fr;
    max-width: 520px;
    min-height: 0;
  }
  .login-branding { display: none; }
  .login-form-section { padding: 36px 28px; }
}

@media (max-width: 520px) {
  .login-page { padding: 12px; }
  .login-container { border-radius: 14px; }
  .login-form-section { padding: 28px 20px; }
  .login-header h2 { font-size: 22px; }
  .input-field { padding: 11px 14px; font-size: 14px; }
  .login-btn { padding: 12px; font-size: 15px; }
  .demo-credentials { padding: 14px; }
  .demo-user { padding: 8px 10px; gap: 8px; }
  .demo-user code { font-size: 11px; }
}
</style>
