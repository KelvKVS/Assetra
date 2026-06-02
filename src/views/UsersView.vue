<template>
  <div class="users-page">
    <header class="hero">
      <div class="hero-text">
        <span class="hero-eyebrow">Administração</span>
        <h2>Usuários e Perfis</h2>
        <p class="muted">
          {{ isAdmin ? 'Gestão de acesso por perfil' : 'Consulta de utilizadores e ativos atribuídos' }}
        </p>
      </div>
      <button v-if="isAdmin" class="btn-primary" @click="toggleUserForm">
        <Plus :size="18" :stroke-width="2.5" />
        {{ showForm ? 'Fechar' : 'Novo Usuário' }}
      </button>
    </header>

    <!-- Add User Form -->
    <div v-if="isAdmin && showForm" class="form-card form-card-elevated">
      <div class="form-head">
        <span class="form-eyebrow">Novo usuário</span>
        <h3>Cadastrar novo usuário</h3>
      </div>
      <ol class="wizard-steps">
        <li v-for="(label, idx) in userStepLabels" :key="label" :class="{ active: userStep === idx + 1, done: userStep > idx + 1 }">
          <span>{{ idx + 1 }}</span>{{ label }}
        </li>
      </ol>
      <div class="registration-mode field-wide">
        <button
          type="button"
          :class="['mode-btn', { active: registrationMode === 'google' }]"
          @click="setRegistrationMode('google')"
        >
          Conta Google (produção)
        </button>
        <button
          type="button"
          :class="['mode-btn', { active: registrationMode === 'demo' }]"
          @click="setRegistrationMode('demo')"
        >
          Demo @assetra.local
        </button>
      </div>
      <p class="mode-hint field-wide">
        <template v-if="registrationMode === 'google'">
          Cadastre o <strong>e-mail Google do colaborador</strong> (o ADM não precisa da password dele).
          No primeiro acesso, o colaborador usa «Entrar com Google» com essa mesma conta — o sistema valida no Google.
        </template>
        <template v-else>
          Apenas para testes (seed). Domínio obrigatório: <code>@assetra.local</code> — login com senha.
        </template>
      </p>

      <form @submit.prevent="addUser" class="user-form modern-form">
        <template v-if="userStep === 1">
        <div class="form-group field">
          <label>Nome completo</label>
          <input v-model.trim="newUser.name" type="text" placeholder="Nome completo" required />
        </div>
        <div class="form-group field">
          <label>E-mail</label>
          <input
            v-model.trim="newUser.email"
            type="email"
            :placeholder="registrationMode === 'demo' ? 'nome@assetra.local' : 'colaborador@gmail.com'"
            required
            @blur="checkEmailAvailability"
          />
          <p v-if="emailStatus.message" :class="['email-status', emailStatusClass]">
            {{ emailStatus.message }}
          </p>
        </div>
        <div class="form-group field">
          <label>Perfil</label>
          <select v-model="newUser.profile" required>
            <option value="ADM">Administrador</option>
            <option value="GESTOR">Gestor</option>
            <option value="TECNICO">Técnico</option>
            <option value="FUNCIONARIO">Funcionário</option>
          </select>
        </div>
        <div class="form-actions field-wide">
          <button type="button" class="btn-primary" @click="goToUserStep(2)">Continuar</button>
        </div>
        </template>
        <template v-else>
        <div class="form-group field">
          <label>
            Área / setor
            <span v-if="requiresDepartment" class="label-required">*</span>
          </label>
          <select v-model="departmentSelect" :required="requiresDepartment">
            <option disabled value="">Selecione a área</option>
            <option v-for="area in departmentOptions" :key="`new-area-${area}`" :value="area">
              {{ area }}
            </option>
            <option :value="DEPARTMENT_OTHER">Outra área…</option>
          </select>
          <input
            v-if="departmentSelect === DEPARTMENT_OTHER"
            v-model.trim="departmentCustom"
            type="text"
            class="input-field department-custom"
            placeholder="Ex.: Facilities, Produção"
            :required="requiresDepartment"
          />
          <small v-if="!requiresDepartment" class="field-hint">Opcional para administradores, gestores e técnicos.</small>
        </div>
        <div class="form-group field">
          <label>Status</label>
          <select v-model="newUser.status" required>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </div>
        <template v-if="registrationMode === 'demo'">
          <div class="form-group field">
            <label>Senha inicial</label>
            <PasswordInput
              v-model="newUser.password"
              :minlength="8"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <div class="form-group field">
            <label>Confirmar senha</label>
            <PasswordInput
              v-model="newUser.confirmPassword"
              :minlength="8"
              autocomplete="new-password"
              placeholder="Repita a senha"
              required
            />
          </div>
        </template>
        <div class="form-actions field-wide">
          <button type="button" class="btn-secondary" @click="goToUserStep(1)">Voltar</button>
          <button type="submit" class="btn-primary">
            {{ registrationMode === 'google' ? 'Cadastrar (login Google)' : 'Cadastrar demo' }}
          </button>
          <button type="button" class="btn-secondary" @click="closeUserForm">Cancelar</button>
        </div>
        </template>
      </form>
      <p v-if="formError" class="error-message">{{ formError }}</p>
    </div>

    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input
        v-model.trim="pageSearch"
        type="search"
        placeholder="Buscar por nome, e-mail ou perfil..."
      />
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
            <span v-if="isDemoAssetraEmail(user.email)" class="account-badge demo">Demo</span>
            <span v-else class="account-badge google">Google</span>
            <span v-if="user.department" class="department-badge">{{ user.department }}</span>
          </div>
          <RouterLink
            class="user-assets-toggle"
            :to="{ name: 'assets', query: { assigned: user.email } }"
            :title="`Ver ativos de ${user.name}`"
          >
            <Monitor :size="14" :stroke-width="2.5" />
            Ativos atribuídos
            <span class="user-assets-count">{{ assetsForUser(user).length }}</span>
          </RouterLink>
        </div>
        <div v-if="isAdmin" class="user-actions">
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
              <option value="FUNCIONARIO">Funcionário</option>
            </select>
          </div>
          <div class="form-group">
            <label>
              Área / setor
              <span v-if="editRequiresDepartment" class="label-required">*</span>
            </label>
            <select v-model="editDepartmentSelect" :required="editRequiresDepartment">
              <option disabled value="">Selecione a área</option>
              <option v-for="area in departmentOptions" :key="`edit-area-${area}`" :value="area">
                {{ area }}
              </option>
              <option :value="DEPARTMENT_OTHER">Outra área…</option>
            </select>
            <input
              v-if="editDepartmentSelect === DEPARTMENT_OTHER"
              v-model.trim="editDepartmentCustom"
              type="text"
              placeholder="Nome da área"
              :required="editRequiresDepartment"
            />
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
            <PasswordInput
              v-model="editUser.password"
              :minlength="8"
              autocomplete="new-password"
              placeholder="Deixe vazio para não alterar"
            />
          </div>
          <div class="form-group">
            <label>Confirmar nova senha</label>
            <PasswordInput
              v-model="editUser.confirmPassword"
              :minlength="8"
              autocomplete="new-password"
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { type DirectoryUser, useInventoryStore } from '../stores/inventory'
import { assetsAssignedToEmail } from '../utils/userScope'
import { roleLabelPt } from '../utils/roleLabels'
import { isDemoAssetraEmail } from '../utils/emailPolicy'
import { useConfirmAction } from '../composables/useConfirmAction'
import { useLocalPageSearch } from '../composables/useLocalPageSearch'
import PasswordInput from '../components/PasswordInput.vue'
import { DEFAULT_DEPARTMENTS, DEPARTMENT_OTHER } from '../constants/departments'
import {
  Plus,
  Search,
  Mail,
  Users,
  Edit,
  Trash2,
  X,
  Monitor,
} from 'lucide-vue-next'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'ADM')

const confirm = useConfirmAction()

const { pageSearch, matchesPageSearch } = useLocalPageSearch()

const showForm = ref(false)
const userStep = ref(1)
const userStepLabels = ['Dados iniciais', 'Acesso e segurança']
const formError = ref('')
const editingUserId = ref<string | null>(null)
const registrationMode = ref<'google' | 'demo'>('google')
const emailStatus = ref({
  message: '',
  available: false,
  formatValid: false,
})

const emailStatusClass = computed(() => {
  if (!emailStatus.value.message) return ''
  if (!emailStatus.value.formatValid) return 'warn'
  if (!emailStatus.value.available) return 'error'
  return 'ok'
})

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

const assetsForUser = (user: DirectoryUser) =>
  assetsAssignedToEmail(inventory.assets, user.email)

const departmentOptions = ref<string[]>([...DEFAULT_DEPARTMENTS])
const departmentSelect = ref('RH')
const departmentCustom = ref('')
const editDepartmentSelect = ref('RH')
const editDepartmentCustom = ref('')

const requiresDepartment = computed(() => newUser.profile === 'FUNCIONARIO')
const editRequiresDepartment = computed(() => editUser.profile === 'FUNCIONARIO')

function resolveDepartmentValue(select: string, custom: string) {
  if (select === DEPARTMENT_OTHER) return custom.trim()
  return select.trim()
}

function applyEditDepartment(department: string | null | undefined) {
  const value = String(department ?? '').trim()
  if (!value) {
    editDepartmentSelect.value = 'RH'
    editDepartmentCustom.value = ''
    return
  }
  if (departmentOptions.value.includes(value)) {
    editDepartmentSelect.value = value
    editDepartmentCustom.value = ''
    return
  }
  editDepartmentSelect.value = DEPARTMENT_OTHER
  editDepartmentCustom.value = value
  if (!departmentOptions.value.includes(value)) {
    departmentOptions.value = [...departmentOptions.value, value].sort((a, b) => a.localeCompare(b, 'pt'))
  }
}

watch(
  () => newUser.profile,
  (profile) => {
    if (profile === 'FUNCIONARIO' && !departmentSelect.value) {
      departmentSelect.value = 'RH'
    }
  },
)

function setRegistrationMode(mode: 'google' | 'demo') {
  registrationMode.value = mode
  formError.value = ''
  emailStatus.value = { message: '', available: false, formatValid: false }
  if (mode === 'demo') {
    newUser.email = ''
    newUser.name = ''
  }
}

function toggleUserForm() {
  showForm.value = !showForm.value
  if (showForm.value) {
    userStep.value = 1
    formError.value = ''
  }
}

function closeUserForm() {
  showForm.value = false
  userStep.value = 1
}

function goToUserStep(step: number) {
  if (step === 2 && (!newUser.name.trim() || !newUser.email.trim())) {
    formError.value = 'Preencha nome e e-mail para continuar.'
    return
  }
  formError.value = ''
  userStep.value = step
}

async function checkEmailAvailability() {
  const email = newUser.email.trim().toLowerCase()
  if (!email) {
    emailStatus.value = { message: '', available: false, formatValid: false }
    return
  }
  if (registrationMode.value === 'demo' && !isDemoAssetraEmail(email)) {
    emailStatus.value = {
      message: 'Contas demo devem terminar em @assetra.local',
      available: false,
      formatValid: false,
    }
    return
  }
  if (registrationMode.value === 'google' && isDemoAssetraEmail(email)) {
    emailStatus.value = {
      message: 'Para @assetra.local use o modo Demo.',
      available: false,
      formatValid: false,
    }
    return
  }
  try {
    const result = await inventory.checkUserEmail(email)
    emailStatus.value = {
      message: result.message,
      available: result.available,
      formatValid: result.formatValid,
    }
  } catch {
    emailStatus.value = {
      message: 'Não foi possível verificar o e-mail.',
      available: false,
      formatValid: false,
    }
  }
}

onMounted(async () => {
  void inventory.fetchAssets()
  try {
    departmentOptions.value = await inventory.fetchDepartmentOptions()
  } catch {
    departmentOptions.value = [...DEFAULT_DEPARTMENTS]
  }
  await inventory.fetchUsers()
})

const filteredUsers = computed(() =>
  inventory.users.filter((user) =>
    matchesPageSearch(user.name, user.email, user.role, user.status, user.department),
  ),
)

const addUser = async () => {
  formError.value = ''
  const email = newUser.email.trim().toLowerCase()

  if (registrationMode.value === 'demo') {
    if (!isDemoAssetraEmail(email)) {
      formError.value = 'Contas demo devem usar e-mail @assetra.local.'
      return
    }
    if (newUser.password.length < 8) {
      formError.value = 'A senha deve ter pelo menos 8 caracteres.'
      return
    }
    if (newUser.password !== newUser.confirmPassword) {
      formError.value = 'A confirmação de senha não corresponde.'
      return
    }
  } else if (isDemoAssetraEmail(email)) {
    formError.value = 'Para @assetra.local use o modo Demo.'
    return
  }

  await checkEmailAvailability()
  if (!emailStatus.value.available) {
    formError.value = emailStatus.value.message || 'E-mail indisponível.'
    return
  }

  const department = resolveDepartmentValue(departmentSelect.value, departmentCustom.value)
  if (requiresDepartment.value && !department) {
    formError.value = 'Informe a área/setor do funcionário.'
    return
  }

  try {
    await inventory.createUser({
      name: newUser.name,
      email,
      profile: newUser.profile,
      status: newUser.status,
      department: department || null,
      ...(registrationMode.value === 'demo' ? { password: newUser.password } : {}),
    })
    newUser.name = ''
    newUser.email = ''
    newUser.profile = 'TECNICO'
    newUser.status = 'Ativo'
    departmentSelect.value = 'RH'
    departmentCustom.value = ''
    newUser.password = ''
    newUser.confirmPassword = ''
    registrationMode.value = 'google'
    emailStatus.value = { message: '', available: false, formatValid: false }
    closeUserForm()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Erro ao cadastrar usuário.'
  }
}

const removeUser = async (id: string) => {
  const ok = await confirm.askSensitive(
    'Esta ação remove o utilizador de forma permanente.',
    'Excluir utilizador',
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
  applyEditDepartment(user.department)
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
  try {
    const department = resolveDepartmentValue(editDepartmentSelect.value, editDepartmentCustom.value)
    if (editRequiresDepartment.value && !department) {
      formError.value = 'Informe a área/setor do funcionário.'
      return
    }

    const payload: {
      name: string
      email: string
      profile: string
      status: string
      department: string | null
      password?: string
    } = {
      name: editUser.name,
      email: editUser.email,
      profile: editUser.profile,
      status: editUser.status,
      department: department || null,
    }
    if (editUser.password) payload.password = editUser.password
    await inventory.updateUser(editingUserId.value, payload)
    editingUserId.value = null
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Não foi possível salvar.'
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
.wizard-steps {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
}
.wizard-steps li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-light);
}
.wizard-steps li span {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--bg-primary);
}
.wizard-steps li.active {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-light);
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

.form-group input,
.form-group select,
.form-group :deep(.password-field input) {
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-primary);
}

.form-group :deep(.password-field input) {
  padding-right: 42px;
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

.registration-mode {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-btn {
  flex: 1;
  min-width: 140px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.mode-btn.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.mode-hint {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
}

.email-status {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
}

.email-status.ok { color: #22c55e; }
.email-status.info { color: var(--text-secondary); }
.email-status.warn { color: #f59e0b; }
.email-status.error { color: var(--danger); }

.google-verified {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  font-size: 13px;
}

.account-badge {
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.account-badge.demo {
  background: rgba(107, 114, 128, 0.2);
  color: #9ca3af;
}

.account-badge.google {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
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
  flex-wrap: wrap;
  align-items: flex-start;
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

.user-assets-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.user-assets-toggle:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.user-assets-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 11px;
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
.profile-funcionario { background: rgba(16, 185, 129, 0.15); color: #10b981; }

.label-required {
  color: var(--danger);
  font-weight: 700;
}

.field-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.department-custom {
  margin-top: 8px;
}

.department-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
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
