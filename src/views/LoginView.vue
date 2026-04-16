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
                <Mail :size="16" />
                E-mail
              </label>
              <input
                v-model.trim="email"
                type="email"
                autocomplete="username"
                required
                class="input-field"
                placeholder="seu.email@assetra.com.br"
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
          </form>

          <!-- Error Alert -->
          <div v-if="authStore.error" class="error-alert">
            <AlertCircle :size="20" />
            <p>{{ authStore.error }}</p>
          </div>

          <!-- Demo Credentials -->
          <div class="demo-credentials">
            <h4>Credenciais de demonstração:</h4>
            
            <div class="demo-grid">
              <div class="demo-user" @click="fillForm('admin@assetra.com.br', 'Admin@123')">
                <span class="role-tag adm">ADM</span>
                <code>admin@assetra.com.br</code>
              </div>
              
              <div class="demo-user" @click="fillForm('gestor@assetra.com.br', 'Gestor@123')">
                <span class="role-tag gestor">GESTOR</span>
                <code>gestor@assetra.com.br</code>
              </div>
              
              <div class="demo-user" @click="fillForm('tecnico@assetra.com.br', 'Tecnico@123')">
                <span class="role-tag tecnico">TÉCNICO</span>
                <code>tecnico@assetra.com.br</code>
              </div>
            </div>
            
            <p class="demo-note">
              <Info :size="14" />
              Clique em um usuário para preencher o formulário.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  Box,
  CheckCircle,
  Mail,
  Lock,
  Loader,
  LogIn,
  AlertCircle,
  Info
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('admin@assetra.com.br')
const password = ref('Admin@123')

const fillForm = (e: string, p: string) => {
  email.value = e
  password.value = p
}

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    // Erros são tratados no store
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
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.demo-user:hover {
  border-color: var(--primary);
  transform: translateX(4px);
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

.demo-note {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

@media (max-width: 900px) {
  .login-container {
    grid-template-columns: 1fr;
    max-width: 500px;
  }
  .login-branding { display: none; }
}
</style>
