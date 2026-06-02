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
          <p v-if="item.validationDueDisplay" :class="['due-chip', `due-${item.dueUrgency || 'ok'}`]">
            <CalendarClock :size="14" />
            Entregar até {{ item.validationDueDisplay }}
          </p>
          <p v-else-if="item.status === 'Em andamento'" class="due-chip due-none">
            Sem prazo definido pelo gestor
          </p>
          <p v-if="item.hasPendingExtension" class="ext-chip">Pedido de adiamento em análise</p>
          <div
            v-if="item.lastReturnNotes && item.status === 'Em andamento' && !hasPendingValidation(item)"
            class="return-feedback"
          >
            <MessageSquare :size="14" />
            <div>
              <strong>Devolvido pelo gestor</strong>
              <span v-if="item.lastReturnedByName"> · {{ item.lastReturnedByName }}</span>
              <p>{{ item.lastReturnNotes }}</p>
            </div>
          </div>
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
          <div v-else-if="item.status !== 'Concluída'" class="task-actions">
            <button
              v-if="item.status === 'Em andamento' && !item.hasPendingExtension"
              type="button"
              class="btn-ghost"
              @click="openExtensionModal(item)"
            >
              <CalendarPlus :size="15" />
              Pedir adiamento
            </button>
            <button class="btn-advance" @click="onTaskAction(item)">
              <ArrowRight :size="16" :stroke-width="2.5" />
              {{ item.status === 'Aberta' ? 'Iniciar' : 'Enviar validação' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTasks.length === 0" class="empty-state">
      <ClipboardList :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhuma tarefa encontrada</h3>
      <p>Não há ordens de serviço no momento</p>
    </div>

    <!-- Modal: relatório de validação -->
    <div v-if="reportModal.open" class="sheet-overlay" @click="closeReportModal">
      <section class="sheet" @click.stop>
        <header class="sheet-header">
          <button type="button" class="sheet-close" aria-label="Fechar" @click="closeReportModal">
            <X :size="20" />
          </button>
          <span class="sheet-eyebrow">Validação técnica</span>
          <h3>Relatório de conclusão</h3>
          <p>
            Ativo <strong>{{ reportModal.task?.assetTag }}</strong>
            <span v-if="reportModal.task?.validationDueDisplay">
              · prazo {{ reportModal.task.validationDueDisplay }}
            </span>
          </p>
        </header>

        <div class="sheet-body">
          <div class="field">
            <label><FileText :size="14" /> O que foi executado</label>
            <textarea
              v-model.trim="reportForm.description"
              rows="5"
              placeholder="Descreva intervenção, testes, peças trocadas e resultado final."
            />
          </div>

          <div class="field">
            <label><UploadCloud :size="14" /> Evidências</label>
            <div
              class="dropzone"
              :class="{ active: isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onReportDrop"
              @click="triggerReportFilePicker"
            >
              <UploadCloud :size="32" :stroke-width="1.8" />
              <p>Arraste ficheiros ou <span class="dropzone-link">clique para escolher</span></p>
              <small>{{ uploadLimitsHint }}</small>
            </div>
            <input
              ref="reportFileInput"
              type="file"
              multiple
              class="hidden"
              :accept="uploadAcceptAttr"
              @change="onReportFilesPicked"
            />
            <ul v-if="reportFiles.length" class="file-list">
              <li v-for="(file, index) in reportFiles" :key="`${file.name}-${index}`">
                <Paperclip :size="14" />
                <span>{{ file.name }}</span>
                <button type="button" class="file-remove" @click="removeReportFile(index)">
                  <X :size="14" />
                </button>
              </li>
            </ul>
          </div>

          <p v-if="reportError" class="form-error">{{ reportError }}</p>
        </div>

        <footer class="sheet-footer">
          <button type="button" class="btn-ghost" :disabled="sendingReport" @click="closeReportModal">
            Cancelar
          </button>
          <button type="button" class="btn-primary" :disabled="sendingReport" @click="sendReportForValidation">
            <Send :size="16" />
            {{ sendingReport ? 'A enviar...' : 'Enviar para validação' }}
          </button>
        </footer>
      </section>
    </div>

    <!-- Modal: pedido de adiamento -->
    <div v-if="extensionModal.open" class="sheet-overlay" @click="closeExtensionModal">
      <section class="sheet sheet--compact" @click.stop>
        <header class="sheet-header">
          <button type="button" class="sheet-close" aria-label="Fechar" @click="closeExtensionModal">
            <X :size="20" />
          </button>
          <span class="sheet-eyebrow">Prazo</span>
          <h3>Solicitar adiamento</h3>
          <p v-if="extensionModal.task">
            Ordem do ativo <strong>{{ extensionModal.task.assetTag }}</strong>
            <span v-if="extensionModal.task.validationDueDisplay">
              · prazo atual {{ extensionModal.task.validationDueDisplay }}
            </span>
          </p>
        </header>
        <div class="sheet-body">
          <div class="field">
            <label><CalendarClock :size="14" /> Nova data proposta</label>
            <input v-model="extensionForm.proposedDueAt" type="datetime-local" required />
          </div>
          <div class="field">
            <label><MessageSquare :size="14" /> Justificativa</label>
            <textarea
              v-model.trim="extensionForm.reason"
              rows="4"
              placeholder="Explique o motivo (peças em falta, dependência externa, etc.)."
            />
          </div>
          <p v-if="extensionError" class="form-error">{{ extensionError }}</p>
        </div>
        <footer class="sheet-footer">
          <button type="button" class="btn-ghost" :disabled="sendingExtension" @click="closeExtensionModal">
            Cancelar
          </button>
          <button type="button" class="btn-primary" :disabled="sendingExtension" @click="submitExtensionRequest">
            <CalendarPlus :size="16" />
            {{ sendingExtension ? 'A enviar...' : 'Enviar pedido' }}
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useInventoryStore } from '../stores/inventory'
import type { AttachmentRef, TaskRow } from '../stores/inventory'
import { useAuthStore } from '../stores/auth'
import {
  Search,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Wrench,
  Monitor,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  UploadCloud,
  FileText,
  Paperclip,
  X,
  Send,
  MessageSquare,
} from 'lucide-vue-next'
import { UPLOAD_ACCEPT_ATTR, UPLOAD_TYPES_SHORT_LABEL } from '../constants/attachmentTypes'
import { UPLOAD_LIMITS_HINT, mergeUploadFiles } from '../utils/uploadLimits'

const uploadAcceptAttr = UPLOAD_ACCEPT_ATTR
const uploadLimitsHint = `${UPLOAD_LIMITS_HINT} · ${UPLOAD_TYPES_SHORT_LABEL}`


const inventory = useInventoryStore()
const authStore = useAuthStore()

onMounted(() => {
  void inventory.fetchTasksSafe()
  void inventory.fetchMyApprovalsSafe()
})

const search = ref('')
const sendingReport = ref(false)
const sendingExtension = ref(false)
const reportError = ref('')
const extensionError = ref('')
const isDragging = ref(false)
const reportFileInput = ref<HTMLInputElement | null>(null)
const reportFiles = ref<File[]>([])
const reportModal = reactive<{ open: boolean; task: TaskRow | null }>({
  open: false,
  task: null,
})
const extensionModal = reactive<{ open: boolean; task: TaskRow | null }>({
  open: false,
  task: null,
})
const reportForm = reactive({
  description: '',
})
const extensionForm = reactive({
  proposedDueAt: '',
  reason: '',
})

const tasks = computed(() => inventory.tasks)
const pendingValidationAssetTags = computed(() => {
  const me = authStore.user?.id
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
  if (!input.files?.length) return
  const { files, error } = mergeUploadFiles(reportFiles.value, input.files)
  if (error) {
    reportError.value = error
    return
  }
  reportError.value = ''
  reportFiles.value = files
  input.value = ''
}

const removeReportFile = (index: number) => {
  reportFiles.value.splice(index, 1)
}

const triggerReportFilePicker = () => reportFileInput.value?.click()

const onReportDrop = (event: DragEvent) => {
  isDragging.value = false
  if (!event.dataTransfer?.files?.length) return
  const { files, error } = mergeUploadFiles(reportFiles.value, event.dataTransfer.files)
  if (error) {
    reportError.value = error
    return
  }
  reportError.value = ''
  reportFiles.value = files
}

function defaultExtensionProposal(task: TaskRow) {
  const base = task.validationDueAt ? new Date(task.validationDueAt) : new Date()
  if (Number.isNaN(base.getTime())) {
    base.setTime(Date.now())
  }
  base.setDate(base.getDate() + 2)
  base.setHours(17, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`
}

const openExtensionModal = (task: TaskRow) => {
  extensionError.value = ''
  extensionForm.reason = ''
  extensionForm.proposedDueAt = defaultExtensionProposal(task)
  extensionModal.open = true
  extensionModal.task = task
}

const closeExtensionModal = () => {
  if (sendingExtension.value) return
  extensionModal.open = false
  extensionModal.task = null
}

const submitExtensionRequest = async () => {
  if (!extensionModal.task) return
  extensionError.value = ''
  if (!extensionForm.proposedDueAt) {
    extensionError.value = 'Indique a nova data proposta.'
    return
  }
  if (extensionForm.reason.trim().length < 3) {
    extensionError.value = 'Descreva o motivo do adiamento.'
    return
  }
  sendingExtension.value = true
  try {
    await inventory.requestMaintenanceExtension(extensionModal.task.id, {
      proposedDueAt: new Date(extensionForm.proposedDueAt).toISOString(),
      reason: extensionForm.reason.trim(),
    })
    extensionModal.open = false
    extensionModal.task = null
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    extensionError.value = ax?.response?.data?.message ?? 'Não foi possível enviar o pedido.'
  } finally {
    sendingExtension.value = false
  }
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
    reportError.value = 'Anexe pelo menos um ficheiro como evidência (foto, PDF ou relatório).'
    return
  }

  sendingReport.value = true
  try {
    const shortTaskTitle = String(reportModal.task.task ?? '')
      .trim()
      .slice(0, 420)
    const approvalDescription = `Validação de execução técnica - ${shortTaskTitle}`.slice(0, 500)
    const attachments: AttachmentRef[] = await inventory.uploadAttachments(reportFiles.value)
    await inventory.createApproval({
      type: 'Manutenção',
      maintenanceId: String(reportModal.task.id),
      assetTag: reportModal.task.assetTag,
      description: approvalDescription,
      feedback: reportForm.description.trim(),
      attachments,
    })
    await Promise.allSettled([
      inventory.fetchMyApprovalsSafe(),
      inventory.fetchTasksSafe(),
    ])
    reportModal.open = false
    reportModal.task = null
    reportForm.description = ''
    reportFiles.value = []
    if (reportFileInput.value) reportFileInput.value.value = ''
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

.due-chip {
  display: inline-flex; align-items: center; gap: 6px; margin: 8px 0 0;
  font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px;
}
.due-ok { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.due-soon { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.due-overdue { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.due-none { background: var(--bg-hover); color: var(--text-muted); font-weight: 500; }
.ext-chip {
  margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #a855f7;
}
.return-feedback {
  display: flex; gap: 10px; margin-top: 10px; padding: 10px 12px; border-radius: 10px;
  background: color-mix(in srgb, #ef4444 10%, var(--bg-primary));
  border: 1px solid color-mix(in srgb, #ef4444 28%, var(--border-light));
  font-size: 12px; color: var(--text-secondary);
}
.return-feedback strong { display: block; font-size: 11px; text-transform: uppercase; color: #ef4444; margin-bottom: 4px; }
.return-feedback p { margin: 4px 0 0; line-height: 1.45; color: var(--text-primary); font-size: 13px; }
.task-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-left: auto; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px;
  border: 1px solid var(--border-light); background: transparent; color: var(--text-secondary);
  border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }

.sheet-overlay {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 16px;
}
@media (min-width: 640px) {
  .sheet-overlay { align-items: center; }
}
.sheet {
  width: min(560px, 100%); max-height: 92vh; overflow: auto;
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 16px 16px 0 0; box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column;
}
@media (min-width: 640px) {
  .sheet { border-radius: 16px; }
}
.sheet--compact { width: min(480px, 100%); }
.sheet-header {
  position: relative; padding: 20px 20px 12px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 8%, var(--bg-card)), var(--bg-card));
}
.sheet-eyebrow {
  display: block; font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--primary); margin-bottom: 4px;
}
.sheet-header h3 { margin: 0 0 6px; font-size: 20px; font-weight: 700; }
.sheet-header p { margin: 0; font-size: 13px; color: var(--text-secondary); }
.sheet-close {
  position: absolute; top: 14px; right: 14px; width: 36px; height: 36px;
  border: none; border-radius: 10px; background: var(--bg-hover); color: var(--text-secondary); cursor: pointer;
  display: grid; place-items: center;
}
.sheet-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.sheet-footer {
  padding: 12px 20px 20px; border-top: 1px solid var(--border-light);
  display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
}
.field { display: flex; flex-direction: column; gap: 8px; }
.field label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em;
}
.field textarea, .field input[type='datetime-local'] {
  border: 1px solid var(--border-light); background: var(--bg-primary);
  border-radius: 10px; padding: 12px; color: var(--text-primary); font-size: 14px; font-family: inherit;
}
.field textarea { resize: vertical; min-height: 100px; }
.hidden { display: none; }
.dropzone {
  border: 2px dashed var(--border-light); border-radius: 12px; padding: 24px 16px;
  text-align: center; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;
}
.dropzone:hover, .dropzone.active {
  border-color: var(--primary); background: var(--primary-light); color: var(--text-primary);
}
.dropzone p { margin: 8px 0 4px; font-size: 14px; }
.dropzone small { font-size: 12px; color: var(--text-muted); }
.dropzone-link { color: var(--primary); font-weight: 700; }
.file-list { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.file-list li {
  display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;
  padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-light); font-size: 13px;
}
.file-remove {
  border: none; background: transparent; color: var(--text-muted); cursor: pointer; padding: 4px;
}
.file-remove:hover { color: var(--danger); }
.form-error {
  margin: 0; padding: 10px 12px; border-radius: 8px; font-size: 13px;
  background: var(--danger-light); color: var(--danger); border-left: 3px solid var(--danger);
}
.btn-primary {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
  background: var(--primary); color: white; border: none; border-radius: 10px;
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

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
