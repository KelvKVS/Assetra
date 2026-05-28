<template>
  <div class="integrations-page">
    <header class="hero">
      <div class="hero-text">
        <span class="hero-eyebrow">Administração</span>
        <h2>Integrações externas</h2>
        <p>
          Ligue o Assetra a ERPs, APIs financeiras, RH ou outros sistemas.
          Configure em <strong>3 passos</strong>, teste a conexão e só depois salve.
        </p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <Plug :size="18" />
          <span>Total</span>
          <strong>{{ rows.length }}</strong>
        </div>
        <div class="hero-stat active">
          <Zap :size="18" />
          <span>Ativas</span>
          <strong>{{ activeCount }}</strong>
        </div>
      </div>
    </header>

    <div class="layout">
      <!-- ===== Assistente ===== -->
      <section class="wizard-card">
        <div class="wizard-top">
          <h3>Nova integração</h3>
          <ol class="steps" aria-label="Passos">
            <li v-for="s in 3" :key="s" :class="{ active: step === s, done: step > s }">
              <span>{{ s }}</span>
              {{ stepLabels[s - 1] }}
            </li>
          </ol>
        </div>

        <!-- Modelos rápidos -->
        <div v-if="step === 1" class="templates">
          <p class="templates-title">Comece por um modelo (opcional)</p>
          <div class="template-grid">
            <button
              v-for="tpl in templates"
              :key="tpl.id"
              type="button"
              class="template-card"
              @click="applyTemplate(tpl)"
            >
              <component :is="tpl.icon" :size="22" :stroke-width="2.2" />
              <strong>{{ tpl.label }}</strong>
              <small>{{ tpl.hint }}</small>
            </button>
          </div>
        </div>

        <!-- Passo 1 -->
        <form v-if="step === 1" class="wizard-body" @submit.prevent="goStep(2)">
          <div class="field">
            <label><Tag :size="14" /> Nome da integração</label>
            <input v-model.trim="form.name" type="text" placeholder="Ex.: ERP Financeiro" required />
          </div>

          <div class="field">
            <label><Layers :size="14" /> Categoria</label>
            <div class="kind-grid">
              <button
                v-for="item in kindOptions"
                :key="item.value"
                type="button"
                class="kind-chip"
                :class="{ selected: form.kind === item.value }"
                @click="form.kind = item.value"
              >
                <component :is="item.icon" :size="16" />
                {{ item.label }}
              </button>
            </div>
          </div>

          <div class="wizard-actions">
            <button type="submit" class="btn-primary">Continuar →</button>
          </div>
        </form>

        <!-- Passo 2 -->
        <form v-else-if="step === 2" class="wizard-body" @submit.prevent="goStep(3)">
          <div class="url-preview" :class="{ empty: !fullUrl }">
            <Globe :size="16" />
            <code>{{ fullUrl || 'https://sua-api.com/caminho' }}</code>
          </div>

          <div class="grid-2">
            <div class="field">
              <label>URL base</label>
              <input
                v-model.trim="form.baseUrl"
                type="url"
                placeholder="https://api.empresa.com"
                required
              />
              <p class="field-hint">Domínio da API (sem o caminho final).</p>
            </div>
            <div class="field">
              <label>Caminho / endpoint</label>
              <input
                v-model.trim="form.endpointPath"
                type="text"
                placeholder="/v1/recurso"
              />
              <p class="field-hint">Rota após o domínio. Pode incluir query (?a=1).</p>
            </div>
          </div>

          <div class="wizard-actions">
            <button type="button" class="btn-ghost" @click="goStep(1)">← Voltar</button>
            <button type="submit" class="btn-primary" :disabled="!form.baseUrl.trim()">Continuar →</button>
          </div>
        </form>

        <!-- Passo 3 -->
        <div v-else class="wizard-body">
          <div class="field">
            <label><Shield :size="14" /> Tipo de autenticação</label>
            <div class="auth-grid">
              <button
                v-for="auth in authChoices"
                :key="auth.value"
                type="button"
                class="auth-chip"
                :class="{ selected: form.authType === auth.value }"
                @click="form.authType = auth.value"
              >
                <component :is="auth.icon" :size="18" />
                <span>{{ auth.label }}</span>
              </button>
            </div>
          </div>

          <div v-if="form.authType === 'Bearer'" class="auth-panel">
            <div class="field">
              <label>Token Bearer</label>
              <input
                v-model.trim="form.token"
                type="password"
                placeholder="Cole o token — não fica no código-fonte"
                autocomplete="off"
              />
            </div>
            <p class="field-hint">
              A maioria das APIs REST usa o cabeçalho <code>Authorization: Bearer SEU_TOKEN</code>.
            </p>
          </div>

          <div v-else-if="form.authType === 'ApiKey'" class="auth-panel grid-2">
            <div class="field">
              <label>Nome do cabeçalho</label>
              <input v-model.trim="form.apiKeyHeader" type="text" placeholder="X-API-Key" />
            </div>
            <div class="field">
              <label>Chave</label>
              <input v-model.trim="form.apiKey" type="password" autocomplete="off" />
            </div>
          </div>

          <div v-else-if="form.authType === 'Basic'" class="auth-panel grid-2">
            <div class="field">
              <label>Utilizador</label>
              <input v-model.trim="form.username" type="text" autocomplete="off" />
            </div>
            <div class="field">
              <label>Senha</label>
              <input v-model.trim="form.password" type="password" autocomplete="new-password" />
            </div>
          </div>

          <div v-else-if="form.authType === 'OAuth2'" class="auth-panel grid-2">
            <div class="field">
              <label>Client ID</label>
              <input v-model.trim="form.clientId" type="text" autocomplete="off" />
            </div>
            <div class="field">
              <label>Client Secret</label>
              <input v-model.trim="form.clientSecret" type="password" autocomplete="off" />
            </div>
            <div class="field span-2">
              <label>Access Token <span class="opt">(se já tiver)</span></label>
              <input v-model.trim="form.token" type="password" autocomplete="off" />
            </div>
          </div>

          <div v-else-if="form.authType === 'Custom'" class="auth-panel">
            <div class="field">
              <label>JSON de credenciais</label>
              <textarea
                v-model.trim="form.customJson"
                rows="4"
                placeholder='{"token":"...","headerName":"Authorization","prefix":"Bearer"}'
              />
            </div>
            <p class="field-hint">Apenas o objeto JSON — não cole o código <code>fetch</code> inteiro.</p>
          </div>

          <p v-else class="field-hint">API pública ou rede interna sem credenciais.</p>

          <details class="advanced">
            <summary>Opções avançadas</summary>
            <div class="field">
              <label>Cabeçalhos HTTP extra (JSON)</label>
              <textarea
                v-model.trim="form.extraHeadersJson"
                rows="2"
                placeholder='{"Accept":"application/json"}'
              />
            </div>
            <div class="field">
              <label>Notas internas</label>
              <textarea v-model.trim="form.notes" rows="2" placeholder="Documentação, contacto..." />
            </div>
            <label class="switch">
              <input v-model="form.active" type="checkbox" />
              <span>Ativar assim que salvar</span>
            </label>
          </details>

          <div v-if="testResult" class="test-result" :class="testResult.ok ? 'ok' : 'fail'">
            <component :is="testResult.ok ? CheckCircle : AlertCircle" :size="18" />
            <div>
              <strong>{{ testResult.message }}</strong>
              <small>HTTP {{ testResult.status }} · {{ testResult.url }}</small>
              <pre v-if="testResult.preview">{{ formatPreview(testResult.preview) }}</pre>
            </div>
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <div class="wizard-actions">
            <button type="button" class="btn-ghost" @click="goStep(2)">← Voltar</button>
            <button type="button" class="btn-secondary" :disabled="testing" @click="testConnection">
              <Loader2 v-if="testing" :size="16" class="spin" />
              <FlaskConical v-else :size="16" />
              {{ testing ? 'A testar...' : 'Testar conexão' }}
            </button>
            <button type="button" class="btn-primary" :disabled="saving" @click="createRow">
              {{ saving ? 'A guardar...' : 'Guardar integração' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ===== Lista ===== -->
      <aside class="list-card">
        <div class="list-head">
          <h3>Integrações guardadas</h3>
          <button v-if="rows.length" type="button" class="btn-ghost-sm" @click="fetchRows">Atualizar</button>
        </div>

        <p v-if="loading" class="muted">A carregar...</p>
        <div v-else-if="!rows.length" class="empty">
          <Unplug :size="36" :stroke-width="1.5" />
          <p>Nenhuma integração ainda.</p>
          <small>Use o assistente ao lado para criar a primeira.</small>
        </div>

        <ul v-else class="integration-list">
          <li v-for="row in rows" :key="row.id" class="integration-item">
            <div class="item-icon" :class="row.active ? 'on' : 'off'">
              <component :is="kindIcon(row.kind)" :size="18" />
            </div>
            <div class="item-body">
              <div class="item-title">
                <strong>{{ row.name }}</strong>
                <span class="status-pill" :class="row.active ? 'on' : 'off'">
                  {{ row.active ? 'Ativa' : 'Inativa' }}
                </span>
              </div>
              <small>{{ kindLabel(row.kind) }} · {{ authTypeLabel(row.authType) }}</small>
              <small class="endpoint">{{ endpointLabel(row) }}</small>
            </div>
            <div class="item-actions">
              <button type="button" class="icon-btn" title="Testar" :disabled="testingId === row.id" @click="testSaved(row)">
                <Loader2 v-if="testingId === row.id" :size="16" class="spin" />
                <FlaskConical v-else :size="16" />
              </button>
              <button type="button" class="icon-btn" :title="row.active ? 'Desativar' : 'Ativar'" @click="toggle(row)">
                <Power :size="16" />
              </button>
              <button type="button" class="icon-btn danger" title="Excluir" @click="removeRow(row.id)">
                <Trash2 :size="16" />
              </button>
            </div>
          </li>
        </ul>

        <p v-if="listTestMessage" class="list-test-msg" :class="listTestOk ? 'ok' : 'fail'">{{ listTestMessage }}</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  FlaskConical,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Plug,
  Power,
  Shield,
  Tag,
  Trash2,
  Unplug,
  UserRound,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import api from '../services/api'

type IntegrationKind = 'FINANCE' | 'HR' | 'PROCUREMENT' | 'HELPDESK' | 'SSO' | 'BI' | 'MONITORING'
type AuthType = 'None' | 'Bearer' | 'Basic' | 'ApiKey' | 'OAuth2' | 'Custom'

type Integration = {
  id: string
  name: string
  kind: IntegrationKind
  baseUrl: string
  endpointPath?: string
  authType: AuthType
  hasSecrets: boolean
  active: boolean
}

type TestResult = {
  ok: boolean
  status: number
  statusText?: string
  url: string
  message: string
  preview?: unknown
}

const stepLabels = ['Identificação', 'Endereço da API', 'Autenticação']

const kindOptions: Array<{ value: IntegrationKind; label: string; icon: Component }> = [
  { value: 'FINANCE', label: 'Financeiro', icon: Wallet },
  { value: 'HR', label: 'RH', icon: UserRound },
  { value: 'PROCUREMENT', label: 'Compras', icon: Tag },
  { value: 'HELPDESK', label: 'Chamados', icon: Wrench },
  { value: 'SSO', label: 'SSO', icon: Lock },
  { value: 'BI', label: 'BI', icon: BarChart3 },
  { value: 'MONITORING', label: 'Monitoramento', icon: Zap },
]

const authChoices: Array<{ value: AuthType; label: string; icon: Component }> = [
  { value: 'Bearer', label: 'Bearer', icon: Shield },
  { value: 'ApiKey', label: 'API Key', icon: KeyRound },
  { value: 'Basic', label: 'Basic', icon: Lock },
  { value: 'OAuth2', label: 'OAuth2', icon: KeyRound },
  { value: 'None', label: 'Nenhuma', icon: Globe },
  { value: 'Custom', label: 'JSON', icon: Layers },
]

const templates = [
  {
    id: 'bearer',
    label: 'API REST + Bearer',
    hint: 'Token no cabeçalho Authorization',
    icon: Shield,
    preset: { authType: 'Bearer' as AuthType, kind: 'FINANCE' as IntegrationKind },
  },
  {
    id: 'apikey',
    label: 'API Key em header',
    hint: 'Ex.: X-API-Key',
    icon: KeyRound,
    preset: { authType: 'ApiKey' as AuthType, kind: 'FINANCE' as IntegrationKind },
  },
  {
    id: 'public',
    label: 'API pública',
    hint: 'Sem credenciais',
    icon: Globe,
    preset: { authType: 'None' as AuthType, kind: 'MONITORING' as IntegrationKind },
  },
]

const rows = ref<Integration[]>([])
const step = ref(1)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testingId = ref<string | null>(null)
const error = ref('')
const testResult = ref<TestResult | null>(null)
const listTestMessage = ref('')
const listTestOk = ref(false)

const form = reactive({
  name: '',
  kind: 'FINANCE' as IntegrationKind,
  baseUrl: '',
  endpointPath: '',
  authType: 'Bearer' as AuthType,
  token: '',
  apiKey: '',
  apiKeyHeader: 'X-API-Key',
  username: '',
  password: '',
  clientId: '',
  clientSecret: '',
  customJson: '',
  extraHeadersJson: '',
  notes: '',
  active: true,
})

const activeCount = computed(() => rows.value.filter((r) => r.active).length)

const fullUrl = computed(() => {
  const base = form.baseUrl.trim().replace(/\/+$/, '')
  const path = form.endpointPath.trim()
  if (!base) return ''
  if (!path) return base
  if (path.startsWith('http')) return path
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
})

function kindLabel(kind: IntegrationKind) {
  return kindOptions.find((i) => i.value === kind)?.label ?? kind
}

function kindIcon(kind: IntegrationKind) {
  return kindOptions.find((i) => i.value === kind)?.icon ?? Plug
}

function authTypeLabel(type: AuthType) {
  const map: Record<AuthType, string> = {
    None: 'Sem auth',
    Bearer: 'Bearer',
    Basic: 'Basic',
    ApiKey: 'API Key',
    OAuth2: 'OAuth2',
    Custom: 'JSON',
  }
  return map[type] ?? type
}

function endpointLabel(row: Integration) {
  const base = String(row.baseUrl ?? '').trim()
  const path = String(row.endpointPath ?? '').trim()
  if (base && path) return `${base}${path.startsWith('/') ? '' : '/'}${path}`
  if (base) return base
  return row.hasSecrets ? 'Credenciais guardadas' : '—'
}

function formatPreview(preview: unknown) {
  if (typeof preview === 'string') return preview
  try {
    return JSON.stringify(preview, null, 2)
  } catch {
    return String(preview)
  }
}

function applyTemplate(tpl: (typeof templates)[0]) {
  form.authType = tpl.preset.authType
  form.kind = tpl.preset.kind
}

function goStep(n: number) {
  if (n === 2 && !form.name.trim()) {
    error.value = 'Informe o nome da integração.'
    return
  }
  if (n === 3 && !form.baseUrl.trim()) {
    error.value = 'Informe a URL base da API.'
    return
  }
  error.value = ''
  testResult.value = null
  step.value = n
}

function parseExtraHeaders(raw: string) {
  if (!raw.trim()) return undefined
  try {
    return JSON.parse(raw) as Record<string, string>
  } catch {
    throw new Error('Cabeçalhos extra: JSON inválido.')
  }
}

function buildAuthConfig(): Record<string, string> {
  if (form.authType === 'Bearer') {
    return form.token ? { token: form.token } : {}
  }
  if (form.authType === 'ApiKey') {
    const cfg: Record<string, string> = {}
    if (form.apiKey) cfg.apiKey = form.apiKey
    if (form.apiKeyHeader) cfg.apiKeyHeader = form.apiKeyHeader
    return cfg
  }
  if (form.authType === 'Basic') {
    const cfg: Record<string, string> = {}
    if (form.username) cfg.username = form.username
    if (form.password) cfg.password = form.password
    return cfg
  }
  if (form.authType === 'OAuth2') {
    const cfg: Record<string, string> = {}
    if (form.clientId) cfg.clientId = form.clientId
    if (form.clientSecret) cfg.clientSecret = form.clientSecret
    if (form.token) cfg.accessToken = form.token
    return cfg
  }
  if (form.authType === 'Custom' && form.customJson.trim()) {
    return JSON.parse(form.customJson) as Record<string, string>
  }
  return {}
}

function buildPayload() {
  return {
    name: form.name,
    kind: form.kind,
    baseUrl: form.baseUrl || '',
    endpointPath: form.endpointPath || undefined,
    authType: form.authType,
    authConfig: buildAuthConfig(),
    extraHeaders: parseExtraHeaders(form.extraHeadersJson),
    notes: form.notes || undefined,
    active: form.active,
  }
}

function resetWizard() {
  step.value = 1
  form.name = ''
  form.baseUrl = ''
  form.endpointPath = ''
  form.kind = 'FINANCE'
  form.authType = 'Bearer'
  form.token = ''
  form.apiKey = ''
  form.apiKeyHeader = 'X-API-Key'
  form.username = ''
  form.password = ''
  form.clientId = ''
  form.clientSecret = ''
  form.customJson = ''
  form.extraHeadersJson = ''
  form.notes = ''
  form.active = true
  testResult.value = null
  error.value = ''
}

async function fetchRows() {
  loading.value = true
  try {
    const { data } = await api.get<Integration[]>('/admin-integrations')
    rows.value = data
  } finally {
    loading.value = false
  }
}

async function testConnection() {
  testing.value = true
  error.value = ''
  testResult.value = null
  try {
    const payload = buildPayload()
    const { data } = await api.post<TestResult>('/admin-integrations/test', payload)
    testResult.value = data
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    error.value = ax?.response?.data?.message ?? 'Falha ao testar a conexão.'
  } finally {
    testing.value = false
  }
}

async function testSaved(row: Integration) {
  testingId.value = row.id
  listTestMessage.value = ''
  try {
    const { data } = await api.post<TestResult>(`/admin-integrations/${row.id}/test`, {})
    listTestOk.value = data.ok
    listTestMessage.value = `${row.name}: ${data.message} (HTTP ${data.status})`
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    listTestOk.value = false
    listTestMessage.value = ax?.response?.data?.message ?? `Falha ao testar ${row.name}.`
  } finally {
    testingId.value = null
  }
}

async function createRow() {
  if (!form.name.trim()) {
    error.value = 'Informe o nome.'
    goStep(1)
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = buildPayload()
    const hasSecrets = Object.values(payload.authConfig).some((v) => String(v).trim())
    if (!form.baseUrl.trim() && !hasSecrets && form.authType !== 'None') {
      throw new Error('Preencha URL ou credenciais antes de guardar.')
    }
    await api.post('/admin-integrations', payload)
    resetWizard()
    await fetchRows()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    error.value =
      e instanceof Error ? e.message : ax?.response?.data?.message ?? 'Não foi possível guardar.'
  } finally {
    saving.value = false
  }
}

async function toggle(row: Integration) {
  await api.patch(`/admin-integrations/${row.id}`, { active: !row.active })
  await fetchRows()
}

async function removeRow(id: string) {
  if (!confirm('Excluir esta integração?')) return
  await api.delete(`/admin-integrations/${id}`)
  await fetchRows()
}

onMounted(() => {
  void fetchRows()
})
</script>

<style scoped>
.integrations-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fade-up 0.25s ease;
}

.hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px;
  border-radius: 16px;
  border: 1px solid var(--border-light);
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, var(--bg-card)), var(--bg-card));
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--primary);
}

.hero-text h2 { margin: 6px 0 8px; font-size: 28px; font-weight: 700; }
.hero-text p { margin: 0; max-width: 560px; color: var(--text-secondary); line-height: 1.5; font-size: 14px; }

.hero-stats { display: flex; gap: 12px; align-items: stretch; }
.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
}
.hero-stat strong { font-size: 26px; color: var(--text-primary); line-height: 1; }
.hero-stat.active { border-color: color-mix(in srgb, var(--primary) 40%, var(--border-light)); }

.layout {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 16px;
  align-items: start;
}

.wizard-card,
.list-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 18px;
}

.wizard-top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.wizard-top h3 { margin: 0; font-size: 18px; }

.steps {
  display: flex;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}
.steps li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-light);
}
.steps li span {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--bg-primary);
}
.steps li.active {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-light);
}
.steps li.done { color: var(--text-secondary); }

.templates { margin-bottom: 16px; }
.templates-title { margin: 0 0 10px; font-size: 13px; color: var(--text-muted); }
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
.template-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, transform 0.15s;
}
.template-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.template-card strong { font-size: 13px; color: var(--text-primary); }
.template-card small { font-size: 11px; color: var(--text-muted); line-height: 1.35; }

.wizard-body { display: flex; flex-direction: column; gap: 14px; }

.field label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
}
.field-hint code { font-size: 11px; }

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.span-2 { grid-column: 1 / -1; }

.url-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  color: var(--primary);
}
.url-preview.empty { color: var(--text-muted); }
.url-preview code {
  font-size: 12px;
  word-break: break-all;
  color: inherit;
}

.kind-grid,
.auth-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.kind-chip,
.auth-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.kind-chip.selected,
.auth-chip.selected {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

.auth-panel {
  padding: 14px;
  border-radius: 12px;
  border: 1px dashed var(--border-light);
  background: color-mix(in srgb, var(--bg-primary) 90%, var(--primary) 10%);
}

.advanced {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
}
.advanced summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.advanced[open] { padding-bottom: 14px; }
.advanced .field { margin-top: 12px; }

.switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.test-result {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
}
.test-result.ok {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #16a34a;
}
.test-result.fail {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
}
.test-result strong { display: block; margin-bottom: 4px; }
.test-result small { display: block; opacity: 0.85; word-break: break-all; }
.test-result pre {
  margin: 8px 0 0;
  padding: 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
  font-size: 11px;
  max-height: 160px;
  overflow: auto;
  white-space: pre-wrap;
  color: var(--text-primary);
}

.wizard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.btn-primary,
.btn-secondary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn-primary {
  background: var(--primary);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}
.btn-secondary {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-light);
  color: var(--text-secondary);
}
.btn-ghost-sm {
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled,
.btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }

.form-error { color: var(--danger); font-size: 13px; margin: 0; }

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.list-head h3 { margin: 0; font-size: 16px; }

.empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-muted);
}
.empty p { margin: 10px 0 4px; font-weight: 600; color: var(--text-secondary); }

.integration-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.integration-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
}
.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.item-icon.on {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.item-icon.off {
  background: var(--bg-card);
  color: var(--text-muted);
}
.item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.item-body small { font-size: 11px; color: var(--text-muted); }
.item-body .endpoint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.status-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
}
.status-pill.on { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-pill.off { background: var(--bg-card); color: var(--text-muted); }

.item-actions { display: flex; gap: 6px; flex-shrink: 0; }
.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.icon-btn:hover { border-color: var(--primary); color: var(--primary); }
.icon-btn.danger:hover { border-color: var(--danger); color: var(--danger); }

.list-test-msg {
  margin-top: 12px;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 8px;
}
.list-test-msg.ok { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
.list-test-msg.fail { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

.muted { color: var(--text-muted); font-size: 13px; }
.opt { font-weight: 500; color: var(--text-muted); }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 960px) {
  .layout { grid-template-columns: 1fr; }
  .grid-2 { grid-template-columns: 1fr; }
  .hero { padding: 18px; }
}
</style>
