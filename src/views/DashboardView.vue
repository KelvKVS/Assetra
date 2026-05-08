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
            <strong>{{ inventory.assets.length }}</strong>
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
            <strong>{{ inventory.movements.length }}</strong>
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

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Status dos ativos</h3>
          <div class="donut" :style="donutStyle">
            <span>{{ inventory.assets.length }}</span>
          </div>
          <ul class="legend-list">
            <li><span class="dot dot-blue"></span>Em uso: <strong>{{ inUseAssets }}</strong></li>
            <li><span class="dot dot-green"></span>Disponíveis: <strong>{{ availableAssets }}</strong></li>
            <li><span class="dot dot-amber"></span>Em manutenção: <strong>{{ maintenanceAssets }}</strong></li>
          </ul>
        </div>

        <div class="chart-card">
          <h3>Manutenções por prioridade</h3>
          <div v-if="maintenanceByPriority.length" class="bar-list">
            <div v-for="item in maintenanceByPriority" :key="item.label" class="bar-row">
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill-priority" :style="{ width: `${item.percent}%` }"></div>
              </div>
              <strong class="bar-value">{{ item.value }}</strong>
            </div>
          </div>
          <p v-else class="muted">Sem manutenções registradas.</p>
        </div>

        <div class="chart-card">
          <h3>Carga por técnico</h3>
          <div v-if="workloadByTechnician.length" class="bar-list">
            <div v-for="item in workloadByTechnician" :key="item.label" class="bar-row">
              <span class="bar-label">{{ item.label }}</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill-workload" :style="{ width: `${item.percent}%` }"></div>
              </div>
              <strong class="bar-value">{{ item.value }}</strong>
            </div>
          </div>
          <p v-else class="muted">Sem técnicos atribuídos no momento.</p>
        </div>
      </div>

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
            <strong>{{ inventory.assets.length }}</strong>
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
          <p v-else class="muted">Sem pendências. 🎉</p>
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

    <!-- ================= TÉCNICO ================= -->
    <template v-else>
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
          Use o assistente passo-a-passo com upload de fotos.
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
import { useInventoryStore } from '../stores/inventory'
import { assetsAssignedToEmail } from '../utils/userScope'
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
  await Promise.allSettled([
    inventory.reloadDashboardData(),
    inventory.fetchApprovalsSafe(),
    inventory.fetchTasksSafe(),
  ])
})

const role = computed(() => authStore.user?.role)
const isAdmin = computed(() => role.value === 'ADM')
const isManager = computed(() => role.value === 'GESTOR')

const firstName = computed(() => (authStore.user?.name?.split(' ')[0] ?? 'utilizador'))
const tenantName = computed(() => authStore.user?.tenant?.name ?? 'Assetra')

/* === Admin === */
const activeUsersCount = computed(() => inventory.users.filter((u) => u.status === 'Ativo').length)
const openMaintenancesCount = computed(() => inventory.maintenances.filter((m) => m.status !== 'Concluída').length)
const inUseAssets = computed(() => inventory.assets.filter((i) => i.status === 'Em uso').length)
const availableAssets = computed(() => inventory.assets.filter((i) => i.status === 'Disponível').length)
const maintenanceAssets = computed(() => inventory.assets.filter((i) => i.status === 'Em manutenção').length)

const donutStyle = computed(() => {
  const total = inventory.assets.length || 1
  const inUse = (inUseAssets.value / total) * 100
  const available = (availableAssets.value / total) * 100
  const maintenance = 100 - inUse - available
  return {
    background: `conic-gradient(
      #3b82f6 0% ${inUse}%,
      #22c55e ${inUse}% ${inUse + available}%,
      #f59e0b ${inUse + available}% ${inUse + available + maintenance}%
    )`,
  }
})

const maintenanceByPriority = computed(() => {
  const m = new Map<string, number>()
  inventory.maintenances.forEach((row) => {
    const label = String(row.priority ?? 'Média').trim() || 'Média'
    m.set(label, (m.get(label) ?? 0) + 1)
  })
  const raw = Array.from(m.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const max = raw[0]?.value ?? 1
  return raw.map((it) => ({ ...it, percent: Math.round((it.value / max) * 100) }))
})

const workloadByTechnician = computed(() => {
  const m = new Map<string, number>()
  inventory.maintenances
    .filter((row) => row.status !== 'Concluída')
    .forEach((row) => {
      const label = String(row.assignedTechnicianName || row.assignedTechnicianEmail || 'Não atribuído').trim()
      m.set(label, (m.get(label) ?? 0) + 1)
    })
  const raw = Array.from(m.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
  const max = raw[0]?.value ?? 1
  return raw.map((it) => ({ ...it, percent: Math.round((it.value / max) * 100) }))
})

/* === Gestor === */
const pendingApprovals = computed(() => inventory.approvals.filter((a) => a.status === 'Pendente'))
const recentMovements = computed(() => inventory.movements.slice(0, 5))
const ongoingMaintenances = computed(() =>
  inventory.maintenances.filter((m) => m.status !== 'Concluída'),
)
const inProgressMaintenances = computed(
  () => inventory.maintenances.filter((m) => m.status === 'Em andamento').length,
)
const decisionsToday = computed(() => {
  const today = new Date().toDateString()
  return inventory.approvals.filter(
    (a) => a.decidedAt && new Date(a.decidedAt).toDateString() === today,
  ).length
})

/* === Técnico === */
const myAssets = computed(() => assetsAssignedToEmail(inventory.assets, authStore.user?.email))
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
  void inventory.reloadDashboardData()
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

/* Charts (admin) */
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.chart-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 22px; }
.chart-card h3 { margin: 0 0 16px; font-size: 16px; font-weight: 700; color: var(--text-primary); }

.donut {
  width: 160px; height: 160px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  margin: 8px auto 16px; position: relative;
}
.donut::after {
  content: ''; position: absolute; inset: 22px; background: var(--bg-card); border-radius: 50%;
}
.donut span { position: relative; font-size: 22px; font-weight: 800; color: var(--text-primary); z-index: 1; }

.legend-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary); }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }
.dot-blue { background: #3b82f6; } .dot-green { background: #22c55e; } .dot-amber { background: #f59e0b; }

.bar-list { display: flex; flex-direction: column; gap: 12px; }
.bar-row { display: grid; grid-template-columns: 120px 1fr 36px; gap: 10px; align-items: center; font-size: 13px; }
.bar-label { color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #8b5cf6); border-radius: 4px; }
.bar-fill.bar-fill-priority { background: linear-gradient(90deg, #f59e0b, #ef4444); }
.bar-fill.bar-fill-workload { background: linear-gradient(90deg, #22c55e, #14b8a6); }
.bar-value { color: var(--text-primary); font-weight: 700; text-align: right; }

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
  .stats-grid, .charts-grid, .cols-2 { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 100px 1fr 30px; }
  .list-main .muted { max-width: 100%; }
}
</style>
