<template>
  <Teleport to="body">
    <div v-if="open" class="profile-overlay" @click.self="close">
      <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <header class="profile-header">
          <h3 id="profile-title">O meu perfil</h3>
          <button type="button" class="profile-close" aria-label="Fechar" @click="close">
            <X :size="18" :stroke-width="2.5" />
          </button>
        </header>

        <div v-if="user" class="profile-body">
          <div class="avatar-block">
            <div class="avatar-ring">
              <img v-if="avatarDisplayUrl" :src="avatarDisplayUrl" :alt="`Foto de ${user.name}`" />
              <span v-else class="avatar-fallback">{{ initial }}</span>
            </div>
            <p class="avatar-hint">Só você pode alterar a sua foto de perfil.</p>
            <div class="avatar-actions">
              <label class="btn-upload">
                <Camera :size="16" :stroke-width="2.5" />
                {{ uploading ? 'A enviar...' : 'Alterar foto' }}
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  class="hidden-input"
                  :disabled="uploading"
                  @change="onFilePicked"
                />
              </label>
              <button
                v-if="user.avatarUrl"
                type="button"
                class="btn-remove"
                :disabled="uploading"
                @click="removePhoto"
              >
                Remover
              </button>
            </div>
            <p v-if="error" class="profile-error">{{ error }}</p>
          </div>

          <section
            ref="passwordSectionRef"
            class="password-section"
            :class="{ 'password-section--highlight': highlightPassword }"
          >
            <h4 class="password-section-title">
              <Lock :size="16" :stroke-width="2.5" />
              Senha de acesso
            </h4>
            <p class="password-section-lead">
              Usada apenas para <strong>confirmar ações sensíveis</strong> no Assetra (excluir, aprovar).
              Não altera o login com Google.
            </p>
            <div v-if="!passwordFormVisible" class="password-cta">
              <button type="button" class="btn-password-cta" @click="openPasswordForm">
                {{ passwordCtaLabel }}
              </button>
              <button
                v-if="user.hasConfirmationPassword"
                type="button"
                class="btn-password-link"
                @click="openPasswordFormForgot"
              >
                Esqueceu a sua senha?
              </button>
            </div>
            <p v-else-if="passwordForgotHint" class="password-forgot-hint">{{ passwordForgotHint }}</p>
            <form v-if="passwordFormVisible" class="password-form" @submit.prevent="savePassword">
              <div v-if="user.hasConfirmationPassword" class="password-field">
                <label>Senha atual</label>
                <PasswordInput
                  v-model="passwordForm.currentPassword"
                  autocomplete="current-password"
                  placeholder="Senha atual"
                  :disabled="savingPassword"
                />
              </div>
              <div class="password-field">
                <label>{{ user.hasConfirmationPassword ? 'Nova senha' : 'Criar senha' }}</label>
                <PasswordInput
                  v-model="passwordForm.newPassword"
                  autocomplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  :disabled="savingPassword"
                />
              </div>
              <div class="password-field">
                <label>Confirmar senha</label>
                <PasswordInput
                  v-model="passwordForm.confirmPassword"
                  autocomplete="new-password"
                  placeholder="Repita a senha"
                  :disabled="savingPassword"
                />
              </div>
              <p v-if="passwordError" class="profile-error">{{ passwordError }}</p>
              <div class="password-form-actions">
                <button type="button" class="btn-password-cancel" :disabled="savingPassword" @click="closePasswordForm">
                  Cancelar
                </button>
                <button type="submit" class="btn-save-password" :disabled="savingPassword">
                  {{ savingPassword ? 'A guardar...' : user.hasConfirmationPassword ? 'Atualizar senha' : 'Criar senha de acesso' }}
                </button>
              </div>
            </form>
          </section>

          <dl class="info-list">
            <div>
              <dt>Nome</dt>
              <dd>{{ user.name }}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{{ user.email }}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>
                <span :class="['role-pill', `role-${user.role.toLowerCase()}`]">{{ roleLabel }}</span>
              </dd>
            </div>
            <div v-if="user.department">
              <dt>Área / setor</dt>
              <dd>{{ user.department }}</dd>
            </div>
            <div v-if="user.tenant">
              <dt>Organização</dt>
              <dd>{{ user.tenant.name }} <span class="tenant-slug">({{ user.tenant.slug }})</span></dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Camera, Lock, X } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore } from '../stores/inventory'
import { roleLabelPt } from '../utils/roleLabels'
import { resolveMediaUrl } from '../utils/mediaUrl'
import PasswordInput from './PasswordInput.vue'
import { useToast } from '../composables/useToast'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    focusPassword?: boolean
  }>(),
  { focusPassword: false },
)

const authStore = useAuthStore()
const inventory = useInventoryStore()
const toast = useToast()

const uploading = ref(false)
const savingPassword = ref(false)
const error = ref('')
const passwordError = ref('')
const passwordFormVisible = ref(false)
const passwordForgotHint = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const passwordSectionRef = ref<HTMLElement | null>(null)

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const highlightPassword = ref(false)

const user = computed(() => authStore.user)
const initial = computed(() => user.value?.name?.charAt(0).toUpperCase() ?? 'U')
const roleLabel = computed(() => roleLabelPt(user.value?.role))
const avatarDisplayUrl = computed(() => resolveMediaUrl(user.value?.avatarUrl ?? '') || '')

const passwordCtaLabel = computed(() =>
  user.value?.hasConfirmationPassword ? 'Quer mudar a sua senha?' : 'Criar senha de acesso',
)

function resetPasswordForm() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordError.value = ''
}

function openPasswordForm() {
  passwordForgotHint.value = ''
  passwordFormVisible.value = true
  highlightPassword.value = true
}

function openPasswordFormForgot() {
  passwordForgotHint.value =
    'Defina uma nova senha abaixo. Se não se lembra da senha atual, peça apoio ao administrador da organização.'
  passwordFormVisible.value = true
  highlightPassword.value = true
  void nextTick(() => {
    passwordSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function closePasswordForm() {
  passwordFormVisible.value = false
  passwordForgotHint.value = ''
  resetPasswordForm()
  highlightPassword.value = false
}

watch(open, async (isOpen) => {
  if (isOpen) {
    error.value = ''
    resetPasswordForm()
    passwordForgotHint.value = ''
    passwordFormVisible.value = props.focusPassword || !user.value?.hasConfirmationPassword
    highlightPassword.value = props.focusPassword
    if (props.focusPassword || !user.value?.hasConfirmationPassword) {
      await nextTick()
      passwordSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  } else {
    highlightPassword.value = false
    passwordFormVisible.value = false
    passwordForgotHint.value = ''
  }
})

watch(
  () => props.focusPassword,
  async (v) => {
    if (v && open.value) {
      highlightPassword.value = true
      passwordFormVisible.value = true
      await nextTick()
      passwordSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  },
)

const close = () => {
  if (uploading.value) return
  open.value = false
}

const onFilePicked = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = 'Selecione uma imagem (PNG, JPG, WEBP ou GIF).'
    return
  }

  uploading.value = true
  error.value = ''
  try {
    const uploaded = await inventory.uploadAttachments([file])
    const filename = uploaded[0]?.filename
    if (!filename) {
      throw new Error('Upload sem ficheiro.')
    }
    const hadAvatar = Boolean(user.value?.avatarUrl)
    await authStore.updateAvatar(filename)
    toast.success(hadAvatar ? 'Foto de perfil alterada com sucesso.' : 'Foto de perfil enviada com sucesso.')
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    error.value = ax?.response?.data?.message ?? 'Não foi possível atualizar a foto.'
  } finally {
    uploading.value = false
  }
}

const savePassword = async () => {
  passwordError.value = ''
  if (passwordForm.newPassword.length < 8) {
    passwordError.value = 'A senha deve ter pelo menos 8 caracteres.'
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'A confirmação não corresponde à nova senha.'
    return
  }
  if (user.value?.hasConfirmationPassword && !passwordForm.currentPassword.trim()) {
    passwordError.value = 'Informe a senha atual.'
    return
  }
  savingPassword.value = true
  const wasNew = !user.value?.hasConfirmationPassword
  try {
    await authStore.updateMyPassword({
      currentPassword: user.value?.hasConfirmationPassword
        ? passwordForm.currentPassword
        : undefined,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    })
    toast.success(
      wasNew
        ? 'Senha de acesso criada com sucesso. Já pode confirmar ações sensíveis.'
        : 'Senha de acesso alterada com sucesso.',
    )
    resetPasswordForm()
    passwordFormVisible.value = false
    passwordForgotHint.value = ''
    highlightPassword.value = false
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    passwordError.value = ax?.response?.data?.message ?? 'Não foi possível guardar a senha.'
  } finally {
    savingPassword.value = false
  }
}

const removePhoto = async () => {
  uploading.value = true
  error.value = ''
  try {
    await authStore.removeAvatar()
    toast.success('Foto de perfil removida.')
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    error.value = ax?.response?.data?.message ?? 'Não foi possível remover a foto.'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.profile-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px))
    max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  overflow-y: auto;
}

.profile-modal {
  width: min(440px, 100%);
  max-height: min(92dvh, calc(100dvh - 32px));
  overflow-y: auto;
  margin: auto;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 55%),
    var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
  animation: profile-pop 0.22s ease-out;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 0;
}

.profile-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-close {
  border: none;
  background: var(--bg-hover);
  color: var(--text-muted);
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.profile-close:hover {
  color: var(--text-primary);
  background: var(--bg-primary);
}

.profile-body {
  padding: 20px 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.avatar-ring {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--primary);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25);
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-ring img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 40px;
  font-weight: 800;
  color: #fff;
}

.avatar-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  max-width: 280px;
}

.avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-upload:hover {
  background: var(--primary-hover);
}

.hidden-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.btn-remove {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-remove:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}

.btn-remove:disabled,
.btn-upload:has(input:disabled) {
  opacity: 0.65;
  cursor: not-allowed;
}

.profile-error {
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--danger);
  background: var(--danger-light);
  border-radius: 8px;
  border-left: 3px solid var(--danger);
}

.password-cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.btn-password-cta {
  padding: 10px 14px;
  border: 1px solid var(--primary);
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.btn-password-cta:hover {
  background: var(--primary);
  color: #fff;
}

.btn-password-link {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: underline;
  cursor: pointer;
}

.btn-password-link:hover {
  color: var(--primary);
}

.password-forgot-hint {
  margin: 0 0 10px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
  background: var(--bg-hover);
  border-radius: 8px;
}

.password-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.btn-password-cancel {
  padding: 10px 14px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-password-cancel:hover:not(:disabled) {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.btn-password-cancel:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.password-section {
  padding: 14px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-primary);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.password-section--highlight {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.password-section-title {
  margin: 0 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.password-section-lead {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.password-field label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.btn-save-password {
  flex: 1;
  min-width: 140px;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn-save-password:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-save-password:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.info-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-list > div {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
}

.info-list > div:last-child {
  border-bottom: none;
}

.info-list dt {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.info-list dd {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  word-break: break-word;
}

.tenant-slug {
  color: var(--text-muted);
  font-size: 12px;
}

.role-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.role-adm { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.role-gestor { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.role-tecnico { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.role-funcionario { background: rgba(16, 185, 129, 0.15); color: #10b981; }

@keyframes profile-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 480px) {
  .info-list > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
