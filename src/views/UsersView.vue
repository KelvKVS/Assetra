<template>
  <div class="users-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Usuários e Perfis</h2>
        <p class="muted">Gestão de acesso por perfil</p>
      </div>
      <button class="btn-primary" @click="showForm = !showForm">
        <Plus size="18" />
        {{ showForm ? 'Fechar' : 'Novo Usuário' }}
      </button>
    </div>

    <!-- Add User Form -->
    <div v-if="showForm" class="form-card">
      <h3>Cadastrar novo usuário</h3>
      <form @submit.prevent="addUser" class="user-form">
        <div class="form-group">
          <label>Nome completo</label>
          <input v-model.trim="newUser.name" type="text" placeholder="Nome completo" required />
        </div>
        <div class="form-group">
          <label>E-mail</label>
          <input v-model.trim="newUser.email" type="email" placeholder="email@assetra.local" required />
        </div>
        <div class="form-group">
          <label>Perfil</label>
          <select v-model="newUser.profile" required>
            <option>Administrador</option>
            <option>Gestor</option>
            <option>Técnico</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="newUser.status" required>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Cadastrar</button>
          <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
        </div>
      </form>
      <p v-if="formError" class="error-message">{{ formError }}</p>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <Search size="18" />
      <input v-model.trim="search" type="text" placeholder="Buscar por nome, e-mail ou perfil..." />
    </div>

    <!-- Users Grid -->
    <div class="users-grid">
      <div v-for="user in filteredUsers" :key="user.email" class="user-card">
        <div class="user-avatar">
          {{ user.name.charAt(0).toUpperCase() }}
        </div>
        <div class="user-info">
          <h3 class="user-name">{{ user.name }}</h3>
          <p class="user-email">
            <Mail size="14" />
            {{ user.email }}
          </p>
          <div class="user-badges">
            <span :class="['profile-badge', `profile-${user.profile.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`]">
              {{ user.profile }}
            </span>
            <span :class="['status-badge', `status-${user.status.toLowerCase()}`]">
              {{ user.status }}
            </span>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-icon" @click="startUserEdit(user)" title="Editar">
            <Pencil size="16" />
          </button>
          <button class="btn-icon btn-danger" @click="removeUser(user.email)" title="Excluir">
            <Trash2 size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredUsers.length === 0" class="empty-state">
      <Users size="64" class="empty-icon" />
      <h3>Nenhum usuário encontrado</h3>
      <p>Cadastre o primeiro usuário do sistema</p>
    </div>

    <!-- Edit Modal -->
    <div v-if="editingEmail" class="modal-overlay" @click="cancelUserEdit">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Usuário</h3>
          <button class="btn-close" @click="cancelUserEdit">
            <X size="20" />
          </button>
        </div>
        <form @submit.prevent="saveUserEdit(editingEmail)" class="modal-form">
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
              <option>Administrador</option>
              <option>Gestor</option>
              <option>Técnico</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="editUser.status" required>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
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
import { computed, reactive, ref } from 'vue'
import { type User, useMockDataStore } from '../stores/mockData'
import {
  Plus,
  Search,
  Mail,
  Users,
  Pencil,
  Trash2,
  X
} from 'lucide-vue-next'

const showForm = ref(false)
const search = ref('')
const formError = ref('')
const editingEmail = ref<string | null>(null)

const newUser = reactive<User>({
  name: '',
  email: '',
  profile: 'Técnico',
  status: 'Ativo',
})

const editUser = reactive<User>({
  name: '',
  email: '',
  profile: 'Técnico',
  status: 'Ativo',
})

const mockStore = useMockDataStore()
mockStore.hydrate()

const filteredUsers = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return mockStore.users
  return mockStore.users.filter((user) =>
    [user.name, user.email, user.profile, user.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const addUser = () => {
  formError.value = ''
  const added = mockStore.addUser({ ...newUser })
  if (!added) {
    formError.value = 'Já existe um usuário com este e-mail.'
    return
  }
  newUser.name = ''
  newUser.email = ''
  newUser.profile = 'Técnico'
  newUser.status = 'Ativo'
  showForm.value = false
}

const removeUser = (email: string) => {
  if (confirm('Tem certeza que deseja excluir este usuário?')) {
    mockStore.removeUser(email)
  }
}

const startUserEdit = (user: User) => {
  formError.value = ''
  editingEmail.value = user.email
  editUser.name = user.name
  editUser.email = user.email
  editUser.profile = user.profile
  editUser.status = user.status
}

const cancelUserEdit = () => {
  editingEmail.value = null
}

const saveUserEdit = (originalEmail: string) => {
  formError.value = ''
  const updated = mockStore.updateUser(originalEmail, { ...editUser })
  if (!updated) {
    formError.value = 'Não foi possível salvar: o novo e-mail já existe.'
    return
  }
  editingEmail.value = null
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

/* Form Card */
.form-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
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

/* Search Bar */
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

.search-bar input::placeholder {
  color: var(--text-muted);
}

/* Users Grid */
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

.user-email svg {
  flex-shrink: 0;
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

.profile-administrador {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.profile-gestor {
  background: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
}

.profile-tcnico {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

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

.btn-icon:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-icon.btn-danger:hover {
  background: var(--danger);
  border-color: var(--danger);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.2s ease;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: var(--shadow-2xl);
  animation: scale-in 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
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
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: var(--danger);
  color: white;
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

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .users-grid {
    grid-template-columns: 1fr;
  }

  .user-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .user-form {
    grid-template-columns: 1fr;
  }
}
</style>
