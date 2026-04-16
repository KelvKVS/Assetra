<template>
  <div class="approvals-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Aprovações do Gestor</h2>
        <p class="muted">Solicitações pendentes de aprovação para movimentações e manutenções</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card stat-warning">
        <Clock :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Total pendente</span>
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

    <!-- Search Bar -->
    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por tipo, ativo ou descrição..." />
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button :class="['tab-btn', { active: filter === 'all' }]" @click="filter = 'all'">Todas</button>
      <button :class="['tab-btn', { active: filter === 'Pendente' }]" @click="filter = 'Pendente'">Pendentes</button>
      <button :class="['tab-btn', { active: filter === 'Aprovada' }]" @click="filter = 'Aprovada'">Aprovadas</button>
      <button :class="['tab-btn', { active: filter === 'Reprovada' }]" @click="filter = 'Reprovada'">Reprovadas</button>
    </div>

    <!-- Approvals Grid -->
    <div class="approvals-grid">
      <div v-for="item in filteredApprovals" :key="item.id" class="approval-card">
        <div class="approval-header">
          <div class="approval-type">
            <span :class="['type-badge', `type-${typeClass(item.type)}`]">
              <component :is="typeIcon(item.type)" :size="16" :stroke-width="2.5" />
              {{ item.type }}
            </span>
          </div>
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
        </div>
        <div v-if="item.status === 'Pendente'" class="approval-actions">
          <button class="btn-approve" @click="setStatus(item.id, 'Aprovada')">
            <CheckCircle :size="16" :stroke-width="2.5" />
            Aprovar
          </button>
          <button class="btn-reject" @click="setStatus(item.id, 'Reprovada')">
            <XCircle :size="16" :stroke-width="2.5" />
            Reprovar
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredApprovals.length === 0" class="empty-state">
      <ClipboardCheck :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhuma aprovação encontrada</h3>
      <p>Não há solicitações pendentes no momento</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  ClipboardCheck,
  ArrowRightLeft,
  Wrench,
} from 'lucide-vue-next'

type ApprovalStatus = 'Pendente' | 'Aprovada' | 'Reprovada'
type ApprovalItem = {
  id: number
  type: 'Movimentação' | 'Manutenção'
  assetTag: string
  description: string
  status: ApprovalStatus
}

const approvals = ref<ApprovalItem[]>([
  { id: 1, type: 'Movimentação', assetTag: 'AST-001', description: 'Transferência para Financeiro', status: 'Pendente' },
  { id: 2, type: 'Manutenção', assetTag: 'AST-003', description: 'Troca de placa de vídeo', status: 'Pendente' },
  { id: 3, type: 'Movimentação', assetTag: 'AST-010', description: 'Retorno para Estoque', status: 'Aprovada' },
])

const search = ref('')
const filter = ref<'all' | ApprovalStatus>('all')

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
    [item.type, item.assetTag, item.description, item.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const setStatus = (id: number, status: ApprovalStatus) => {
  approvals.value = approvals.value.map((item) => (item.id === id ? { ...item, status } : item))
}

const typeClass = (type: string) => {
  return type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}

const statusClass = (status: string) => {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}

const typeIcon = (type: string): Component => {
  if (type.includes('Moviment')) return ArrowRightLeft
  return Wrench
}
</script>

<style scoped>
.approvals-page {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  color: var(--primary);
}

.stat-card.stat-success .stat-icon { color: var(--success); }
.stat-card.stat-warning .stat-icon { color: var(--warning); }
.stat-card.stat-danger .stat-icon { color: var(--danger); }

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  margin-bottom: 16px;
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

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--bg-card);
  border-color: var(--primary);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.approvals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.approval-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.approval-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.approval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-movimentacao { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.type-manutencao { background: rgba(168, 85, 247, 0.15); color: #a855f7; }

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-pendente { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status-aprovada { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-reprovada { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.approval-body { margin-bottom: 16px; }

.approval-asset {
  display: flex;
  align-items: center;
  gap: 12px;
}

.approval-asset svg { color: var(--primary); flex-shrink: 0; }

.approval-asset h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.approval-asset p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.approval-actions {
  display: flex;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.btn-approve {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 10px 16px;
  background: var(--success-light);
  color: var(--success);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-approve:hover { background: var(--success); color: white; border-color: var(--success); }

.btn-reject {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 10px 16px;
  background: var(--danger-light);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reject:hover { background: var(--danger); color: white; border-color: var(--danger); }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon { margin-bottom: 16px; opacity: 0.3; }

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-state p { margin: 0; font-size: 14px; }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 16px; align-items: flex-start; }
  .stats-grid { grid-template-columns: 1fr; }
  .approvals-grid { grid-template-columns: 1fr; }
}
</style>
