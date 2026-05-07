<template>
  <div class="approvals-page">
    <div class="page-header">
      <div>
        <h2>Aprovações</h2>
        <p class="muted">Revise solicitações pendentes e tome decisão. Toda decisão exige confirmação por senha.</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card stat-warning">
        <Clock :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Pendentes</span>
          <span class="stat-value">{{ pending.length }}</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <CheckCircle :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Aprovadas</span>
          <span class="stat-value">{{ approvedCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-danger">
        <XCircle :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Reprovadas</span>
          <span class="stat-value">{{ rejectedCount }}</span>
        </div>
      </div>
    </div>

    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por tipo, ativo, descrição ou solicitante..." />
    </div>

    <div class="filter-tabs">
      <button :class="['tab-btn', { active: filter === 'all' }]" @click="filter = 'all'">Todas</button>
      <button :class="['tab-btn', { active: filter === 'Pendente' }]" @click="filter = 'Pendente'">Pendentes</button>
      <button :class="['tab-btn', { active: filter === 'Aprovada' }]" @click="filter = 'Aprovada'">Aprovadas</button>
      <button :class="['tab-btn', { active: filter === 'Reprovada' }]" @click="filter = 'Reprovada'">Reprovadas</button>
    </div>

    <div class="approvals-grid">
      <div v-for="item in filteredApprovals" :key="item.id" class="approval-card">
        <div class="approval-header">
          <span :class="['type-badge', `type-${typeClass(item.type)}`]">
            <component :is="typeIcon(item.type)" :size="16" :stroke-width="2.5" />
            {{ item.type }}
          </span>
          <span :class="['status-badge', `status-${statusClass(item.status)}`]">
            {{ item.status }}
          </span>
        </div>

        <div class="approval-body">
          <div class="approval-asset">
            <Package :size="18" :stroke-width="2" />
            <div>
              <h4>{{ item.assetTag }}</h4>
              <p>{{ item.description }}</p>
            </div>
          </div>

          <div v-if="item.feedback" class="approval-feedback">
            <MessageSquare :size="14" :stroke-width="2" />
            <p>{{ item.feedback }}</p>
          </div>

          <div v-if="item.attachments && item.attachments.length" class="approval-attachments">
            <span class="att-title"><Paperclip :size="13" /> Anexos</span>
            <div class="att-grid">
              <a
                v-for="(att, idx) in item.attachments"
                :key="idx"
                :href="att.url"
                target="_blank"
                rel="noopener"
                class="att-item"
              >
                <img v-if="isImage(att.mimetype)" :src="att.url" :alt="att.originalName ?? att.filename" />
                <FileText v-else :size="22" />
                <span class="att-name">{{ att.originalName ?? att.filename }}</span>
              </a>
            </div>
          </div>

          <div class="approval-meta">
            <span v-if="item.requestedByName"><User :size="12" /> {{ item.requestedByName }}</span>
            <span v-if="item.requiredApproverRole">
              <ShieldCheck :size="12" />
              Aprovação: {{ item.requiredApproverRole }}
            </span>
            <span v-if="item.decidedByName">
              <ShieldCheck :size="12" />
              {{ item.status }} por {{ item.decidedByName }}
            </span>
          </div>
        </div>

        <div v-if="canApprove && item.status === 'Pendente'" class="approval-actions">
          <button class="btn-approve" @click="setStatus(item, 'APPROVED')">
            <CheckCircle :size="16" :stroke-width="2.5" />
            Aprovar
          </button>
          <button class="btn-reject" @click="setStatus(item, 'REJECTED')">
            <XCircle :size="16" :stroke-width="2.5" />
            Reprovar
          </button>
        </div>
      </div>
    </div>

    <div v-if="filteredApprovals.length === 0" class="empty-state">
      <ClipboardCheck :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhuma aprovação encontrada</h3>
      <p>Nada para revisar no momento.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore, type ApprovalRow } from '../stores/inventory'
import { useConfirmAction } from '../composables/useConfirmAction'
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  ClipboardCheck,
  ArrowRightLeft,
  Wrench,
  Paperclip,
  MessageSquare,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-vue-next'

type ApprovalStatus = 'Pendente' | 'Aprovada' | 'Reprovada'

const authStore = useAuthStore()
const inventory = useInventoryStore()
const confirm = useConfirmAction()

const role = computed(() => authStore.user?.role)
const canApprove = computed(() => role.value === 'ADM' || role.value === 'GESTOR')

onMounted(async () => {
  await Promise.allSettled([inventory.fetchApprovalsSafe(), inventory.fetchAssets()])
})

const search = ref('')
const filter = ref<'all' | ApprovalStatus>('all')

const approvals = computed(() => inventory.approvals)
const pending = computed(() => approvals.value.filter((item) => item.status === 'Pendente'))
const approvedCount = computed(() => approvals.value.filter((item) => item.status === 'Aprovada').length)
const rejectedCount = computed(() => approvals.value.filter((item) => item.status === 'Reprovada').length)

const filteredApprovals = computed(() => {
  let items = approvals.value
  if (filter.value !== 'all') {
    items = items.filter((item) => item.status === filter.value)
  }
  const term = search.value.toLowerCase()
  if (!term) return items
  return items.filter((item) =>
    [
      item.type,
      item.assetTag,
      item.description,
      item.status,
      item.requestedByName ?? '',
      item.feedback ?? '',
    ].some((value) => String(value).toLowerCase().includes(term)),
  )
})

const setStatus = async (item: ApprovalRow, decision: 'APPROVED' | 'REJECTED') => {
  const action = decision === 'APPROVED' ? 'aprovar' : 'reprovar'
  const ok = await confirm.ask(
    `Confirme com a sua senha para ${action} a solicitação ${item.assetTag}.`,
    `Confirmar ${action}`,
  )
  if (!ok) return
  await inventory.respondApproval(item.id, decision)
}

const typeClass = (type: string) =>
  type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')

const statusClass = (status: string) =>
  status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')

const typeIcon = (type: string): Component => (type.includes('Moviment') ? ArrowRightLeft : Wrench)

const isImage = (mime?: string) => Boolean(mime && mime.startsWith('image/'))
</script>

<style scoped>
.approvals-page { animation: fade-up 0.5s ease; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.page-header h2 { margin: 0 0 4px; font-size: 28px; font-weight: 700; color: var(--text-primary); }
.page-header p { margin: 0; font-size: 14px; color: var(--text-secondary); max-width: 720px; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; background: var(--primary); color: white;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease;
}
.btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
.btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }

.btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; background: var(--bg-hover); color: var(--text-primary);
  border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
}

.form-card {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-md);
}
.form-card h3 { margin: 0 0 16px; font-size: 18px; font-weight: 700; color: var(--text-primary); }
.approval-form { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; display: flex; gap: 8px; align-items: center; }
.form-group .hint { font-weight: 500; color: var(--text-muted); text-transform: none; letter-spacing: 0; }
.form-group input, .form-group select, .form-group textarea {
  padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-light);
  border-radius: 8px; color: var(--text-primary); font-size: 14px; font-family: inherit;
}
.form-group textarea { resize: vertical; min-height: 70px; }

.picked-list { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 6px; }
.picked-list li {
  display: grid; grid-template-columns: 16px 1fr auto auto; gap: 8px; align-items: center;
  padding: 8px 10px; background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: 8px;
  font-size: 13px; color: var(--text-secondary);
}
.picked-name { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.picked-remove { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; }
.picked-remove:hover { color: var(--danger); background: var(--danger-light); }

.form-error {
  margin: 0; padding: 8px 12px; background: var(--danger-light); color: var(--danger);
  border-left: 3px solid var(--danger); border-radius: 8px; font-size: 13px; font-weight: 500;
}

.form-actions { display: flex; gap: 12px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s ease; }
.stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.stat-icon { color: var(--primary); }
.stat-card.stat-success .stat-icon { color: var(--success); }
.stat-card.stat-warning .stat-icon { color: var(--warning); }
.stat-card.stat-danger .stat-icon { color: var(--danger); }
.stat-content { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--text-primary); }

.search-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 10px; margin-bottom: 16px; transition: all 0.2s ease; }
.search-bar:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.search-bar svg { color: var(--text-secondary); flex-shrink: 0; }
.search-bar input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--text-primary); outline: none; }

.filter-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.tab-btn {
  padding: 8px 16px; background: var(--bg-hover); border: 1px solid var(--border-light);
  border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;
}
.tab-btn:hover { background: var(--bg-card); border-color: var(--primary); }
.tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); }

.approvals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }

.approval-card {
  background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px;
  padding: 20px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 14px;
}
.approval-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--primary); }

.approval-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }

.type-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.type-movimentacao { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.type-manutencao { background: rgba(168, 85, 247, 0.15); color: #a855f7; }

.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.status-pendente { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status-aprovada { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-reprovada { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.approval-body { display: flex; flex-direction: column; gap: 12px; }

.approval-asset { display: flex; align-items: center; gap: 12px; }
.approval-asset svg { color: var(--primary); flex-shrink: 0; }
.approval-asset h4 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.approval-asset p { margin: 2px 0 0; font-size: 13px; color: var(--text-secondary); }

.approval-feedback {
  display: grid; grid-template-columns: 16px 1fr; gap: 8px;
  padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: 8px;
  color: var(--text-secondary); font-size: 13px; line-height: 1.4;
}
.approval-feedback svg { margin-top: 2px; color: var(--text-muted); }
.approval-feedback p { margin: 0; }

.approval-attachments { display: flex; flex-direction: column; gap: 8px; }
.att-title { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.att-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.att-item {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  padding: 6px; background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: 8px;
  text-decoration: none; color: var(--text-muted); font-size: 11px; min-height: 80px;
  transition: all 0.2s ease;
}
.att-item:hover { border-color: var(--primary); color: var(--text-primary); transform: translateY(-2px); }
.att-item img { width: 100%; height: 60px; object-fit: cover; border-radius: 4px; }
.att-name { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }

.approval-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--text-muted); }
.approval-meta span { display: inline-flex; gap: 6px; align-items: center; }

.approval-actions { display: flex; gap: 10px; padding-top: 12px; border-top: 1px solid var(--border-light); }

.btn-approve, .btn-reject {
  display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1;
  padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 0.2s ease;
}
.btn-approve { background: var(--success-light); color: var(--success); border: 1px solid rgba(34,197,94,0.3); }
.btn-approve:hover { background: var(--success); color: white; border-color: var(--success); }
.btn-reject { background: var(--danger-light); color: var(--danger); border: 1px solid rgba(239,68,68,0.3); }
.btn-reject:hover { background: var(--danger); color: white; border-color: var(--danger); }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-icon { margin-bottom: 16px; opacity: 0.3; }
.empty-state h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--text-secondary); }
.empty-state p { margin: 0; font-size: 14px; }

.spinner { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
