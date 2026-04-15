<template>
  <div class="technician-tasks-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Execu&ccedil;&atilde;o T&eacute;cnica</h2>
        <p class="muted">Fila operacional para o t&eacute;cnico atualizar o andamento das ordens</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card stat-primary">
        <ClipboardList size="24" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Ordens ativas</span>
          <span class="stat-value">{{ activeCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <CheckCircle2 size="24" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Conclu&iacute;das hoje</span>
          <span class="stat-value">{{ completedCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-danger">
        <AlertCircle size="24" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Alta prioridade</span>
          <span class="stat-value">{{ highPriorityCount }}</span>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <Search size="18" />
      <input v-model.trim="search" type="text" placeholder="Buscar por ativo, tarefa ou prioridade..." />
    </div>

    <!-- Tasks Grid -->
    <div class="tasks-grid">
      <div v-for="item in filteredTasks" :key="item.id" class="task-card">
        <div class="task-header">
          <div class="task-icon-container">
            <Wrench size="22" />
          </div>
          <div class="task-badges">
            <span :class="['priority-badge', `priority-${priorityClass(item.priority)}`]">
              {{ item.priority }}
            </span>
            <span :class="['status-badge', `status-${statusClass(item.status)}`]">
              {{ item.status }}
            </span>
          </div>
        </div>
        <div class="task-body">
          <div class="task-asset">
            <Monitor size="16" />
            <span>{{ item.assetTag }}</span>
          </div>
          <h3 class="task-title">{{ item.task }}</h3>
        </div>
        <div class="task-footer">
          <div v-if="item.status !== 'Conclu&iacute;da'" class="task-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: item.status === 'Aberta' ? '0%' : '50%' }"
              ></div>
            </div>
          </div>
          <div v-else class="task-completed">
            <CheckCircle2 size="18" class="completed-icon" />
            <span>Conclu&iacute;da</span>
          </div>
          <button
            v-if="item.status !== 'Conclu&iacute;da'"
            class="btn-advance"
            @click="advanceStatus(item.id)"
          >
            <ArrowRight size="16" />
            {{ item.status === 'Aberta' ? 'Iniciar' : 'Finalizar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTasks.length === 0" class="empty-state">
      <ClipboardList size="64" class="empty-icon" />
      <h3>Nenhuma tarefa encontrada</h3>
      <p>N&atilde;o h&aacute; ordens de servi&ccedil;o no momento</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Search,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Monitor,
  ArrowRight,
} from 'lucide-vue-next'

type TaskStatus = 'Aberta' | 'Em andamento' | 'Conclu&iacute;da'
type TaskPriority = 'Alta' | 'M&eacute;dia' | 'Baixa'

type TaskItem = {
  id: number
  assetTag: string
  task: string
  priority: TaskPriority
  status: TaskStatus
}

const tasks = ref<TaskItem[]>([
  { id: 1, assetTag: 'AST-003', task: 'Diagn&oacute;stico de falha de v&iacute;deo', priority: 'Alta', status: 'Aberta' },
  { id: 2, assetTag: 'AST-007', task: 'Limpeza e testes preventivos', priority: 'M&eacute;dia', status: 'Em andamento' },
  { id: 3, assetTag: 'AST-011', task: 'Troca de teclado', priority: 'Baixa', status: 'Conclu&iacute;da' },
])

const search = ref('')

const filteredTasks = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return tasks.value
  return tasks.value.filter((item) =>
    [item.assetTag, item.task, item.priority, item.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const activeCount = computed(() => tasks.value.filter((item) => item.status !== 'Conclu&iacute;da').length)
const completedCount = computed(() => tasks.value.filter((item) => item.status === 'Conclu&iacute;da').length)
const highPriorityCount = computed(() => tasks.value.filter((item) => item.priority === 'Alta').length)

const advanceStatus = (id: number) => {
  tasks.value = tasks.value.map((item) => {
    if (item.id !== id) return item
    if (item.status === 'Aberta') return { ...item, status: 'Em andamento' }
    if (item.status === 'Em andamento') return { ...item, status: 'Conclu&iacute;da' }
    return item
  })
}

const priorityClass = (priority: string) => {
  return priority.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}

const statusClass = (status: string) => {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}
</script>

<style scoped>
.technician-tasks-page {
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

/* Stats Grid */
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

.stat-card.stat-success .stat-icon {
  color: var(--success);
}

.stat-card.stat-danger .stat-icon {
  color: var(--danger);
}

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

/* Search Bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  margin-bottom: 24px;
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

.search-bar input::placeholder {
  color: var(--text-muted);
}

/* Tasks Grid */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.task-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.task-icon-container {
  width: 48px;
  height: 48px;
  background: var(--primary-light);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.task-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.priority-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.priority-alta {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.priority-media {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.priority-baixa {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-aberta {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

.status-em-andamento {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.status-concluida {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.task-body {
  margin-bottom: 16px;
}

.task-asset {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.task-asset svg {
  flex-shrink: 0;
}

.task-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.task-progress {
  flex: 1;
}

.progress-bar {
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #8b5cf6);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.task-completed {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--success);
  font-weight: 600;
}

.completed-icon {
  color: var(--success);
}

.btn-advance {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-advance:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .tasks-grid {
    grid-template-columns: 1fr;
  }

  .task-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-advance {
    width: 100%;
    justify-content: center;
  }
}
</style>
