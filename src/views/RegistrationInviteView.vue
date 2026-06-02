<template>
  <div class="invite-page">
    <div class="invite-shell">
      <header class="invite-brand">
        <div class="invite-logo">
          <Box :size="36" stroke-width="1.5" />
        </div>
        <span class="invite-brand-name">Assetra</span>
      </header>

      <div class="invite-card">
        <div v-if="state === 'loading'" class="invite-body invite-body--center">
          <div class="invite-icon invite-icon--loading">
            <Loader2 :size="36" class="spin" />
          </div>
          <h1 class="invite-title">A processar o seu pedido</h1>
          <p class="invite-text">Aguarde um momento…</p>
        </div>

        <div v-else-if="state === 'confirm-ok'" class="invite-body invite-body--center">
          <div class="invite-icon invite-icon--success">
            <CheckCircle :size="40" stroke-width="1.75" />
          </div>
          <h1 class="invite-title">Cadastro confirmado</h1>
          <p class="invite-text">
            Obrigado<strong v-if="resultUserName">, {{ resultUserName }}</strong>.
            O seu acesso à organização
            <strong v-if="resultTenantName"> {{ resultTenantName }}</strong>
            está confirmado.
          </p>
          <p v-if="alreadyDone" class="invite-note">Este link já tinha sido utilizado anteriormente.</p>
          <p class="invite-hint">
            No primeiro acesso, utilize <strong>Entrar com Google</strong> com o mesmo e-mail do convite.
          </p>
          <RouterLink to="/login" class="invite-btn invite-btn--primary">
            <LogIn :size="20" />
            Ir para o login
          </RouterLink>
        </div>

        <div v-else-if="state === 'dispute-ok'" class="invite-body invite-body--center">
          <div class="invite-icon invite-icon--warn">
            <AlertTriangle :size="40" stroke-width="1.75" />
          </div>
          <h1 class="invite-title">Cadastro contestado</h1>
          <p class="invite-text">
            Registámos que não reconhece o cadastro
            <strong v-if="resultTenantName"> em {{ resultTenantName }}</strong>.
            O administrador foi notificado.
          </p>
          <p v-if="alreadyDone" class="invite-note">Esta contestação já tinha sido registada.</p>
          <RouterLink to="/login" class="invite-btn invite-btn--secondary">
            Voltar ao login
          </RouterLink>
        </div>

        <div v-else class="invite-body invite-body--center">
          <div class="invite-icon invite-icon--error">
            <XCircle :size="40" stroke-width="1.75" />
          </div>
          <h1 class="invite-title">Não foi possível concluir</h1>
          <p class="invite-text">{{ errorMessage }}</p>
          <RouterLink to="/login" class="invite-btn invite-btn--primary">
            <LogIn :size="20" />
            Ir para o login
          </RouterLink>
        </div>
      </div>

      <p class="invite-footer">Gestão de ativos de tecnologia</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AlertTriangle, Box, CheckCircle, Loader2, LogIn, XCircle } from 'lucide-vue-next'
import api from '../services/api'

const route = useRoute()

const state = ref<'loading' | 'confirm-ok' | 'dispute-ok' | 'error'>('loading')
const errorMessage = ref('')
const resultUserName = ref('')
const resultTenantName = ref('')
const alreadyDone = ref(false)

onMounted(async () => {
  const token = String(route.query.token ?? '')
  const acao = String(route.query.acao ?? 'confirmar').toLowerCase()

  if (!token || token.length < 10) {
    state.value = 'error'
    errorMessage.value = 'Link inválido ou incompleto. Peça um novo convite ao administrador.'
    return
  }

  const endpoint =
    acao === 'contestar'
      ? '/auth/registration-invite/dispute'
      : '/auth/registration-invite/confirm'

  try {
    const { data } = await api.post<{
      ok: boolean
      alreadyConfirmed?: boolean
      alreadyDisputed?: boolean
      userName?: string
      tenantName?: string
      message?: string
    }>(endpoint, { token })

    resultUserName.value = data.userName ?? ''
    resultTenantName.value = data.tenantName ?? ''
    alreadyDone.value = Boolean(data.alreadyConfirmed || data.alreadyDisputed)

    state.value = acao === 'contestar' ? 'dispute-ok' : 'confirm-ok'
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    state.value = 'error'
    errorMessage.value = ax?.response?.data?.message ?? 'Link expirado ou inválido.'
  }
})
</script>

<style scoped>
.invite-page {
  flex: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(20px, 5vw, 40px);
  box-sizing: border-box;
  background:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59, 130, 246, 0.35), transparent),
    radial-gradient(ellipse 60% 50% at 100% 100%, rgba(139, 92, 246, 0.2), transparent),
    linear-gradient(165deg, #0b1220 0%, #0f172a 42%, #1e293b 100%);
}

.invite-shell {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.invite-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.invite-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #60a5fa;
}

.invite-brand-name {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f8fafc;
}

.invite-card {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  padding: clamp(28px, 6vw, 40px) clamp(24px, 5vw, 36px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 25px 50px -12px rgba(0, 0, 0, 0.45);
}

.invite-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invite-body--center {
  align-items: center;
  text-align: center;
}

.invite-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.invite-icon--loading {
  background: var(--primary-light);
  color: var(--primary);
}

.invite-icon--success {
  background: var(--success-light);
  color: var(--success);
}

.invite-icon--warn {
  background: var(--warning-light);
  color: var(--warning);
}

.invite-icon--error {
  background: var(--danger-light);
  color: var(--danger);
}

.invite-title {
  margin: 0;
  font-size: clamp(1.25rem, 4vw, 1.5rem);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.invite-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 32ch;
}

.invite-note,
.invite-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-muted);
  max-width: 34ch;
}

.invite-hint {
  margin-top: 4px;
}

.invite-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  width: 100%;
  max-width: 280px;
  box-sizing: border-box;
}

.invite-btn--primary {
  background: var(--primary);
  color: #fff;
  border: none;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
}

.invite-btn--primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.invite-btn--secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}

.invite-btn--secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.invite-footer {
  margin: 0;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.75);
  letter-spacing: 0.02em;
}

.spin {
  animation: spin 0.85s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .invite-card {
    border-radius: 16px;
  }

  .invite-btn {
    max-width: none;
  }
}
</style>
