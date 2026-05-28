<template>
  <div class="integrations-page">
    <div class="page-header">
      <div>
        <h2>Integrações</h2>
        <p class="muted">
          Configure APIs externas com URL, token, chave, OAuth ou JSON personalizado — o Assetra guarda as credenciais de forma segura.
        </p>
      </div>
    </div>

    <section class="card">
      <h3>Cadastrar integração</h3>
      <div class="form-grid">
        <label>
          Nome
          <input v-model.trim="form.name" type="text" placeholder="ERP Corporativo" required />
        </label>
        <label>
          Tipo
          <select v-model="form.kind">
            <option v-for="item in kindOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>
          URL base <span class="optional">(opcional)</span>
          <input v-model.trim="form.baseUrl" type="url" placeholder="https://api.empresa.com" />
        </label>
        <label>
          Caminho / endpoint <span class="optional">(opcional)</span>
          <input v-model.trim="form.endpointPath" type="text" placeholder="/v1/custos" />
        </label>
        <label>
          Autenticação
          <select v-model="form.authType">
            <option v-for="item in authTypeOptions" :key="item" :value="item">{{ authTypeLabel(item) }}</option>
          </select>
        </label>
      </div>

      <div v-if="form.authType === 'Bearer'" class="auth-fields">
        <label>
          Token Bearer
          <input v-model.trim="form.token" type="password" placeholder="cole o token da API" autocomplete="off" />
        </label>
      </div>

      <div v-else-if="form.authType === 'ApiKey'" class="auth-fields auth-fields-grid">
        <label>
          Nome do cabeçalho
          <input v-model.trim="form.apiKeyHeader" type="text" placeholder="X-API-Key" />
        </label>
        <label>
          Chave da API
          <input v-model.trim="form.apiKey" type="password" placeholder="cole a chave" autocomplete="off" />
        </label>
      </div>

      <div v-else-if="form.authType === 'Basic'" class="auth-fields auth-fields-grid">
        <label>
          Utilizador
          <input v-model.trim="form.username" type="text" autocomplete="off" />
        </label>
        <label>
          Senha
          <input v-model.trim="form.password" type="password" autocomplete="new-password" />
        </label>
      </div>

      <div v-else-if="form.authType === 'OAuth2'" class="auth-fields auth-fields-grid">
        <label>
          Client ID
          <input v-model.trim="form.clientId" type="text" autocomplete="off" />
        </label>
        <label>
          Client Secret
          <input v-model.trim="form.clientSecret" type="password" autocomplete="off" />
        </label>
        <label class="span-2">
          Access Token <span class="optional">(opcional neste passo)</span>
          <input v-model.trim="form.token" type="password" autocomplete="off" />
        </label>
      </div>

      <div v-else-if="form.authType === 'Custom'" class="auth-fields">
        <label>
          Configuração JSON (credenciais / parâmetros)
          <textarea
            v-model.trim="form.customJson"
            rows="4"
            placeholder='{"token":"...","apiKey":"...","headerName":"X-Custom-Key"}'
          />
        </label>
      </div>

      <p v-else-if="form.authType === 'None'" class="hint">
        Sem autenticação — use apenas quando a API for pública ou interna na rede corporativa.
      </p>

      <label class="span-full">
        Cabeçalhos HTTP extra <span class="optional">(JSON opcional)</span>
        <textarea
          v-model.trim="form.extraHeadersJson"
          rows="2"
          placeholder='{"X-Tenant":"default","Accept":"application/json"}'
        />
      </label>

      <label class="span-full">
        Notas internas
        <textarea v-model.trim="form.notes" rows="2" placeholder="Documentação, contacto do fornecedor, etc." />
      </label>

      <label class="switch span-full">
        <input v-model="form.active" type="checkbox" />
        <span>Ativar integração agora</span>
      </label>

      <div class="actions">
        <button class="btn-primary" :disabled="saving" @click="createRow">
          {{ saving ? 'Salvando...' : 'Salvar integração' }}
        </button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="card">
      <h3>Integrações configuradas</h3>
      <p v-if="loading" class="muted">Carregando...</p>
      <p v-else-if="!rows.length" class="muted">Nenhuma integração cadastrada.</p>
      <div v-else class="list">
        <article v-for="row in rows" :key="row.id" class="row">
          <div class="row-main">
            <strong>{{ row.name }}</strong>
            <small>{{ kindLabel(row.kind) }} · {{ authTypeLabel(row.authType) }}</small>
            <small>{{ endpointLabel(row) }}</small>
            <span v-if="row.hasSecrets" class="badge">Credenciais guardadas</span>
          </div>
          <div class="row-actions">
            <button class="btn-toggle" @click="toggle(row)">{{ row.active ? 'Desativar' : 'Ativar' }}</button>
            <button class="btn-danger" @click="removeRow(row.id)">Excluir</button>
          </div>
        </article>
      </div>
    </section>

    <section class="card">
      <h3>Exemplos de integrações futuras</h3>
      <div class="future-grid">
        <article v-for="future in futureIdeas" :key="future.title" class="future-item">
          <strong>{{ future.title }}</strong>
          <p>{{ future.description }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
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

const kindOptions: Array<{ value: IntegrationKind; label: string }> = [
  { value: 'FINANCE', label: 'Financeiro / ERP' },
  { value: 'HR', label: 'RH / Colaboradores' },
  { value: 'PROCUREMENT', label: 'Compras / Suprimentos' },
  { value: 'HELPDESK', label: 'Service Desk / Chamados' },
  { value: 'SSO', label: 'Identidade / SSO' },
  { value: 'BI', label: 'BI / Analytics' },
  { value: 'MONITORING', label: 'Monitoramento' },
]

const authTypeOptions: AuthType[] = ['Bearer', 'ApiKey', 'OAuth2', 'Basic', 'None', 'Custom']

const futureIdeas = [
  { title: 'Financeiro (ERP)', description: 'Custos de manutenção, centro de custo e orçamentos por ativo.' },
  { title: 'RH', description: 'Sincronizar utilizadores, áreas e movimentações por admissão/desligamento.' },
  { title: 'Compras', description: 'Vincular solicitações de compra e ciclo de vida de equipamentos.' },
  { title: 'Service Desk', description: 'Criar/manter chamados automaticamente a partir das manutenções.' },
  { title: 'SSO', description: 'Login corporativo com políticas de acesso centralizadas.' },
  { title: 'BI', description: 'Enviar dados de inventário para painéis executivos externos.' },
]

const rows = ref<Integration[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

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

function kindLabel(kind: IntegrationKind) {
  return kindOptions.find((item) => item.value === kind)?.label ?? kind
}

function authTypeLabel(type: AuthType) {
  const map: Record<AuthType, string> = {
    None: 'Sem autenticação',
    Bearer: 'Bearer Token',
    Basic: 'Basic Auth',
    ApiKey: 'API Key',
    OAuth2: 'OAuth2',
    Custom: 'Personalizado (JSON)',
  }
  return map[type] ?? type
}

function endpointLabel(row: Integration) {
  const base = String(row.baseUrl ?? '').trim()
  const path = String(row.endpointPath ?? '').trim()
  if (base && path) return `${base}${path.startsWith('/') ? '' : '/'}${path}`
  if (base) return base
  if (path) return path
  return row.hasSecrets ? 'Somente credenciais (sem URL)' : 'Sem endpoint definido'
}

function parseExtraHeaders(raw: string) {
  if (!raw.trim()) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed
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
    const parsed = JSON.parse(form.customJson) as Record<string, string>
    return parsed
  }
  return {}
}

function resetForm() {
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

async function createRow() {
  if (!form.name.trim()) {
    error.value = 'Informe o nome da integração.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const authConfig = buildAuthConfig()
    const extraHeaders = parseExtraHeaders(form.extraHeadersJson)
    const hasUrl = Boolean(form.baseUrl.trim() || form.endpointPath.trim())
    const hasSecrets = Object.values(authConfig).some((v) => String(v).trim())
    if (!hasUrl && !hasSecrets && form.authType !== 'None') {
      throw new Error('Informe URL/endpoint ou credenciais (token/chave) para salvar.')
    }
    await api.post('/admin-integrations', {
      name: form.name,
      kind: form.kind,
      baseUrl: form.baseUrl || '',
      endpointPath: form.endpointPath || undefined,
      authType: form.authType,
      authConfig,
      extraHeaders,
      notes: form.notes || undefined,
      active: form.active,
    })
    resetForm()
    await fetchRows()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    error.value =
      e instanceof Error
        ? e.message
        : ax?.response?.data?.message ?? 'Não foi possível salvar a integração.'
  } finally {
    saving.value = false
  }
}

async function toggle(row: Integration) {
  await api.patch(`/admin-integrations/${row.id}`, { active: !row.active })
  await fetchRows()
}

async function removeRow(id: string) {
  await api.delete(`/admin-integrations/${id}`)
  await fetchRows()
}

onMounted(() => {
  void fetchRows()
})
</script>

<style scoped>
.integrations-page { display: flex; flex-direction: column; gap: 16px; animation: fade-up 0.25s ease; }
.page-header h2 { margin: 0; }
.card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 12px; }
.auth-fields { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; padding: 12px; border: 1px dashed var(--border-light); border-radius: 10px; background: var(--bg-primary); }
.auth-fields-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.span-2 { grid-column: span 2; }
.span-full { grid-column: 1 / -1; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary); }
.optional { font-weight: 500; color: var(--text-muted); font-size: 11px; }
input, select, textarea { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-light); background: var(--bg-primary); color: var(--text-primary); font-family: inherit; }
.switch { flex-direction: row; align-items: center; gap: 8px; }
.hint { margin: 0 0 12px; font-size: 13px; color: var(--text-muted); }
.actions { margin-top: 4px; display: flex; }
.btn-primary { border: none; background: var(--primary); color: #fff; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.list { display: grid; gap: 10px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--border-light); border-radius: 10px; padding: 12px; }
.row-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.row-main small { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { align-self: flex-start; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 8px; border-radius: 999px; background: rgba(34,197,94,0.15); color: #22c55e; }
.row-actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-toggle, .btn-danger { border-radius: 8px; padding: 8px 10px; cursor: pointer; border: 1px solid var(--border-light); background: var(--bg-primary); color: var(--text-primary); }
.btn-danger { border-color: rgba(239,68,68,0.35); color: var(--danger); }
.future-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.future-item { border: 1px dashed var(--border-light); border-radius: 10px; padding: 12px; }
.future-item p { margin: 6px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.4; }
.error { margin-top: 8px; color: var(--danger); }
.muted { color: var(--text-muted); }
@media (max-width: 640px) {
  .span-2 { grid-column: auto; }
}
</style>
