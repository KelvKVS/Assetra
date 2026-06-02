<template>
  <div class="invite-page">
    <div class="invite-card">
      <div v-if="state === 'loading'" class="invite-status">
        <Loader2 :size="40" class="spin" />
        <p>Processando…</p>
      </div>

      <div v-else-if="state === 'confirm-ok'" class="invite-status success">
        <CheckCircle :size="48" />
        <h1>Cadastro confirmado</h1>
        <p>
          Obrigado, <strong>{{ resultUserName }}</strong>. Seu cadastro em
          <strong>{{ resultTenantName }}</strong> foi confirmado.
        </p>
        <p v-if="alreadyDone" class="muted">Este link já havia sido utilizado.</p>
        <a v-if="loginUrl" :href="loginUrl" class="btn-primary">Ir para o login</a>
      </div>

      <div v-else-if="state === 'dispute-ok'" class="invite-status warn">
        <AlertTriangle :size="48" />
        <h1>Cadastro contestado</h1>
        <p>
          Registramos que você não reconhece o cadastro em
          <strong>{{ resultTenantName }}</strong>.
        </p>
        <p class="muted">
          O administrador responsável foi notificado por e-mail, quando possível. Se precisar de
          ajuda imediata, entre em contato com quem realizou o cadastro.
        </p>
        <p v-if="alreadyDone" class="muted">Esta contestação já havia sido registrada.</p>
      </div>

      <div v-else class="invite-status error">
        <XCircle :size="48" />
        <h1>Não foi possível concluir</h1>
        <p>{{ errorMessage }}</p>
        <router-link to="/login" class="btn-secondary">Voltar ao login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-vue-next'
import api from '../services/api'

const route = useRoute()

const state = ref<'loading' | 'confirm-ok' | 'dispute-ok' | 'error'>('loading')
const errorMessage = ref('')
const resultUserName = ref('')
const resultTenantName = ref('')
const loginUrl = ref('')
const alreadyDone = ref(false)

onMounted(async () => {
  const token = String(route.query.token ?? '')
  const acao = String(route.query.acao ?? 'confirmar').toLowerCase()

  if (!token || token.length < 10) {
    state.value = 'error'
    errorMessage.value = 'Link inválido ou incompleto.'
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
      loginUrl?: string
      message?: string
    }>(endpoint, { token })

    resultUserName.value = data.userName ?? ''
    resultTenantName.value = data.tenantName ?? ''
    loginUrl.value = data.loginUrl ?? ''
    alreadyDone.value = Boolean(data.alreadyConfirmed || data.alreadyDisputed)

    if (acao === 'contestar') {
      state.value = 'dispute-ok'
    } else {
      state.value = 'confirm-ok'
    }
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    state.value = 'error'
    errorMessage.value = ax?.response?.data?.message ?? 'Link expirado ou inválido.'
  }
})
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
}

.invite-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.35);
}

.invite-status {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.invite-status h1 {
  font-size: 1.35rem;
  margin: 8px 0 0;
  color: #0f172a;
}

.invite-status p {
  color: #475569;
  margin: 0;
  line-height: 1.5;
}

.invite-status.success :deep(svg) {
  color: #16a34a;
}

.invite-status.warn :deep(svg) {
  color: #d97706;
}

.invite-status.error :deep(svg) {
  color: #dc2626;
}

.muted {
  font-size: 0.9rem;
  color: #94a3b8 !important;
}

.spin {
  animation: spin 0.9s linear infinite;
  color: #3b82f6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-primary,
.btn-secondary {
  display: inline-block;
  margin-top: 16px;
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
}
</style>
