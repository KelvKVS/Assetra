<template>
  <Teleport to="body">
    <div v-if="open" class="pcm-overlay" @click.self="cancel">
      <div class="pcm-modal" role="dialog" aria-modal="true">
        <header class="pcm-header">
          <ShieldCheck :size="22" :stroke-width="2.5" />
          <div>
            <h3>{{ title }}</h3>
            <p class="pcm-subtitle">{{ message }}</p>
          </div>
          <button type="button" class="pcm-close" @click="cancel" aria-label="Fechar">
            <X :size="18" :stroke-width="2.5" />
          </button>
        </header>

        <form class="pcm-form" @submit.prevent="confirm">
          <input
            type="text"
            name="username"
            :value="authStore.user?.email ?? ''"
            autocomplete="username"
            class="pcm-hidden-username"
            tabindex="-1"
            aria-hidden="true"
            readonly
          />
          <label>
            <Lock :size="14" :stroke-width="2.5" />
            Senha do utilizador
          </label>
          <input
            ref="inputEl"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Digite a sua senha"
            :disabled="loading"
            required
          />
          <p v-if="error" class="pcm-error">{{ error }}</p>

          <div class="pcm-actions">
            <button type="button" class="pcm-btn-ghost" :disabled="loading" @click="cancel">
              Cancelar
            </button>
            <button type="submit" class="pcm-btn-primary" :disabled="loading || !password">
              <Loader v-if="loading" class="pcm-spinner" :size="16" />
              <Check v-else :size="16" :stroke-width="2.5" />
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Check, Loader, Lock, ShieldCheck, X } from 'lucide-vue-next'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message?: string
  }>(),
  {
    title: 'Confirmar com a sua senha',
    message: 'Esta ação requer a sua senha atual para ser executada.',
  },
)

const emit = defineEmits<{
  (e: 'confirmed'): void
  (e: 'cancel'): void
}>()

const password = ref('')
const error = ref('')
const loading = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (val) => {
    if (val) {
      password.value = ''
      error.value = ''
      loading.value = false
      await nextTick()
      inputEl.value?.focus()
    }
  },
)

const cancel = () => {
  if (loading.value) return
  emit('cancel')
}

const confirm = async () => {
  if (!password.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.post('/auth/verify-password', { password: password.value })
    if (data?.ok) {
      emit('confirmed')
    } else {
      error.value = 'Senha incorreta.'
    }
  } catch (e: unknown) {
    const ax = e as { response?: { status?: number; data?: { message?: string } } }
    if (ax?.response?.status === 401) {
      error.value = 'Senha incorreta.'
    } else {
      error.value = ax?.response?.data?.message ?? 'Não foi possível verificar a senha.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.pcm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: pcm-fade 0.18s ease-out;
}

.pcm-modal {
  width: min(420px, 92%);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
  animation: pcm-pop 0.22s ease-out;
}

.pcm-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 12px;
  margin-bottom: 16px;
}

.pcm-header > svg {
  color: var(--primary);
  margin-top: 4px;
}

.pcm-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.pcm-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.pcm-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.pcm-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.pcm-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pcm-hidden-username {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.pcm-form label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pcm-form input {
  padding: 11px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pcm-form input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.pcm-error {
  margin: 0;
  padding: 8px 12px;
  background: var(--danger-light);
  color: var(--danger);
  border-radius: 8px;
  border-left: 3px solid var(--danger);
  font-size: 13px;
  font-weight: 500;
}

.pcm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

.pcm-btn-ghost {
  padding: 10px 16px;
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.pcm-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.pcm-btn-primary:disabled,
.pcm-btn-ghost:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.pcm-spinner {
  animation: pcm-spin 0.9s linear infinite;
}

@keyframes pcm-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pcm-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pcm-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
