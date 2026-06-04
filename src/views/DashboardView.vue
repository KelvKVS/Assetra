<template>
  <div class="dashboard">
    <!-- ================= ADMIN ================= -->
    <template v-if="isAdmin">
      <div class="welcome-banner">
        <div>
          <span class="banner-chip">Visão executiva</span>
          <h2>Olá, {{ firstName }} 👋</h2>
          <p>Visão geral da operação em <strong>{{ tenantName }}</strong>.</p>
        </div>
        <button class="btn-secondary" @click="handleReload">
          <RefreshCw :size="16" /> Recarregar
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <Monitor :size="22" />
          <div>
            <span class="stat-label">Ativos cadastrados</span>
            <strong>{{ dashCounts?.assets ?? inventory.assets.length }}</strong>
          </div>
        </div>
        <div class="stat-card stat-warning">
          <Wrench :size="22" />
          <div>
            <span class="stat-label">Chamados abertos</span>
            <strong>{{ openMaintenancesCount }}</strong>
          </div>
        </div>
        <div class="stat-card stat-info">
          <ArrowRightLeft :size="22" />
          <div>
            <span class="stat-label">Movimentações</span>
            <strong>{{ dashCounts?.movements ?? inventory.movements.length }}</strong>
          </div>
        </div>
        <div class="stat-card stat-success">
          <Users :size="22" />
          <div>
            <span class="stat-label">Utilizadores ativos</span>
            <strong>{{ activeUsersCount }}</strong>
          </div>
        </div>
      </div>

      <DashboardCharts variant="admin" />

      <section class="panel">
        <header class="panel-header">
          <h3><ArrowRightLeft :size="18" /> Movimentações recentes</h3>
          <RouterLink to="/movimentacoes" class="link">ver tudo →</RouterLink>
        </header>
        <ul v-if="recentMovements.length" class="list">
          <li v-for="m in recentMovements" :key="m.id">
            <div class="list-main">
              <strong>{{ m.assetTag }}</strong>
              <span class="muted">{{ m.origin }} → {{ m.destination }}</span>
              <span class="meta">{{ m.responsible }} · {{ m.date }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="muted">Nenhuma movimentação recente encontrada.</p>
      </section>
    </template>

    <!-- ================= GESTOR ================= -->
    <template v-else-if="isManager">
      <div class="welcome-banner">
        <div>
          <span class="banner-chip">Painel de gestão</span>
          <h2>Olá, {{ firstName }} 👋</h2>
          <p>Centro de decisão de <strong>{{ tenantName }}</strong>. Aprove pedidos e acompanhe a operação.</p>
        </div>
        <RouterLink to="/aprovacoes" class="btn-primary">
          <ClipboardCheck :size="16" /> Ir para aprovações
        </RouterLink>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-warning">
          <Clock :size="22" />
          <div>
            <span class="stat-label">Pendentes de aprovação</span>
            <strong>{{ pendingApprovals.length }}</strong>
          </div>
        </div>
        <div class="stat-card stat-info">
          <Wrench :size="22" />
          <div>
            <span class="stat-label">Manutenções em andamento</span>
            <strong>{{ inProgressMaintenances }}</strong>
          </div>
        </div>
        <div class="stat-card stat-primary">
          <Monitor :size="22" />
          <div>
            <span class="stat-label">Ativos no tenant</span>
            <strong>{{ dashCounts?.assets ?? inventory.assets.length }}</strong>
          </div>
        </div>
        <div class="stat-card stat-success">
          <CheckCircle :size="22" />
          <div>
            <span class="stat-label">Decisões hoje</span>
            <strong>{{ decisionsToday }}</strong>
          </div>
        </div>
      </div>

      <DashboardCharts variant="manager" />

      <div class="cols-2">
        <section class="panel">
          <header class="panel-header">
            <h3><Clock :size="18" /> Pendentes de aprovação</h3>
            <RouterLink to="/aprovacoes" class="link">ver tudo →</RouterLink>
          </header>
          <ul v-if="pendingApprovals.length" class="list">
            <li v-for="a in pendingApprovals.slice(0, 5)" :key="a.id">
              <div class="list-main">
                <strong>{{ a.assetTag }}</strong>
                <span class="muted">{{ a.type }} · {{ a.description }}</span>
                <span v-if="a.requestedByName" class="meta">Por: {{ a.requestedByName }}</span>
              </div>
              <span class="status-badge status-pendente">{{ a.status }}</span>
            </li>
          </ul>
          <p v-else class="muted">Sem pendências.</p>
        </section>

        <section class="panel">
          <header class="panel-header">
            <h3><ArrowRightLeft :size="18" /> Movimentações recentes</h3>
            <RouterLink to="/movimentacoes" class="link">ver tudo →</RouterLink>
          </header>
          <ul v-if="recentMovements.length" class="list">
            <li v-for="m in recentMovements" :key="m.id">
              <div class="list-main">
                <strong>{{ m.assetTag }}</strong>
                <span class="muted">{{ m.origin }} → {{ m.destination }}</span>
                <span class="meta">{{ m.responsible }} · {{ m.date }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="muted">Nenhuma movimentação ainda.</p>
        </section>
      </div>

      <section class="panel">
        <header class="panel-header">
          <h3><Wrench :size="18" /> Manutenções abertas / em andamento</h3>
          <RouterLink to="/manutencoes" class="link">ver tudo →</RouterLink>
        </header>
        <ul v-if="ongoingMaintenances.length" class="list">
          <li v-for="m in ongoingMaintenances.slice(0, 6)" :key="m.id">
            <div class="list-main">
              <strong>{{ m.assetTag }}</strong>
              <span class="muted">{{ m.type }} · {{ m.description }}</span>
            </div>
            <span :class="['status-badge', `status-${statusClass(m.status)}`]">{{ m.status }}</span>
          </li>
        </ul>
        <p v-else class="muted">Sem manutenções em andamento.</p>
      </section>
    </template>

    <!-- ================= FUNCIONÁRIO ================= -->
    <template v-else-if="isEmployee">
      <div class="welcome-banner">
        <div>
          <h2>Olá, {{ firstName }} 👋</h2>
          <p>
            Consulte os equipamentos atribuídos a si e abra pedidos quando precisar de apoio da TI.
            <template v-if="employeeDepartment"> Área: <strong>{{ employeeDepartment }}</strong>.</template>
          </p>
        </div>
        <RouterLink to="/solicitacoes" class="btn-primary">
          <Plus :size="16" /> Nova solicitação
        </RouterLink>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-info">
          <Monitor :size="22" />
          <div>
            <span class="stat-label">Meus ativos</span>
            <strong>{{ myAssets.length }}</strong>
          </div>
        </div>
        <div class="stat-card stat-warning">
          <Clock :size="22" />
          <div>
            <span class="stat-label">Pedidos pendentes</span>
            <strong>{{ myPendingRequestsCount }}</strong>
          </div>
        </div>
        <div class="stat-card stat-success">
          <CheckCircle :size="22" />
          <div>
            <span class="stat-label">Pedidos concluídos</span>
            <strong>{{ myClosedRequestsCount }}</strong>
          </div>
        </div>
      </div>

      <div class="cols-2">
        <section class="panel">
          <header class="panel-header">
            <h3><Monitor :size="18" /> Os meus ativos</h3>
            <RouterLink to="/meus-ativos" class="link">ver tudo →</RouterLink>
          </header>
          <ul v-if="myAssets.length" class="list">
            <li v-for="a in myAssets.slice(0, 5)" :key="a.id ?? a.tag">
              <div class="list-main">
                <strong>{{ a.tag }}</strong>
                <span class="muted">{{ a.description }}</span>
                <span class="meta">{{ a.sector }}</span>
              </div>
              <span :class="['status-badge', `status-${statusClass(a.status)}`]">{{ a.status }}</span>
            </li>
          </ul>
          <p v-else class="muted">Nenhum ativo está atribuído ao seu e-mail. Peça ao administrador para associar o seu e-mail na ficha do ativo.</p>
        </section>

        <section class="panel">
          <header class="panel-header">
            <h3><Send :size="18" /> Últimas solicitações</h3>
            <RouterLink to="/solicitacoes" class="link">ver tudo →</RouterLink>
          </header>
          <ul v-if="myRecentRequests.length" class="list">
            <li v-for="req in myRecentRequests" :key="req.id">
              <div class="list-main">
                <strong>{{ req.type }} · {{ req.assetTag }}</strong>
                <span class="muted">{{ req.description }}</span>
              </div>
              <span :class="['status-badge', requestStatusClass(req.status)]">{{ req.status }}</span>
            </li>
          </ul>
          <p v-else class="muted">Ainda não enviou solicitações. Use «Nova solicitação» para manutenção ou troca de setor.</p>
        </section>
      </div>
    </template>

    <!-- ================= TÉCNICO ================= -->
    <template v-else-if="isTechnician">
      <div class="welcome-banner">
        <div>
          <h2>Olá, {{ firstName }} 👋</h2>
          <p>A sua fila de execução em <strong>{{ tenantName }}</strong>.</p>
        </div>
        <RouterLink to="/execucao-tecnica" class="btn-primary">
          <ClipboardList :size="16" /> Abrir execução técnica
        </RouterLink>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <ClipboardList :size="22" />
          <div>
            <span class="stat-label">Ordens ativas</span>
            <strong>{{ activeTaskCount }}</strong>
          </div>
        </div>
        <div class="stat-card stat-danger">
          <AlertCircle :size="22" />
          <div>
            <span class="stat-label">Alta prioridade</span>
            <strong>{{ highPriorityTaskCount }}</strong>
          </div>
        </div>
        <div class="stat-card stat-success">
          <CheckCircle :size="22" />
          <div>
            <span class="stat-label">Concluídas</span>
            <strong>{{ completedTaskCount }}</strong>
          </div>
        </div>
        <div class="stat-card stat-info">
          <Monitor :size="22" />
          <div>
            <span class="stat-label">Meus ativos</span>
            <strong>{{ myAssets.length }}</strong>
          </div>
        </div>
      </div>

      <div class="cols-2">
        <section class="panel">
          <header class="panel-header">
            <h3><Wrench :size="18" /> Próximas tarefas</h3>
            <RouterLink to="/execucao-tecnica" class="link">ver tudo →</RouterLink>
          </header>
          <ul v-if="upcomingTasks.length" class="list">
            <li v-for="t in upcomingTasks" :key="t.id">
              <div class="list-main">
                <strong>{{ t.assetTag }}</strong>
                <span class="muted">{{ t.task }}</span>
              </div>
              <span :class="['priority-badge', `priority-${priorityClass(t.priority)}`]">
                {{ t.priority }}
              </span>
            </li>
          </ul>
          <p v-else class="muted">Sem tarefas pendentes. 👌</p>
        </section>

        <section class="panel">
          <header class="panel-header">
            <h3><Monitor :size="18" /> Os meus ativos</h3>
            <RouterLink to="/meus-ativos" class="link">ver tudo →</RouterLink>
          </header>
          <ul v-if="myAssets.length" class="list">
            <li v-for="a in myAssets.slice(0, 5)" :key="a.id ?? a.tag">
              <div class="list-main">
                <strong>{{ a.tag }}</strong>
                <span class="muted">{{ a.description }}</span>
                <span class="meta">{{ a.sector }}</span>
              </div>
              <span :class="['status-badge', `status-${statusClass(a.status)}`]">{{ a.status }}</span>
            </li>
          </ul>
          <p v-else class="muted">Nenhum ativo está atribuído ao seu e-mail ainda.</p>
        </section>
      </div>

      <section class="panel">
        <header class="panel-header">
          <h3><Send :size="18" /> Solicitar nova aprovação</h3>
        </header>
        <p class="muted">
          Precisa de movimentar um equipamento ou abrir uma manutenção que dependa do gestor?
          Use o assistente passo-a-passo com anexos (fotos e documentos).
        </p>
        <RouterLink to="/solicitacoes" class="btn-primary self-start">
          <Plus :size="16" /> Nova solicitação
        </RouterLink>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  useInventoryStore,
  type ApprovalRow,
  type MaintenanceRow,
} from '../stores/inventory'
import { assetsAssignedToEmail } from '../utils/userScope'
import DashboardCharts from '../components/dashboard/DashboardCharts.vue'
import {
  Monitor,
  Wrench,
  Users,
  ArrowRightLeft,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Plus,
  RefreshCw,
} from 'lucide-vue-next'

const authStore = useAuthStore()
const inventory = useInventoryStore()

onMounted(async () => {
  const r = authStore.user?.role
  if (r === 'FUNCIONARIO') {
    await Promise.allSettled([
      inventory.fetchAssets({ lite: true }),
      inventory.fetchMyApprovalsSafe(),
    ])
    return
  }
  if (r === 'TECNICO') {
    await Promise.allSettled([
      inventory.loadDashboardBundle(),
      inventory.fetchTasksSafe(),
      inventory.fetchMyApprovalsSafe(),
    ])
    return
  }
  await Promise.allSettled([
    inventory.loadDashboardBundle(),
    inventory.fetchApprovalsSafe(),
    inventory.fetchTasksSafe(),
  ])
})

const role = computed(() => authStore.user?.role)
const isAdmin = computed(() => role.value === 'ADM')
const isManager = computed(() => role.value === 'GESTOR')
const isTechnician = computed(() => role.value === 'TECNICO')
const isEmployee = computed(() => role.value === 'FUNCIONARIO')
const employeeDepartment = computed(() => authStore.user?.department?.trim() || '')

const firstName = computed(() => (authStore.user?.name?.split(' ')[0] ?? 'utilizador'))
const tenantName = computed(() => authStore.user?.tenant?.name ?? 'Assetra')

/* === Admin === */
const dashCounts = computed(() => inventory.dashboard?.counts)

const activeUsersCount = computed(
  () => dashCounts.value?.activeUsers ?? inventory.users.filter((u) => u.status === 'Ativo').length,
)
const openMaintenancesCount = computed(
  () =>
    dashCounts.value?.openMaintenances ??
    inventory.maintenances.filter((m) => m.status !== 'Concluída').length,
)

/* === Gestor === */
const pendingApprovals = computed(() => {
  const preview = inventory.dashboard?.pendingApprovalsPreview
  if (preview?.length) return preview as ApprovalRow[]
  return inventory.approvals.filter((a) => a.status === 'Pendente')
})
const recentMovements = computed(() => {
  const fromSummary = inventory.dashboard?.recentMovements
  if (fromSummary?.length) return fromSummary
  return inventory.movements.slice(0, 5)
})
const ongoingMaintenances = computed(() => {
  const preview = inventory.dashboard?.ongoingMaintenances
  if (preview?.length) return preview as MaintenanceRow[]
  return inventory.maintenances.filter((m) => m.status !== 'Concluída')
})
const inProgressMaintenances = computed(
  () =>
    dashCounts.value?.inProgressMaintenances ??
    inventory.maintenances.filter((m) => m.status === 'Em andamento').length,
)
const decisionsToday = computed(() => {
  if (dashCounts.value?.decisionsToday != null) return dashCounts.value.decisionsToday
  const today = new Date().toDateString()
  return inventory.approvals.filter(
    (a) => a.decidedAt && new Date(a.decidedAt).toDateString() === today,
  ).length
})

/* === Funcionário / Técnico === */
const myAssets = computed(() => assetsAssignedToEmail(inventory.assets, authStore.user?.email))
const myPendingRequestsCount = computed(
  () => inventory.myApprovals.filter((a) => a.status === 'Pendente').length,
)
const myClosedRequestsCount = computed(
  () => inventory.myApprovals.filter((a) => a.status === 'Aprovada' || a.status === 'Reprovada').length,
)
const myRecentRequests = computed(() => inventory.myApprovals.slice(0, 5))

const requestStatusClass = (status: string) => {
  const s = status.toLowerCase()
  if (s === 'pendente') return 'status-em-manutencao'
  if (s === 'aprovada') return 'status-em-uso'
  return 'status-disponivel'
}
const activeTaskCount = computed(() => inventory.tasks.filter((t) => t.status !== 'Concluída').length)
const completedTaskCount = computed(() => inventory.tasks.filter((t) => t.status === 'Concluída').length)
const highPriorityTaskCount = computed(() => inventory.tasks.filter((t) => t.priority === 'Alta').length)
const upcomingTasks = computed(() =>
  inventory.tasks
    .filter((t) => t.status !== 'Concluída')
    .sort((a, b) => Number(b.priority === 'Alta') - Number(a.priority === 'Alta'))
    .slice(0, 5),
)

const handleReload = () => {
  void inventory.reloadDashboardData({ force: true })
}

const statusClass = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')

const priorityClass = (p: string) =>
  p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
</script>

<style scoped>
.dashboard { animation: fade-up 0.5s ease; display: flex; flex-direction: column; gap: 24px; }

.welcome-banner {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 22px 24px; background: radial-gradient(circle at top right, rgba(59,130,246,0.2), transparent 55%), linear-gradient(135deg, var(--primary-light), transparent 80%);
  border: 1px solid var(--border-light); border-radius: 14px;
  box-shadow: var(--shadow-md);
}
.welcome-banner h2 { margin: 0; font-size: 22px; color: var(--text-primary); }
.welcome-banner p { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
.banner-chip {
  display: inline-flex;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-light);
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 999px;
  padding: 4px 10px;
  margin-bottom: 8px;
}

.btn-primary, .btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 700;
  cursor: pointer; text-decoration: none; transition: all 0.2s ease;
}
.btn-primary { background: var(--primary); color: white; border: none; }
.btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
.btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-light); }
.self-start { align-self: flex-start; }

/* Stats grid */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.stat-card {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 20px; background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 12px; transition: all 0.2s ease;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
.stat-card svg { color: var(--primary); flex-shrink: 0; }
.stat-card.stat-warning svg { color: var(--warning); }
.stat-card.stat-info svg { color: var(--info); }
.stat-card.stat-success svg { color: var(--success); }
.stat-card.stat-danger svg { color: var(--danger); }
.stat-card > div { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.stat-card strong { font-size: 26px; font-weight: 800; color: var(--text-primary); }

/* Painéis Gestor/Técnico */
.cols-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }

.panel {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 12px; padding: 22px; display: flex; flex-direction: column; gap: 12px;
}
.panel-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.panel-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary); display: inline-flex; align-items: center; gap: 8px; }
.link { color: var(--primary); font-size: 12px; text-decoration: none; font-weight: 600; }
.link:hover { text-decoration: underline; }

.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.list li {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-light);
  border-radius: 10px; font-size: 13px;
}
.list-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.list-main strong { color: var(--text-primary); font-size: 14px; }
.list-main .muted { color: var(--text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 30ch; }
.list-main .meta { color: var(--text-muted); font-size: 11px; }

.status-badge, .priority-badge {
  padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.status-pendente { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status-aprovada { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-reprovada { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.status-aberta { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
.status-em-andamento { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-concluida { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-em-uso { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-disponivel { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-em-manutencao { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.priority-alta { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.priority-media { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.priority-baixa { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

.muted { color: var(--text-muted); font-size: 13px; margin: 0; }

@keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .welcome-banner { flex-direction: column; align-items: flex-start; }
  .stats-grid, .cols-2 { grid-template-columns: 1fr; }
  .list-main .muted { max-width: 100%; }
}
</style>
