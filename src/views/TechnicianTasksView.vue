<template>
  <div class="technician-tasks-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Execução Técnica</h2>
        <p class="muted">Fila operacional do técnico para iniciar e concluir ordens de serviço do dia a dia</p>
      </div>
    </div>

    <div class="info-banner">
      <AlertCircle :size="18" :stroke-width="2.5" />
      <span>
        Esta tela é o painel de trabalho do técnico: aqui você inicia as ordens e, ao concluir a execução, envia relatório com evidências para validação do gestor.
      </span>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card stat-primary">
        <ClipboardList :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Ordens ativas</span>
          <span class="stat-value">{{ activeCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <CheckCircle :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Concluídas hoje</span>
          <span class="stat-value">{{ completedCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-danger">
        <AlertCircle :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Alta prioridade</span>
          <span class="stat-value">{{ highPriorityCount }}</span>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por ativo, tarefa ou prioridade..." />
    </div>

    <!-- Tasks Grid -->
    <div class="tasks-grid">
      <div v-for="item in filteredTasks" :key="item.id" class="task-card">
        <div class="task-header">
          <div class="task-icon-container">
            <Wrench :size="22" :stroke-width="2.5" />
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
            <Monitor :size="16" :stroke-width="2" />
            <span>{{ item.assetTag }}</span>
          </div>
          <h3 class="task-title">{{ item.task }}</h3>
        </div>
        <div class="task-footer">
          <div v-if="item.status !== 'Concluída'" class="task-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: item.status === 'Aberta' ? '0%' : '50%' }"
              ></div>
            </div>
          </div>
          <div v-else class="task-completed">
            <CheckCircle :size="18" :stroke-width="2.5" class="completed-icon" />
            <span>Concluída</span>
          </div>
          <div v-if="hasPendingValidation(item)" class="pending-chip">
            Aguardando validação do gestor
          </div>
          <button
            v-else-if="item.status !== 'Concluída'"
            class="btn-advance"
            @click="onTaskAction(item)"
          >
            <ArrowRight :size="16" :stroke-width="2.5" />
            {{ item.status === 'Aberta' ? 'Iniciar' : 'Enviar para validação' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTasks.length === 0" class="empty-state">
      <ClipboardList :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhuma tarefa encontrada</h3>
      <p>Não há ordens de serviço no momento</p>
    </div>

    <div v-if="reportModal.open" class="modal-overlay" @click="closeReportModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Relatório de execução técnica</h3>
          <button class="btn-close" @click="closeReportModal">×</button>
        </div>

        <p class="modal-subtitle">
          Envie descrição e evidências visuais para o gestor validar a conclusão da ordem
          <strong>{{ reportModal.task?.assetTag }}</strong>.
        </p>

        <div class="form-group">
          <label>Descrição da execução</label>
          <textarea
            v-model.trim="reportForm.description"
            rows="4"
            placeholder="Explique o que foi feito, testes realizados e resultado final."
          ></textarea>
        </div>

        <div class="form-group">
          <label>Anexos (fotos/prints)</label>
          <input
            ref="reportFileInput"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="onReportFilesPicked"
          />
          <ul v-if="reportFiles.length" class="picked-list">
            <li v-for="(file, index) in reportFiles" :key="index">
              <span>{{ file.name }}</span>
              <button type="button" class="picked-remove" @click="removeReportFile(index)">remover</button>
            </li>
          </ul>
        </div>

        <p v-if="reportError" class="report-error">{{ reportError }}</p>

        <div class="modal-actions">
          <button class="btn-primary" :disabled="sendingReport" @click="sendReportForValidation">
            {{ sendingReport ? 'Enviando...' : 'Enviar para validação' }}
          </button>
          <button class="btn-secondary" :disabled="sendingReport" @click="closeReportModal">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useInventoryStore } from '../stores/inventory'
import type { AttachmentRef, TaskRow } from '../stores/inventory'
import { useConfirmAction } from '../composables/useConfirmAction'
import { useAuthStore } from '../stores/auth'
import {
  Search,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Wrench,
  Monitor,
  ArrowRight,
} from 'lucide-vue-next'

const confirm = useConfirmAction()

const inventory = useInventoryStore()
const authStore = useAuthStore()

onMounted(() => {
  void inventory.fetchTasksSafe()
  void inventory.fetchMyApprovalsSafe()
})

const search = ref('')
const sendingReport = ref(false)
const reportError = ref('')
const reportFileInput = ref<HTMLInputElement | null>(null)
const reportFiles = ref<File[]>([])
const reportModal = reactive<{ open: boolean; task: TaskRow | null }>({
  open: false,
  task: null,
})
const reportForm = reactive({
  description: '',
})

const tasks = computed(() => inventory.tasks)
const pendingValidationAssetTags = computed(() => {
  const me = authStore.user?.sub
  if (!me) return new Set<string>()
  return new Set(
    inventory.myApprovals
      .filter(
        (item) =>
          item.status === 'Pendente' &&
          item.type === 'Manutenção' &&
          String(item.requestedBy ?? '') === String(me),
      )
      .map((item) => item.assetTag),
  )
})
const hasPendingValidation = (task: TaskRow) =>
  task.status === 'Em andamento' && pendingValidationAssetTags.value.has(task.assetTag)

const filteredTasks = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return tasks.value
  return tasks.value.filter((item) =>
    [item.assetTag, item.task, item.priority, item.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const activeCount = computed(() => tasks.value.filter((item) => item.status !== 'Concluída').length)
const completedCount = computed(() => tasks.value.filter((item) => item.status === 'Concluída').length)
const highPriorityCount = computed(() => tasks.value.filter((item) => item.priority === 'Alta').length)

const advanceStatus = async (id: string) => {
  const ok = await confirm.ask('Confirme com a sua senha para avançar o estado da tarefa.')
  if (!ok) return
  await inventory.advanceTask(id)
}

const openReportModal = (task: TaskRow) => {
  reportError.value = ''
  reportForm.description = ''
  reportFiles.value = []
  if (reportFileInput.value) reportFileInput.value.value = ''
  reportModal.open = true
  reportModal.task = task
}

const closeReportModal = () => {
  if (sendingReport.value) return
  reportModal.open = false
  reportModal.task = null
}

const onReportFilesPicked = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  reportFiles.value = Array.from(input.files).slice(0, 6)
}

const removeReportFile = (index: number) => {
  reportFiles.value.splice(index, 1)
}

const onTaskAction = async (task: TaskRow) => {
  if (task.status === 'Aberta') {
    await advanceStatus(String(task.id))
    return
  }
  openReportModal(task)
}

const sendReportForValidation = async () => {
  if (!reportModal.task) return
  reportError.value = ''
  if (!reportForm.description.trim()) {
    reportError.value = 'Descreva a execução antes de enviar para validação.'
    return
  }
  if (!reportFiles.value.length) {
    reportError.value = 'Anexe pelo menos uma foto/print como evidência.'
    return
  }

  const ok = await confirm.ask('Confirme com a sua senha para enviar o relatório ao gestor.')
  if (!ok) return

  sendingReport.value = true
  try {
    const attachments: AttachmentRef[] = await inventory.uploadAttachments(reportFiles.value)
    await inventory.createApproval({
      type: 'Manutenção',
      assetTag: reportModal.task.assetTag,
      description: `Validação de execução técnica - ${reportModal.task.task}`,
      feedback: reportForm.description.trim(),
      attachments,
    })
    await inventory.fetchMyApprovalsSafe()
    closeReportModal()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    reportError.value = ax?.response?.data?.message ?? 'Não foi possível enviar o relatório.'
  } finally {
    sendingReport.value = false
  }
}

const priorityClass = (priority: string) => {
  return priority.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}

const statusClass = (status: string) => {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}
</script>

<style scoped>
.technician-tasks-page { animation: fade-up 0.5s ease; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0 0 4px; font-size: 28px; font-weight: 700; color: var(--text-primary); }
.page-header p { margin: 0; font-size: 14px; color: var(--text-secondary); }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s ease; }
.stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.stat-icon { color: var(--primary); }
.stat-card.stat-success .stat-icon { color: var(--success); }
.stat-card.stat-danger .stat-icon { color: var(--danger); }

.stat-content { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--text-primary); }

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

.info-banner {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.modal {
  width: min(640px, 92vw);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  padding: 18px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  border: 1px solid var(--border-light);
  background: var(--bg-hover);
  color: var(--text-secondary);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
}

.modal-subtitle {
  margin: 0 0 14px;
  color: var(--text-secondary);
  font-size: 13px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.form-group textarea,
.form-group input {
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-primary);
}

.picked-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picked-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
}

.picked-remove {
  border: none;
  background: transparent;
  color: var(--danger);
  cursor: pointer;
}

.report-error {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--danger);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-secondary {
  border: 1px solid var(--border-light);
  background: var(--bg-hover);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}

.search-bar:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.search-bar svg { color: var(--text-secondary); flex-shrink: 0; }
.search-bar input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--text-primary); outline: none; }

.tasks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.task-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 20px; transition: all 0.2s ease; }
.task-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--primary); }

.task-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.task-icon-container { width: 48px; height: 48px; background: var(--primary-light); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary); }

.task-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.priority-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.priority-alta { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.priority-media { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.priority-baixa { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

.status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.status-aberta { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
.status-em-andamento { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-concluida { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

.task-body { margin-bottom: 16px; }
.task-asset { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
.task-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }

.task-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border-light); }
.task-progress { flex: 1; }
.progress-bar { height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #8b5cf6); border-radius: 3px; transition: width 0.4s ease; }

.task-completed { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--success); font-weight: 600; }
.completed-icon { color: var(--success); }

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

.btn-advance:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

.pending-chip {
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-icon { margin-bottom: 16px; opacity: 0.3; }
.empty-state h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--text-secondary); }
.empty-state p { margin: 0; font-size: 14px; }

@keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 16px; align-items: flex-start; }
  .stats-grid { grid-template-columns: 1fr; }
  .tasks-grid { grid-template-columns: 1fr; }
  .task-footer { flex-direction: column; align-items: flex-start; }
  .btn-advance { width: 100%; justify-content: center; }
}
</style>
