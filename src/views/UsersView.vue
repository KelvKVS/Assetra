<template>
  <div class="users-page">
    <header class="hero">
      <div class="hero-text">
        <span class="hero-eyebrow">Administração</span>
        <h2>Usuários e Perfis</h2>
        <p class="muted">Gestão de acesso por perfil</p>
      </div>
      <button class="btn-primary" @click="showForm = !showForm">
        <Plus :size="18" :stroke-width="2.5" />
        {{ showForm ? 'Fechar' : 'Novo Usuário' }}
      </button>
    </header>

    <!-- Add User Form -->
    <div v-if="showForm" class="form-card form-card-elevated">
      <div class="form-head">
        <span class="form-eyebrow">Novo usuário</span>
        <h3>Cadastrar novo usuário</h3>
      </div>
      <form @submit.prevent="addUser" class="user-form modern-form">
        <div class="form-group field">
          <label>Nome completo</label>
          <input v-model.trim="newUser.name" type="text" placeholder="Nome completo" required />
        </div>
        <div class="form-group field">
          <label>E-mail</label>
          <input v-model.trim="newUser.email" type="email" placeholder="email@assetra.local" required />
        </div>
        <div class="form-group field">
          <label>Perfil</label>
          <select v-model="newUser.profile" required>
            <option value="ADM">Administrador</option>
            <option value="GESTOR">Gestor</option>
            <option value="TECNICO">Técnico</option>
          </select>
        </div>
        <div class="form-group field">
          <label>Status</label>
          <select v-model="newUser.status" required>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </div>
        <div class="form-group field">
          <label>Senha inicial</label>
          <input
            v-model="newUser.password"
            type="password"
            minlength="8"
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>
        <div class="form-group field">
          <label>Confirmar senha</label>
          <input
            v-model="newUser.confirmPassword"
            type="password"
            minlength="8"
            placeholder="Repita a senha"
            required
          />
        </div>
        <div class="form-actions field-wide">
          <button type="submit" class="btn-primary">
            {{ isGooglePrefilled ? 'Cadastrar usuário importado' : 'Cadastrar' }}
          </button>
          <button type="button" class="btn-google" @click="importFromGoogle" :disabled="!googleEnabled || googleLoading">
            <Chrome :size="16" :stroke-width="2.2" />
            {{ googleLoading ? 'Carregando Google...' : 'Puxar dados do Google' }}
          </button>
          <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
        </div>
        <p class="google-hint field-wide" v-if="!googleEnabled">
          Configure <code>VITE_GOOGLE_CLIENT_ID</code> para habilitar importação via Google.
        </p>
        <p class="google-hint field-wide" v-else-if="isGooglePrefilled">
          Dados preenchidos com Google. Revise perfil/status e clique em cadastrar.
        </p>
      </form>
      <p v-if="formError" class="error-message">{{ formError }}</p>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por nome, e-mail ou perfil..." />
    </div>

    <!-- Users Grid -->
    <div class="users-grid">
      <div v-for="user in filteredUsers" :key="user.id" class="user-card">
        <div class="user-avatar">
          {{ user.name.charAt(0).toUpperCase() }}
        </div>
        <div class="user-info">
          <h3 class="user-name">{{ user.name }}</h3>
          <p class="user-email">
            <Mail :size="14" :stroke-width="2" />
            {{ user.email }}
          </p>
          <div class="user-badges">
            <span :class="['profile-badge', `profile-${user.role.toLowerCase()}`]">
              {{ roleLabelPt(user.role) }}
            </span>
            <span :class="['status-badge', `status-${user.status.toLowerCase()}`]">
              {{ user.status }}
            </span>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-icon" @click="startUserEdit(user)" title="Editar">
            <Edit :size="18" :stroke-width="2.5" />
          </button>
          <button class="btn-icon btn-danger" @click="removeUser(user.id)" title="Excluir">
            <Trash2 :size="18" :stroke-width="2.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredUsers.length === 0" class="empty-state">
      <Users :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhum usuário encontrado</h3>
      <p>Cadastre o primeiro usuário do sistema</p>
    </div>

    <!-- Edit Modal -->
    <div v-if="editingUserId" class="modal-overlay" @click="cancelUserEdit">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Usuário</h3>
          <button class="btn-close" @click="cancelUserEdit">
            <X :size="20" :stroke-width="2.5" />
          </button>
        </div>
        <form @submit.prevent="saveUserEdit()" class="modal-form">
          <div class="form-group">
            <label>Nome</label>
            <input v-model.trim="editUser.name" type="text" required />
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input v-model.trim="editUser.email" type="email" required />
          </div>
          <div class="form-group">
            <label>Perfil</label>
            <select v-model="editUser.profile" required>
              <option value="ADM">Administrador</option>
              <option value="GESTOR">Gestor</option>
              <option value="TECNICO">Técnico</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="editUser.status" required>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nova senha (opcional)</label>
            <input
              v-model="editUser.password"
              type="password"
              minlength="8"
              placeholder="Deixe vazio para não alterar"
            />
          </div>
          <div class="form-group">
            <label>Confirmar nova senha</label>
            <input
              v-model="editUser.confirmPassword"
              type="password"
              minlength="8"
              placeholder="Repita a nova senha"
            />
          </div>
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Salvar</button>
            <button type="button" class="btn-secondary" @click="cancelUserEdit">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { type DirectoryUser, useInventoryStore } from '../stores/inventory'
import { roleLabelPt } from '../utils/roleLabels'
import { useConfirmAction } from '../composables/useConfirmAction'
import {
  Plus,
  Chrome,
  Search,
  Mail,
  Users,
  Edit,
  Trash2,
  X
} from 'lucide-vue-next'

const confirm = useConfirmAction()

const showForm = ref(false)
const search = ref('')
const formError = ref('')
const editingUserId = ref<string | null>(null)
const isGooglePrefilled = ref(false)
const googleLoading = ref(false)
const googleReady = ref(false)
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''
const googleEnabled = Boolean(googleClientId && !googleClientId.toLowerCase().includes('seu-client-id'))

const newUser = reactive({
  name: '',
  email: '',
  profile: 'TECNICO',
  status: 'Ativo',
  password: '',
  confirmPassword: '',
})

const editUser = reactive({
  name: '',
  email: '',
  profile: 'TECNICO',
  status: 'Ativo',
  password: '',
  confirmPassword: '',
})

const inventory = useInventoryStore()

onMounted(async () => {
  await inventory.fetchUsers()
  if (!googleEnabled) return
  try {
    googleLoading.value = true
    await loadGoogleScript()
    initializeGoogleIdentity()
    googleReady.value = true
  } catch {
    googleReady.value = false
  } finally {
    googleLoading.value = false
  }
})

const filteredUsers = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return inventory.users
  return inventory.users.filter((user) =>
    [user.name, user.email, user.role, user.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const addUser = async () => {
  formError.value = ''
  if (!isGooglePrefilled.value && newUser.password.length < 8) {
    formError.value = 'A senha deve ter pelo menos 8 caracteres.'
    return
  }
  if (!isGooglePrefilled.value && newUser.password !== newUser.confirmPassword) {
    formError.value = 'A confirmação de senha não corresponde.'
    return
  }
  const ok = await confirm.ask('Confirme com a sua senha para cadastrar este utilizador.')
  if (!ok) return
  try {
    await inventory.createUser({
      name: newUser.name,
      email: newUser.email,
      profile: newUser.profile,
      status: newUser.status,
      ...(isGooglePrefilled.value ? {} : { password: newUser.password }),
    })
    newUser.name = ''
    newUser.email = ''
    newUser.profile = 'TECNICO'
    newUser.status = 'Ativo'
    newUser.password = ''
    newUser.confirmPassword = ''
    isGooglePrefilled.value = false
    showForm.value = false
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Erro ao cadastrar usuário.'
  }
}

const importFromGoogle = async () => {
  formError.value = ''
  if (!googleEnabled) {
    formError.value = 'Importação Google indisponível: configure VITE_GOOGLE_CLIENT_ID.'
    return
  }
  if (!googleReady.value || !window.google?.accounts?.id) {
    formError.value = 'Google ainda não está pronto. Tente novamente em instantes.'
    return
  }
  window.google.accounts.id.prompt()
}

const onGoogleCredential = (response: { credential?: string }) => {
  const token = response?.credential
  if (!token) {
    formError.value = 'Não foi possível obter credencial do Google.'
    return
  }
  const payload = decodeGoogleJwtPayload(token)
  const name = String(payload?.name ?? '').trim()
  const email = String(payload?.email ?? '').trim().toLowerCase()
  if (!name || !email) {
    formError.value = 'Não foi possível extrair nome e e-mail do Google.'
    return
  }
  newUser.name = name
  newUser.email = email
  newUser.password = ''
  newUser.confirmPassword = ''
  isGooglePrefilled.value = true
  formError.value = ''
}

function initializeGoogleIdentity() {
  if (!window.google?.accounts?.id) return
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: onGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  })
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
      existing.addEventListener('error', () => reject(new Error('Erro ao carregar script Google')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Erro ao carregar script Google'))
    document.head.appendChild(script)
  })
}

function decodeGoogleJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    )
    return JSON.parse(decoded) as { name?: string; email?: string }
  } catch {
    return null
  }
}

const removeUser = async (id: string) => {
  const ok = await confirm.ask(
    'Confirme com a sua senha para excluir este utilizador.',
    'Confirmar exclusão',
  )
  if (!ok) return
  try {
    await inventory.deleteUser(id)
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Erro ao excluir.'
  }
}

const startUserEdit = (user: DirectoryUser) => {
  formError.value = ''
  editingUserId.value = user.id
  editUser.name = user.name
  editUser.email = user.email
  editUser.profile = user.role
  editUser.status = user.status as typeof editUser.status
  editUser.password = ''
  editUser.confirmPassword = ''
}

const cancelUserEdit = () => {
  editingUserId.value = null
}

const saveUserEdit = async () => {
  formError.value = ''
  if (!editingUserId.value) return
  if (editUser.password && editUser.password.length < 8) {
    formError.value = 'A nova senha deve ter pelo menos 8 caracteres.'
    return
  }
  if (editUser.password || editUser.confirmPassword) {
    if (editUser.password !== editUser.confirmPassword) {
      formError.value = 'A confirmação da nova senha não corresponde.'
      return
    }
  }
  const ok = await confirm.ask('Confirme com a sua senha para guardar as alterações.')
  if (!ok) return
  try {
    const payload: {
      name: string
      email: string
      profile: string
      status: string
      password?: string
    } = {
      name: editUser.name,
      email: editUser.email,
      profile: editUser.profile,
      status: editUser.status,
    }
    if (editUser.password) payload.password = editUser.password
    await inventory.updateUser(editingUserId.value, payload)
    editingUserId.value = null
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Não foi possível salvar.'
  }
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: Record<string, unknown>) => void
          prompt: () => void
        }
      }
    }
  }
}
</script>

<style scoped>
.users-page {
  animation: fade-up 0.5s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 24px;
  background:
    radial-gradient(circle at top right, rgba(59,130,246,0.16), transparent 55%),
    radial-gradient(circle at bottom left, rgba(168,85,247,0.08), transparent 60%),
    var(--bg-card);
  border: 1px solid var(--border-light);
}
.hero-text { display: flex; flex-direction: column; gap: 2px; }
.hero-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--primary);
  text-transform: uppercase;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-header p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--bg-card);
  border-color: var(--primary);
}

.form-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
}
.form-card-elevated {
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 55%),
    var(--bg-card);
}
.form-head { margin-bottom: 12px; }
.form-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--primary);
  text-transform: uppercase;
}

.form-card h3 {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.modern-form { gap: 14px; }
.field label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field-wide { grid-column: 1 / -1; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input, .form-group select {
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-primary);
}
.btn-google {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: #fff;
  color: #1f2937;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.btn-google:hover { border-color: var(--primary); }
.btn-google:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.google-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.error-message {
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--danger-light);
  color: var(--danger);
  border-radius: 8px;
  border-left: 3px solid var(--danger);
  font-size: 14px;
  font-weight: 500;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  margin-bottom: 24px;
  transition: all 0.2s ease;
}

.search-bar:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.search-bar svg {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.user-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.profile-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.profile-adm { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.profile-gestor { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.profile-tecnico { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-ativo {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-inativo {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.user-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon :deep(svg) {
  display: block;
  stroke: currentColor;
}

.btn-icon:hover {
  background: var(--primary);
  color: white !important;
  border-color: var(--primary);
}

.btn-icon.btn-danger:hover {
  background: var(--danger);
  border-color: var(--danger);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.3;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: var(--shadow-2xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--bg-hover);
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
