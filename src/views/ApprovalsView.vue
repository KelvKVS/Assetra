<template>
  <div class="approvals-page">
    <div class="page-header">
      <div>
        <h2>Aprovações</h2>
        <p class="header-sub">
          <span class="header-stat header-stat--warn">{{ pending.length }} pendente{{ pending.length === 1 ? '' : 's' }}</span>
          <span class="header-stat">{{ approvedCount }} aprovada{{ approvedCount === 1 ? '' : 's' }}</span>
          <span class="header-stat">{{ rejectedCount }} reprovada{{ rejectedCount === 1 ? '' : 's' }}</span>
        </p>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-bar">
        <Search :size="18" :stroke-width="2" />
        <input
          v-model.trim="pageSearch"
          type="search"
          placeholder="Buscar ativo, REQ, OS ou solicitante..."
        />
      </div>
      <div class="filter-tabs">
        <button :class="['tab-btn', { active: filter === 'Pendente' }]" @click="filter = 'Pendente'">
          Pendentes
        </button>
        <button :class="['tab-btn', { active: filter === 'all' }]" @click="filter = 'all'">Todas</button>
        <button :class="['tab-btn', { active: filter === 'Aprovada' }]" @click="filter = 'Aprovada'">Aprovadas</button>
        <button :class="['tab-btn', { active: filter === 'Reprovada' }]" @click="filter = 'Reprovada'">Reprovadas</button>
        <span class="filter-sep" aria-hidden="true" />
        <button :class="['tab-btn tab-btn--sm', { active: phaseFilter === 'all' }]" @click="phaseFilter = 'all'">Todas etapas</button>
        <button :class="['tab-btn tab-btn--sm', { active: phaseFilter === 'abertura' }]" @click="phaseFilter = 'abertura'">Abertura</button>
        <button :class="['tab-btn tab-btn--sm', { active: phaseFilter === 'validacao' }]" @click="phaseFilter = 'validacao'">Validação</button>
        <button :class="['tab-btn tab-btn--sm', { active: phaseFilter === 'movimentacao' }]" @click="phaseFilter = 'movimentacao'">Movimentação</button>
      </div>
    </div>

    <p v-if="pageError" class="error-message">{{ pageError }}</p>

    <div class="approvals-list">
      <article
        v-for="item in filteredApprovals"
        :key="item.id"
        :class="['approval-card', `tone-${statusClass(item.status)}`]"
      >
        <div class="card-top">
          <span :class="['phase-chip', `phase-${flowKind(item)}`]">{{ phaseShortLabel(item) }}</span>
          <span :class="['status-badge', `status-${statusClass(item.status)}`]">{{ item.status }}</span>
        </div>

        <h3 class="card-summary">{{ approvalSummary(item) }}</h3>

        <p class="card-meta">
          <span v-if="item.osCode" class="meta-os">{{ item.osCode }}</span>
          <span v-if="item.requestCode">{{ item.requestCode }}</span>
          <span>Ativo {{ item.assetTag }}</span>
          <span v-if="maintenanceDueLabel(item)" class="meta-due">{{ maintenanceDueLabel(item) }}</span>
          <span v-if="item.createdAt">{{ formatWhen(item.createdAt) }}</span>
        </p>

        <p
          v-if="canApprove && item.status === 'Pendente' && !canDecideItem(item)"
          class="action-hint action-hint--blocked"
        >
          {{ decisionBlockReason(item) }}
        </p>

        <div v-if="canApprove && item.status === 'Pendente' && canDecideItem(item)" class="card-pending-actions">
          <p v-if="flowKind(item) === 'opening'" class="action-hint">
            Aprovar cria a ordem de serviço para o técnico executar.
          </p>
          <p v-else-if="flowKind(item) === 'validation'" class="action-hint">
            O técnico enviou relatório e evidências — valide ou peça correção.
          </p>

          <div v-if="needsTechnicianPick(item)" class="assign-block">
            <label><UserCog :size="14" /> Técnico para execução</label>
            <select v-model="technicianPickByApprovalId[item.id]" required>
              <option value="">Selecione o técnico</option>
              <option v-for="tech in technicianUsers" :key="`pick-${tech.id}`" :value="tech.email">
                {{ tech.name }} · {{ tech.email }}
              </option>
            </select>
            <label class="due-label"><CalendarClock :size="14" /> Prazo para conclusão e validação</label>
            <input
              v-model="validationDueByApprovalId[item.id]"
              type="datetime-local"
              class="due-input"
              required
            />
            <p class="action-hint">O técnico vê este prazo na fila de execução e pode pedir adiamento se necessário.</p>
          </div>

          <div
            v-else-if="canSetDueOnMaintenance(item)"
            class="assign-block"
          >
            <label><CalendarClock :size="14" /> Ajustar prazo da ordem</label>
            <input
              v-model="validationDueByMaintenanceId[item.maintenanceId!]"
              type="datetime-local"
              class="due-input"
            />
            <button
              type="button"
              class="action-btn action-btn--outline"
              :disabled="!validationDueByMaintenanceId[item.maintenanceId!]"
              @click="saveMaintenanceDue(item)"
            >
              Guardar prazo
            </button>
          </div>

          <div class="approval-actions">
            <button
              class="action-btn action-btn--approve"
              :disabled="approveDisabled(item)"
              @click="executeDecision(item, 'APPROVED', '')"
            >
              <CheckCircle :size="17" :stroke-width="2.5" />
              {{ approveLabel(item) }}
            </button>
            <button class="action-btn action-btn--reject" @click="openDecisionModal(item, 'REJECTED')">
              <XCircle :size="17" :stroke-width="2.5" />
              {{ rejectLabel(item) }}
            </button>
          </div>

          <div v-if="canReassignValidation(item)" class="reassign-block">
            <label><RotateCcw :size="14" /> Devolver para outro técnico</label>
            <label class="due-label"><MessageSquare :size="14" /> Motivo da devolução</label>
            <textarea
              v-model="returnReasonByApprovalId[item.id]"
              rows="3"
              class="return-reason-input"
              placeholder="Explique o que o técnico deve corrigir ou complementar."
            />
            <div class="reassign-row">
              <select v-model="reassignmentTargetByApprovalId[item.id]">
                <option value="">Selecione o técnico</option>
                <option v-for="tech in technicianUsers" :key="`tech-${tech.id}`" :value="tech.email">
                  {{ tech.name }} · {{ tech.email }}
                </option>
              </select>
              <button
                type="button"
                class="action-btn action-btn--outline"
                :disabled="!reassignmentTargetByApprovalId[item.id]"
                @click="reassignMaintenance(item)"
              >
                Devolver à fila
              </button>
            </div>
            <p v-if="reassignErrorByApprovalId[item.id]" class="form-error inline-error">
              {{ reassignErrorByApprovalId[item.id] }}
            </p>
          </div>
        </div>

        <div class="card-toggle-row">
          <button type="button" class="link-btn" @click="toggleDetails(item.id)">
            <ChevronDown :size="16" :class="{ rotated: expandedDetails[item.id] }" />
            {{ expandedDetails[item.id] ? 'Ocultar detalhes' : 'Ver detalhes' }}
          </button>
          <button
            v-if="relatedSteps(item).length"
            type="button"
            class="link-btn"
            @click="toggleHistory(item.id)"
          >
            <History :size="16" />
            {{ expandedHistory[item.id] ? 'Ocultar etapas' : `Etapas anteriores (${relatedSteps(item).length})` }}
          </button>
        </div>

        <div v-if="expandedDetails[item.id]" class="card-details">
          <p v-if="displayDescription(item)" class="detail-block">
            <strong>Pedido</strong>
            {{ displayDescription(item) }}
          </p>
          <p v-if="item.feedback" class="detail-block">
            <strong>Relatório / observações</strong>
            {{ item.feedback }}
          </p>
          <AttachmentGrid
            v-if="item.attachments?.length"
            :attachments="item.attachments"
            :gallery-title="`${item.assetTag} · anexos`"
            class="approval-attachments"
          />
          <div v-if="item.status === 'Reprovada' && item.notes" class="detail-return">
            <MessageSquare :size="14" />
            <div>
              <strong>Motivo da devolução</strong>
              <p>{{ item.notes }}</p>
            </div>
          </div>
          <div class="detail-meta">
            <span v-if="item.requestedByName"><User :size="12" /> {{ item.requestedByName }}</span>
            <span v-if="item.decidedByName">
              <ShieldCheck :size="12" /> {{ item.status }} por {{ item.decidedByName }}
            </span>
          </div>
        </div>

        <div v-if="expandedHistory[item.id]" class="history-panel">
          <p class="history-title">Histórico desta ordem</p>
          <div v-for="step in relatedSteps(item)" :key="step.id" class="history-step">
            <div class="history-step-top">
              <span :class="['phase-chip', 'phase-chip--sm', `phase-${flowKind(step)}`]">
                {{ phaseShortLabel(step) }}
              </span>
              <span :class="['status-badge', 'status-badge--sm', `status-${statusClass(step.status)}`]">
                {{ step.status }}
              </span>
            </div>
            <p class="history-step-summary">{{ approvalSummary(step) }}</p>
            <p class="history-step-meta">
              <span v-if="step.requestCode">{{ step.requestCode }}</span>
              <span v-if="step.createdAt">{{ formatWhen(step.createdAt) }}</span>
            </p>
          </div>
        </div>
      </article>
    </div>

    <div v-if="filteredApprovals.length === 0" class="empty-state">
      <ClipboardCheck :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>{{ listEmptyState.title }}</h3>
      <p>{{ listEmptyState.description }}</p>
    </div>

    <div v-if="decisionModal.open" class="sheet-overlay" @click="closeDecisionModal">
      <section class="sheet sheet--compact" @click.stop>
        <header class="sheet-header">
          <button type="button" class="sheet-close" aria-label="Fechar" @click="closeDecisionModal">
            <X :size="20" />
          </button>
          <span class="sheet-eyebrow">Decisão</span>
          <h3>{{ decisionModalTitle }}</h3>
          <p v-if="decisionModal.item">
            Ativo <strong>{{ decisionModal.item.assetTag }}</strong>
          </p>
        </header>
        <div class="sheet-body">
          <div class="field">
            <label><MessageSquare :size="14" /> Motivo (obrigatório)</label>
            <textarea
              v-model.trim="decisionModal.notes"
              rows="4"
              :placeholder="decisionModalPlaceholder"
            />
          </div>
          <p v-if="decisionModalError" class="form-error">{{ decisionModalError }}</p>
        </div>
        <footer class="sheet-footer">
          <button type="button" class="btn-ghost" @click="closeDecisionModal">Cancelar</button>
          <button type="button" class="btn-primary" @click="confirmDecision">
            Continuar
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore, type ApprovalRow } from '../stores/inventory'
import { useConfirmAction } from '../composables/useConfirmAction'
import { useLocalPageSearch } from '../composables/useLocalPageSearch'
import AttachmentGrid from '../components/AttachmentGrid.vue'
import {
  Search,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  User,
  ShieldCheck,
  UserCog,
  RotateCcw,
  ChevronDown,
  History,
  CalendarClock,
  MessageSquare,
  X,
} from 'lucide-vue-next'

type ApprovalStatus = 'Pendente' | 'Aprovada' | 'Reprovada'

const authStore = useAuthStore()
const inventory = useInventoryStore()
const confirm = useConfirmAction()

const role = computed(() => authStore.user?.role)
const canApprove = computed(() => role.value === 'ADM' || role.value === 'GESTOR')

onMounted(async () => {
  await Promise.allSettled([
    inventory.fetchApprovalsSafe(),
    inventory.fetchAssets(),
    inventory.fetchUsers(),
    inventory.fetchMaintenances(),
  ])
})

const { pageSearch, matchesPageSearch } = useLocalPageSearch()
const filter = ref<'all' | ApprovalStatus>('Pendente')
const phaseFilter = ref<'all' | 'abertura' | 'validacao' | 'movimentacao'>('all')
const reassignmentTargetByApprovalId = reactive<Record<string, string>>({})
const technicianPickByApprovalId = reactive<Record<string, string>>({})
const validationDueByApprovalId = reactive<Record<string, string>>({})
const validationDueByMaintenanceId = reactive<Record<string, string>>({})
const returnReasonByApprovalId = reactive<Record<string, string>>({})
const reassignErrorByApprovalId = reactive<Record<string, string>>({})
const expandedDetails = reactive<Record<string, boolean>>({})
const expandedHistory = reactive<Record<string, boolean>>({})
const decisionModal = reactive<{
  open: boolean
  item: ApprovalRow | null
  decision: 'APPROVED' | 'REJECTED'
  notes: string
}>({
  open: false,
  item: null,
  decision: 'REJECTED',
  notes: '',
})
const decisionModalError = ref('')
const pageError = ref('')

function resolveRequiredApproverRole(requestedByRole?: string) {
  const r = String(requestedByRole ?? '')
    .trim()
    .toUpperCase()
  if (r === 'FUNCIONARIO' || r === 'TECNICO') return 'GESTOR'
  if (r === 'GESTOR') return 'ADM'
  return 'ADM'
}

function canUserDecideApproval(requiredRole: string, userRole: string) {
  const req = requiredRole.trim().toUpperCase()
  const usr = userRole.trim().toUpperCase()
  if (!req || !usr) return false
  if (usr === 'ADM') return req === 'ADM' || req === 'GESTOR'
  return req === usr
}

function effectiveRequiredRole(item: ApprovalRow) {
  const stored = String(item.requiredApproverRole ?? '').trim().toUpperCase()
  if (stored) return stored
  return resolveRequiredApproverRole(item.requestedByRole)
}

function canDecideItem(item: ApprovalRow) {
  if (!canApprove.value) return false
  if (String(item.requestedBy ?? '') === String(authStore.user?.id ?? '')) return false
  return canUserDecideApproval(
    effectiveRequiredRole(item),
    String(authStore.user?.role ?? ''),
  )
}

function decisionBlockReason(item: ApprovalRow) {
  if (String(item.requestedBy ?? '') === String(authStore.user?.id ?? '')) {
    return 'Não pode decidir a sua própria solicitação. Peça a outro gestor ou administrador.'
  }
  const required = effectiveRequiredRole(item)
  if (required === 'ADM') {
    return 'Esta solicitação exige decisão de um administrador.'
  }
  if (required === 'GESTOR') {
    return 'Esta solicitação exige decisão de um gestor (ou administrador).'
  }
  return 'O seu perfil não pode decidir esta solicitação.'
}

function roleLabelPt(role?: string) {
  const r = String(role ?? '')
    .trim()
    .toUpperCase()
  const map: Record<string, string> = {
    TECNICO: 'técnico',
    GESTOR: 'gestor',
    FUNCIONARIO: 'funcionário',
    ADM: 'administrador',
  }
  return map[r] ?? 'utilizador'
}

function assetDisplayName(tag: string) {
  const t = String(tag ?? '').trim()
  const asset = inventory.assets.find((a) => a.tag === t)
  const desc = String(asset?.description ?? '').trim()
  if (desc) return `«${desc}»`
  return t ? `«${t}»` : 'o ativo indicado'
}

function movementDestination(item: ApprovalRow) {
  const destEmail = String(item.destinationUserEmail ?? '').trim().toLowerCase()
  const destUser = destEmail
    ? inventory.users.find((u) => u.email.toLowerCase() === destEmail)
    : null
  return {
    name: destUser?.name?.trim() || destEmail || 'utilizador indicado',
    role: destUser?.role,
  }
}

function toDatetimeLocalValue(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultDueLocalValue() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  d.setHours(17, 0, 0, 0)
  return toDatetimeLocalValue(d.toISOString())
}

const approvals = computed(() => inventory.approvals)
const technicianUsers = computed(() => inventory.users.filter((u) => u.role === 'TECNICO' && u.status === 'Ativo'))
const pending = computed(() => approvals.value.filter((item) => item.status === 'Pendente'))
const approvedCount = computed(() => approvals.value.filter((item) => item.status === 'Aprovada').length)
const rejectedCount = computed(() => approvals.value.filter((item) => item.status === 'Reprovada').length)

const filteredApprovals = computed(() => {
  let items = approvals.value
  if (filter.value !== 'all') {
    items = items.filter((item) => item.status === filter.value)
  }
  if (phaseFilter.value !== 'all') {
    items = items.filter((item) => resolvePhase(item) === phaseFilter.value)
  }
  return items
    .filter((item) =>
      matchesPageSearch(
        item.type,
        item.assetTag,
        item.description,
        item.status,
        item.requestedByName,
        item.feedback,
        item.requestCode,
        item.osCode,
        item.phaseLabel,
        approvalSummary(item),
      ),
    )
    .sort((a, b) => {
      const da = new Date(a.createdAt ?? 0).getTime()
      const db = new Date(b.createdAt ?? 0).getTime()
      return db - da
    })
})

const hasPageSearch = computed(() => pageSearch.value.trim().length > 0)

const listEmptyState = computed(() => {
  if (hasPageSearch.value) {
    return {
      title: 'Nenhum resultado na pesquisa',
      description: `Não encontrámos aprovações para «${pageSearch.value.trim()}».`,
    }
  }

  const byFilter: Record<'all' | ApprovalStatus, { title: string; description: string }> = {
    all: {
      title: 'Nenhuma solicitação',
      description: 'Quando alguém enviar uma solicitação, ela aparecerá aqui.',
    },
    Pendente: {
      title: 'Nada pendente',
      description: 'Não há decisões à espera neste momento.',
    },
    Aprovada: {
      title: 'Nenhuma aprovada',
      description: 'Ainda não existem solicitações aprovadas para consultar.',
    },
    Reprovada: {
      title: 'Nenhuma reprovada',
      description: 'Não existem solicitações reprovadas.',
    },
  }

  return byFilter[filter.value]
})

type ApprovalFlowKind = 'opening' | 'validation' | 'movement' | 'other'

const resolvePhase = (item: ApprovalRow) => {
  const phase = String(item.approvalPhase ?? '').toLowerCase()
  if (phase) return phase
  if (item.type === 'Movimentação') return 'movimentacao'
  if (/validação de execução técnica/i.test(String(item.description ?? ''))) return 'validacao'
  return 'abertura'
}

const flowKind = (item: ApprovalRow): ApprovalFlowKind => {
  const phase = resolvePhase(item)
  if (phase === 'movimentacao') return 'movement'
  if (phase === 'validacao') return 'validation'
  if (phase === 'abertura') return 'opening'
  return 'other'
}

function phaseShortLabel(item: ApprovalRow) {
  const k = flowKind(item)
  if (k === 'opening') return 'Abertura'
  if (k === 'validation') return 'Validação'
  if (k === 'movement') return 'Movimentação'
  return item.type
}

function approvalSummary(item: ApprovalRow): string {
  const who = item.requestedByName?.trim() || 'Solicitante'
  const asset = item.assetTag
  const phase = flowKind(item)
  const st = item.status

  if (phase === 'movement') {
    const requesterRole = roleLabelPt(item.requestedByRole)
    const assetName = assetDisplayName(asset)
    const dest = movementDestination(item)
    const destRole = roleLabelPt(dest.role)
    const destPart = `${destRole} ${dest.name}`
    if (st === 'Pendente') {
      return `O ${requesterRole} ${who} solicitou a transferência do ativo ${assetName} para o ${destPart}.`
    }
    if (st === 'Aprovada') {
      return `Transferência do ativo ${assetName} para o ${destPart} foi aprovada.`
    }
    return `Transferência do ativo ${assetName} para o ${destPart} foi reprovada.`
  }
  if (phase === 'opening') {
    if (st === 'Pendente') return `${who} pediu abrir manutenção no ativo ${asset}`
    if (st === 'Aprovada') return `Abertura aprovada — ordem de serviço criada no ativo ${asset}`
    return `Abertura reprovada no ativo ${asset}`
  }
  if (phase === 'validation') {
    if (st === 'Pendente') return `${who} concluiu o serviço e aguarda a sua validação no ativo ${asset}`
    if (st === 'Aprovada') return `Serviço validado — manutenção concluída no ativo ${asset}`
    return `Validação reprovada — ativo ${asset} volta para execução técnica`
  }
  if (st === 'Pendente') return `${who} enviou solicitação sobre o ativo ${asset}`
  if (st === 'Aprovada') return `Solicitação sobre ${asset} foi aprovada`
  return `Solicitação sobre ${asset} foi reprovada`
}

function displayDescription(item: ApprovalRow) {
  const raw = String(item.description ?? '')
  if (flowKind(item) === 'validation') {
    return raw.replace(/^Validação de execução técnica\s*-\s*/i, '').trim() || raw
  }
  return raw
}

function relatedSteps(item: ApprovalRow): ApprovalRow[] {
  const mid = String(item.maintenanceId ?? '').trim()
  if (!mid) return []
  return approvals.value
    .filter((a) => String(a.maintenanceId ?? '') === mid && a.id !== item.id)
    .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
}

function formatWhen(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function toggleDetails(id: string) {
  expandedDetails[id] = !expandedDetails[id]
}

function toggleHistory(id: string) {
  expandedHistory[id] = !expandedHistory[id]
}

const needsTechnicianPick = (item: ApprovalRow) =>
  canDecideItem(item) && item.status === 'Pendente' && flowKind(item) === 'opening'

const canSetDueOnMaintenance = (item: ApprovalRow) =>
  canDecideItem(item) &&
  item.status === 'Pendente' &&
  Boolean(item.maintenanceId) &&
  (flowKind(item) === 'validation' || item.maintenanceStatus === 'Em andamento')

function maintenanceDueLabel(item: ApprovalRow) {
  if (!item.maintenanceId) return ''
  const m = inventory.maintenances.find((row) => row.id === item.maintenanceId)
  if (!m?.validationDueDisplay) return ''
  return `Prazo: ${m.validationDueDisplay}`
}

const approveLabel = (item: ApprovalRow) => {
  if (flowKind(item) === 'validation') return 'Validar conclusão'
  if (flowKind(item) === 'opening') return 'Aprovar e abrir OS'
  return 'Aprovar'
}

const rejectLabel = (item: ApprovalRow) => {
  if (flowKind(item) === 'validation') return 'Pedir correção'
  return 'Reprovar'
}

const approveDisabled = (item: ApprovalRow) => {
  if (!needsTechnicianPick(item)) return false
  if (!String(technicianPickByApprovalId[item.id] ?? '').trim()) return true
  return !String(validationDueByApprovalId[item.id] ?? '').trim()
}

watch(
  () => [approvals.value, technicianUsers.value, inventory.maintenances] as const,
  () => {
    for (const item of approvals.value) {
      if (needsTechnicianPick(item) && !validationDueByApprovalId[item.id]) {
        validationDueByApprovalId[item.id] = defaultDueLocalValue()
      }
      if (item.maintenanceId) {
        const m = inventory.maintenances.find((row) => row.id === item.maintenanceId)
        if (m?.validationDueAt && !validationDueByMaintenanceId[item.maintenanceId]) {
          validationDueByMaintenanceId[item.maintenanceId] = toDatetimeLocalValue(m.validationDueAt)
        }
      }
      if (!needsTechnicianPick(item)) continue
      if (technicianPickByApprovalId[item.id]) continue
      const requesterEmail = inventory.users
        .find((u) => u.id === item.requestedBy && u.role === 'TECNICO')
        ?.email?.trim()
        .toLowerCase()
      if (requesterEmail && technicianUsers.value.some((t) => t.email.toLowerCase() === requesterEmail)) {
        technicianPickByApprovalId[item.id] = requesterEmail
      }
    }
  },
  { immediate: true },
)

const decisionModalTitle = computed(() => {
  if (!decisionModal.item) return 'Motivo da decisão'
  return decisionModal.decision === 'REJECTED'
    ? rejectLabel(decisionModal.item)
    : approveLabel(decisionModal.item)
})

const decisionModalPlaceholder = computed(() => {
  if (!decisionModal.item) return 'Descreva o motivo...'
  if (flowKind(decisionModal.item) === 'validation') {
    return 'Ex.: evidências insuficientes, teste não documentado, peça substituída sem foto...'
  }
  return 'Explique por que a solicitação não pode ser aprovada neste momento.'
})

function openDecisionModal(item: ApprovalRow, decision: 'APPROVED' | 'REJECTED') {
  if (decision === 'APPROVED') {
    void executeDecision(item, decision, '')
    return
  }
  decisionModalError.value = ''
  decisionModal.item = item
  decisionModal.decision = decision
  decisionModal.notes = returnReasonByApprovalId[item.id] ?? ''
  decisionModal.open = true
}

function closeDecisionModal() {
  decisionModal.open = false
  decisionModal.item = null
  decisionModal.notes = ''
  decisionModalError.value = ''
}

async function confirmDecision() {
  if (!decisionModal.item) return
  if (decisionModal.notes.trim().length < 3) {
    decisionModalError.value = 'Descreva o motivo com pelo menos 3 caracteres.'
    return
  }
  const item = decisionModal.item
  const decision = decisionModal.decision
  const notes = decisionModal.notes.trim()
  closeDecisionModal()
  await executeDecision(item, decision, notes)
}

async function executeDecision(
  item: ApprovalRow,
  decision: 'APPROVED' | 'REJECTED',
  notes: string,
) {
  pageError.value = ''
  if (!canDecideItem(item)) {
    pageError.value = decisionBlockReason(item)
    return
  }
  if (decision === 'APPROVED' && needsTechnicianPick(item) && approveDisabled(item)) return

  const action = decision === 'APPROVED' ? approveLabel(item).toLowerCase() : rejectLabel(item).toLowerCase()
  const ok = await confirm.askSensitive(
    `Deseja ${action} a solicitação do ativo ${item.assetTag}?`,
    'Confirmar decisão',
  )
  if (!ok) return

  const techEmail =
    decision === 'APPROVED' && needsTechnicianPick(item)
      ? String(technicianPickByApprovalId[item.id] ?? '').trim()
      : undefined

  const dueRaw = needsTechnicianPick(item)
    ? validationDueByApprovalId[item.id]
    : undefined

  try {
    await inventory.respondApproval(item.id, decision, notes || undefined, techEmail, dueRaw)
    if (decision === 'APPROVED') {
      technicianPickByApprovalId[item.id] = ''
      validationDueByApprovalId[item.id] = ''
    } else {
      returnReasonByApprovalId[item.id] = ''
    }
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    pageError.value = ax?.response?.data?.message ?? 'Não foi possível registar a decisão.'
  }
}

const saveMaintenanceDue = async (item: ApprovalRow) => {
  if (!item.maintenanceId) return
  const raw = validationDueByMaintenanceId[item.maintenanceId]
  if (!raw) return
  await inventory.setMaintenanceValidationDue(item.maintenanceId, new Date(raw).toISOString())
}

const canReassignValidation = (item: ApprovalRow) =>
  canDecideItem(item) && item.status === 'Pendente' && flowKind(item) === 'validation'

const reassignMaintenance = async (item: ApprovalRow) => {
  if (!item.maintenanceId) return
  const targetEmail = String(reassignmentTargetByApprovalId[item.id] ?? '')
    .trim()
    .toLowerCase()
  if (!targetEmail) return
  const reason = String(returnReasonByApprovalId[item.id] ?? '').trim()
  if (reason.length < 3) {
    reassignErrorByApprovalId[item.id] = 'Informe o motivo da devolução (mínimo 3 caracteres).'
    return
  }
  reassignErrorByApprovalId[item.id] = ''
  const selectedTech = technicianUsers.value.find((tech) => tech.email.trim().toLowerCase() === targetEmail)
  const notes = `${reason}\n\nEncaminhada para ${selectedTech?.name ?? targetEmail} (${targetEmail}).`
  await inventory.respondApproval(item.id, 'REJECTED', notes)
  await inventory.updateMaintenance(item.maintenanceId, {
    assignedTechnicianEmail: targetEmail,
    status: 'Aberta',
  })
  reassignmentTargetByApprovalId[item.id] = ''
  returnReasonByApprovalId[item.id] = ''
}

const statusClass = (status: string) =>
  status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
</script>

<style scoped>
.approvals-page { animation: fade-up 0.5s ease; max-width: 920px; }

.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 8px; font-size: 28px; font-weight: 700; color: var(--text-primary); }
.header-sub { display: flex; flex-wrap: wrap; gap: 12px; margin: 0; font-size: 13px; }
.header-stat { color: var(--text-secondary); }
.header-stat--warn { color: #f59e0b; font-weight: 700; }

.toolbar { margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }

.search-bar {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 10px;
}
.search-bar:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.search-bar svg { color: var(--text-secondary); flex-shrink: 0; }
.search-bar input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--text-primary); outline: none; }

.filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.filter-sep { width: 1px; height: 20px; background: var(--border-light); margin: 0 4px; }
.tab-btn {
  padding: 8px 14px; background: var(--bg-hover); border: 1px solid var(--border-light);
  border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer;
}
.tab-btn--sm { padding: 6px 10px; font-size: 12px; }
.tab-btn:hover { border-color: var(--primary); }
.tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); }

.approvals-list { display: flex; flex-direction: column; gap: 12px; }

.approval-card {
  background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px;
  padding: 16px 18px; border-left: 4px solid var(--border-light);
}
.approval-card.tone-pendente { border-left-color: #f59e0b; }
.approval-card.tone-aprovada { border-left-color: #22c55e; }
.approval-card.tone-reprovada { border-left-color: #ef4444; }

.card-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }

.phase-chip {
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 4px 10px; border-radius: 999px;
}
.phase-chip--sm { font-size: 10px; padding: 2px 8px; }
.phase-opening { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.phase-validation { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.phase-movement { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.phase-other { background: var(--bg-hover); color: var(--text-secondary); }

.status-badge {
  padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.status-badge--sm { font-size: 10px; padding: 2px 8px; }
.status-pendente { background: rgba(245,158,11,0.15); color: #f59e0b; }
.status-aprovada { background: rgba(34,197,94,0.15); color: #22c55e; }
.status-reprovada { background: rgba(239,68,68,0.15); color: #ef4444; }

.card-summary {
  margin: 0 0 8px; font-size: 16px; font-weight: 700; line-height: 1.35; color: var(--text-primary);
  word-break: normal !important;
  overflow-wrap: break-word;
}

.action-hint--blocked {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
  font-weight: 600;
}

.error-message {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
}

.card-meta {
  display: flex; flex-wrap: wrap; gap: 8px 14px; margin: 0; font-size: 12px; color: var(--text-muted);
}
.meta-os { font-weight: 800; color: var(--primary); letter-spacing: 0.04em; }
.meta-due { font-weight: 600; color: #f59e0b; }
.due-label { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; font-weight: 700; color: var(--text-secondary); }
.due-input {
  width: 100%; margin-top: 4px; padding: 8px 10px; border-radius: 8px;
  border: 1px solid var(--border-light); background: var(--bg-primary); color: var(--text-primary); font-size: 13px;
}

.card-pending-actions {
  margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-light);
  display: flex; flex-direction: column; gap: 10px;
}
.action-hint { margin: 0; font-size: 12px; color: var(--text-secondary); }

.assign-block label, .reassign-block label {
  display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
  color: var(--text-secondary); margin-bottom: 6px;
}
.assign-block select, .reassign-row select {
  width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-light);
  background: var(--bg-primary); color: var(--text-primary); font-size: 13px;
}

.approval-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.action-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px;
  border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none;
}
.action-btn--approve { background: var(--success); color: white; }
.action-btn--approve:disabled { opacity: 0.55; cursor: not-allowed; }
.action-btn--reject { background: var(--danger-light); color: var(--danger); border: 1px solid var(--danger); }
.action-btn--outline {
  background: transparent; color: var(--text-primary); border: 1px solid var(--border-light);
}
.reassign-row { display: flex; gap: 8px; flex-wrap: wrap; }
.reassign-row select { flex: 1; min-width: 180px; }

.card-toggle-row { display: flex; flex-wrap: wrap; gap: 12px 16px; margin-top: 12px; }
.link-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 0; border: none; background: none;
  font-size: 13px; font-weight: 600; color: var(--primary); cursor: pointer;
}
.link-btn svg { transition: transform 0.2s ease; }
.link-btn svg.rotated { transform: rotate(180deg); }

.card-details {
  margin-top: 12px; padding: 12px; border-radius: 10px;
  background: var(--bg-primary); border: 1px solid var(--border-light);
  display: flex; flex-direction: column; gap: 10px;
}
.detail-block { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.45; }
.detail-block strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 4px; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--text-muted); }
.detail-meta span { display: inline-flex; align-items: center; gap: 4px; }

.history-panel {
  margin-top: 12px; padding: 12px; border-radius: 10px;
  border: 1px dashed var(--border-light); background: color-mix(in srgb, var(--primary) 5%, var(--bg-card));
}
.history-title { margin: 0 0 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.history-step { padding: 10px 0; border-top: 1px solid var(--border-light); }
.history-step:first-of-type { border-top: none; padding-top: 0; }
.history-step-top { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.history-step-summary { margin: 0; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.history-step-meta { margin: 4px 0 0; font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; }

.empty-state {
  text-align: center; padding: 48px 24px; color: var(--text-secondary);
}
.empty-icon { color: var(--text-muted); margin-bottom: 12px; }
.empty-state h3 { margin: 0 0 8px; color: var(--text-primary); }

.return-reason-input {
  width: 100%; margin-bottom: 8px; padding: 10px 12px; border-radius: 8px;
  border: 1px solid var(--border-light); background: var(--bg-primary);
  color: var(--text-primary); font-size: 13px; font-family: inherit; resize: vertical;
}
.detail-return {
  display: flex; gap: 10px; padding: 10px 12px; border-radius: 8px;
  background: color-mix(in srgb, #ef4444 10%, var(--bg-primary));
  border: 1px solid color-mix(in srgb, #ef4444 25%, var(--border-light));
  font-size: 13px; color: var(--text-secondary);
}
.detail-return strong { display: block; font-size: 11px; text-transform: uppercase; color: var(--danger); margin-bottom: 4px; }
.detail-return p { margin: 0; line-height: 1.45; color: var(--text-primary); }

.sheet-overlay {
  position: fixed; inset: 0; z-index: 1200; background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px;
}
.sheet {
  width: min(480px, 100%); background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 16px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
}
.sheet-header {
  position: relative; padding: 20px 20px 12px; border-bottom: 1px solid var(--border-light);
}
.sheet-eyebrow { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--primary); }
.sheet-header h3 { margin: 4px 0 6px; font-size: 18px; }
.sheet-header p { margin: 0; font-size: 13px; color: var(--text-secondary); }
.sheet-close {
  position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border: none;
  border-radius: 10px; background: var(--bg-hover); cursor: pointer; display: grid; place-items: center;
}
.sheet-body { padding: 16px 20px; }
.sheet-footer { padding: 12px 20px 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-light); }
.field label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; }
.field textarea { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border-light); background: var(--bg-primary); font-family: inherit; }
.form-error { margin: 8px 0 0; padding: 8px 12px; font-size: 13px; color: var(--danger); background: var(--danger-light); border-radius: 8px; }
.inline-error { margin-top: 8px; }
.btn-ghost { padding: 10px 16px; border: 1px solid var(--border-light); background: transparent; border-radius: 10px; cursor: pointer; }
.btn-primary { padding: 10px 16px; border: none; background: var(--primary); color: #fff; border-radius: 10px; font-weight: 600; cursor: pointer; }
</style>
