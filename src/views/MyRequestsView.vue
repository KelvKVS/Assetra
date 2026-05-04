<template>
  <div class="my-requests">
    <!-- ===== Hero ===== -->
    <header class="hero">
      <div class="hero-text">
        <span class="hero-eyebrow">Minhas solicitações</span>
        <h2>Olá, {{ firstName }}. Precisa de algo?</h2>
        <p>
          Envie uma solicitação de <strong>manutenção</strong> de um ativo ou de
          <strong>movimentação entre setores</strong>. Pode anexar
          <strong>fotos / prints</strong> e a sua justificativa — o gestor recebe na
          tela de Aprovações.
        </p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <Clock :size="18" /> <span>Pendentes</span>
          <strong>{{ counts.pending }}</strong>
        </div>
        <div class="hero-stat">
          <CheckCircle :size="18" /> <span>Aprovadas</span>
          <strong>{{ counts.approved }}</strong>
        </div>
        <div class="hero-stat">
          <XCircle :size="18" /> <span>Reprovadas</span>
          <strong>{{ counts.rejected }}</strong>
        </div>
      </div>
    </header>

    <!-- ===== Cards de escolha ===== -->
    <section v-if="!isFormOpen" class="choice-grid">
      <button class="choice-card maintenance" @click="openForm('Manutenção')">
        <div class="choice-icon">
          <Wrench :size="32" :stroke-width="2.4" />
        </div>
        <h3>Solicitar Manutenção</h3>
        <p>Reportar avaria, defeito ou pedir revisão preventiva de um ativo.</p>
        <span class="choice-cta">
          Começar <ArrowRight :size="16" :stroke-width="2.5" />
        </span>
      </button>

      <button class="choice-card movement" @click="openForm('Movimentação')">
        <div class="choice-icon">
          <ArrowRightLeft :size="32" :stroke-width="2.4" />
        </div>
        <h3>Trocar de Setor</h3>
        <p>Movimentar um ativo de um setor para outro com aprovação do gestor.</p>
        <span class="choice-cta">
          Começar <ArrowRight :size="16" :stroke-width="2.5" />
        </span>
      </button>
    </section>

    <!-- ===== Wizard ===== -->
    <section v-else class="wizard">
      <header class="wizard-header">
        <button class="wizard-back" @click="closeForm" aria-label="Voltar">
          <ArrowLeft :size="18" :stroke-width="2.5" />
        </button>
        <div>
          <span class="wizard-eyebrow">{{ form.type }}</span>
          <h3>
            {{ form.type === 'Manutenção' ? 'Reportar manutenção' : 'Solicitar movimentação' }}
          </h3>
        </div>
        <ol class="wizard-steps">
          <li :class="{ active: step === 1, done: step > 1 }">
            <span>1</span> Detalhes
          </li>
          <li :class="{ active: step === 2, done: step > 2 }">
            <span>2</span> Fotos & feedback
          </li>
          <li :class="{ active: step === 3 }">
            <span>3</span> Revisão
          </li>
        </ol>
      </header>

      <!-- Step 1 -->
      <form v-if="step === 1" class="wizard-body" @submit.prevent="goToStep(2)">
        <div class="grid-2">
          <div class="field">
            <label>
              <Tag :size="14" />
              Tag do ativo
            </label>
            <input
              v-model.trim="form.assetTag"
              type="text"
              list="tags-list"
              placeholder="ex.: AST-001"
              required
            />
            <datalist id="tags-list">
              <option v-for="a in inventory.assets" :key="a.id" :value="a.tag">
                {{ a.description }}
              </option>
            </datalist>
            <p v-if="selectedAsset" class="field-hint">
              {{ selectedAsset.description }} · setor atual: <strong>{{ selectedAsset.sector }}</strong>
            </p>
          </div>

          <div v-if="form.type === 'Manutenção'" class="field">
            <label>
              <AlertTriangle :size="14" />
              Severidade
            </label>
            <div class="severity-row">
              <button
                v-for="opt in severities"
                :key="opt.value"
                type="button"
                :class="['sev-pill', { selected: form.severity === opt.value }, opt.value]"
                @click="form.severity = opt.value"
              >
                <component :is="opt.icon" :size="14" />
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div v-else class="field">
            <label>
              <MapPin :size="14" />
              Setor de destino
            </label>
            <input
              v-model.trim="form.destinationSector"
              type="text"
              placeholder="ex.: Financeiro"
              required
            />
          </div>
        </div>

        <div class="field">
          <label>
            <FileText :size="14" />
            Resumo da solicitação
          </label>
          <input
            v-model.trim="form.description"
            type="text"
            :placeholder="
              form.type === 'Manutenção'
                ? 'ex.: Notebook não liga após queda'
                : 'ex.: Transferir do TI para o Financeiro'
            "
            required
            maxlength="200"
          />
        </div>

        <div class="wizard-actions">
          <button type="button" class="btn-ghost" @click="closeForm">Cancelar</button>
          <button type="submit" class="btn-primary">
            Continuar <ArrowRight :size="16" :stroke-width="2.5" />
          </button>
        </div>
      </form>

      <!-- Step 2 -->
      <form v-else-if="step === 2" class="wizard-body" @submit.prevent="goToStep(3)">
        <div class="field">
          <label>
            <MessageSquare :size="14" />
            Justificativa / feedback
          </label>
          <textarea
            v-model.trim="form.feedback"
            rows="4"
            :placeholder="
              form.type === 'Manutenção'
                ? 'Descreva o que aconteceu, sintomas, quando começou…'
                : 'Explique a razão da movimentação (mudança de equipa, troca de cargo, etc.)'
            "
          ></textarea>
        </div>

        <div class="field">
          <label>
            <ImageIcon :size="14" />
            Fotos / prints
            <span class="field-hint inline">até 6 ficheiros · 8 MB cada</span>
          </label>

          <div
            class="dropzone"
            :class="{ active: isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
            @click="triggerFilePicker"
            role="button"
            tabindex="0"
          >
            <UploadCloud :size="36" :stroke-width="1.8" />
            <p>
              Arraste e largue os ficheiros aqui, ou
              <span class="dropzone-link">clique para escolher</span>
            </p>
            <small>PNG · JPG · WEBP · GIF · PDF</small>
          </div>
          <input
            ref="fileInput"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            class="hidden"
            @change="onFilePick"
          />

          <div v-if="previews.length" class="preview-grid">
            <div v-for="(p, i) in previews" :key="i" class="preview-tile">
              <img v-if="p.kind === 'image'" :src="p.src" :alt="p.name" />
              <div v-else class="preview-doc">
                <FileText :size="22" /><span>{{ truncate(p.name) }}</span>
              </div>
              <span class="preview-name">{{ truncate(p.name) }}</span>
              <button type="button" class="preview-remove" @click="removeFile(i)" aria-label="Remover">
                <X :size="14" :stroke-width="2.5" />
              </button>
            </div>
          </div>
        </div>

        <div class="wizard-actions">
          <button type="button" class="btn-ghost" @click="goToStep(1)">
            <ArrowLeft :size="16" :stroke-width="2.5" /> Voltar
          </button>
          <button type="submit" class="btn-primary">
            Continuar <ArrowRight :size="16" :stroke-width="2.5" />
          </button>
        </div>
      </form>

      <!-- Step 3 - Review -->
      <div v-else class="wizard-body">
        <h4 class="review-title">
          <Sparkles :size="16" />
          Reveja antes de enviar
        </h4>

        <dl class="review-list">
          <div>
            <dt>Tipo</dt>
            <dd>
              <span :class="['type-badge', form.type === 'Manutenção' ? 'type-maintenance' : 'type-movement']">
                <component :is="form.type === 'Manutenção' ? Wrench : ArrowRightLeft" :size="14" />
                {{ form.type }}
              </span>
            </dd>
          </div>
          <div>
            <dt>Ativo</dt>
            <dd>
              <strong>{{ form.assetTag }}</strong>
              <span v-if="selectedAsset"> · {{ selectedAsset.description }}</span>
            </dd>
          </div>
          <div v-if="form.type === 'Manutenção'">
            <dt>Severidade</dt>
            <dd>{{ severityLabel }}</dd>
          </div>
          <div v-else>
            <dt>Destino</dt>
            <dd>
              <span v-if="selectedAsset">{{ selectedAsset.sector }} → </span>
              <strong>{{ form.destinationSector || '—' }}</strong>
            </dd>
          </div>
          <div>
            <dt>Resumo</dt>
            <dd>{{ form.description }}</dd>
          </div>
          <div v-if="form.feedback">
            <dt>Justificativa</dt>
            <dd class="feedback">{{ form.feedback }}</dd>
          </div>
          <div v-if="previews.length">
            <dt>Anexos ({{ previews.length }})</dt>
            <dd>
              <div class="review-thumbs">
                <div v-for="(p, i) in previews" :key="i" class="review-thumb">
                  <img v-if="p.kind === 'image'" :src="p.src" :alt="p.name" />
                  <FileText v-else :size="18" />
                </div>
              </div>
            </dd>
          </div>
        </dl>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <div class="wizard-actions">
          <button type="button" class="btn-ghost" @click="goToStep(2)" :disabled="submitting">
            <ArrowLeft :size="16" :stroke-width="2.5" /> Voltar
          </button>
          <button type="button" class="btn-primary" :disabled="submitting" @click="onSubmit">
            <Loader v-if="submitting" class="spinner" :size="16" />
            <Send v-else :size="16" :stroke-width="2.5" />
            Enviar para aprovação
          </button>
        </div>
      </div>
    </section>

    <!-- ===== Histórico ===== -->
    <section class="history">
      <header class="section-header">
        <h3><History :size="18" /> Histórico das minhas solicitações</h3>
        <div class="filter-tabs">
          <button :class="['tab-btn', { active: filter === 'all' }]" @click="filter = 'all'">
            Todas <span class="tab-count">{{ myApprovals.length }}</span>
          </button>
          <button :class="['tab-btn', { active: filter === 'Pendente' }]" @click="filter = 'Pendente'">
            Pendentes <span class="tab-count">{{ counts.pending }}</span>
          </button>
          <button :class="['tab-btn', { active: filter === 'Aprovada' }]" @click="filter = 'Aprovada'">
            Aprovadas <span class="tab-count">{{ counts.approved }}</span>
          </button>
          <button :class="['tab-btn', { active: filter === 'Reprovada' }]" @click="filter = 'Reprovada'">
            Reprovadas <span class="tab-count">{{ counts.rejected }}</span>
          </button>
        </div>
      </header>

      <div v-if="filteredHistory.length" class="timeline">
        <article
          v-for="item in filteredHistory"
          :key="item.id"
          :class="['timeline-card', `tone-${statusClass(item.status)}`]"
        >
          <div class="timeline-marker">
            <component :is="item.type === 'Manutenção' ? Wrench : ArrowRightLeft" :size="18" :stroke-width="2.5" />
          </div>

          <div class="timeline-content">
            <div class="timeline-top">
              <div>
                <h4>{{ item.assetTag }} · {{ item.description }}</h4>
                <p class="timeline-meta">
                  <Calendar :size="12" /> {{ formatDate(item.createdAt) }}
                </p>
              </div>
              <span :class="['status-badge', `status-${statusClass(item.status)}`]">
                {{ item.status }}
              </span>
            </div>

            <p v-if="item.feedback" class="timeline-feedback">
              <MessageSquare :size="13" /> {{ item.feedback }}
            </p>

            <div v-if="item.attachments?.length" class="timeline-attachments">
              <a
                v-for="(att, idx) in item.attachments"
                :key="idx"
                :href="att.url"
                target="_blank"
                rel="noopener"
                class="att-tile"
              >
                <img v-if="isImage(att.mimetype)" :src="att.url" :alt="att.originalName ?? att.filename" />
                <FileText v-else :size="20" />
              </a>
            </div>

            <div v-if="item.status !== 'Pendente' && (item.notes || item.decidedByName)" class="timeline-decision">
              <ShieldCheck :size="13" />
              <div>
                <strong v-if="item.decidedByName">{{ item.decidedByName }}</strong>
                <span v-if="item.decidedAt"> · {{ formatDate(item.decidedAt) }}</span>
                <p v-if="item.notes">"{{ item.notes }}"</p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <Inbox :size="48" :stroke-width="1.5" />
        <h4>Nenhuma solicitação ainda</h4>
        <p>Crie a primeira clicando num dos cartões acima.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore, type AttachmentRef } from '../stores/inventory'
import { useConfirmAction } from '../composables/useConfirmAction'
import {
  Wrench,
  ArrowRightLeft,
  ArrowLeft,
  ArrowRight,
  Tag,
  AlertTriangle,
  MapPin,
  FileText,
  MessageSquare,
  Image as ImageIcon,
  UploadCloud,
  X,
  Sparkles,
  Send,
  Loader,
  History,
  Calendar,
  ShieldCheck,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  Flame,
  AlertCircle,
  Activity,
} from 'lucide-vue-next'

type RequestType = 'Manutenção' | 'Movimentação'
type Severity = 'baixa' | 'media' | 'alta'

type PreviewKind = 'image' | 'doc'
type Preview = { name: string; src: string; kind: PreviewKind; file: File }

const authStore = useAuthStore()
const inventory = useInventoryStore()
const confirm = useConfirmAction()

const firstName = computed(() => authStore.user?.name?.split(' ')[0] ?? 'utilizador')

const isFormOpen = ref(false)
const step = ref(1)
const submitting = ref(false)
const formError = ref('')
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const severities: { value: Severity; label: string; icon: Component }[] = [
  { value: 'baixa', label: 'Baixa', icon: Activity },
  { value: 'media', label: 'Média', icon: AlertCircle },
  { value: 'alta', label: 'Alta', icon: Flame },
]

const form = reactive({
  type: 'Manutenção' as RequestType,
  assetTag: '',
  destinationSector: '',
  severity: 'media' as Severity,
  description: '',
  feedback: '',
})

const files = ref<File[]>([])
const previews = ref<Preview[]>([])

const selectedAsset = computed(() =>
  inventory.assets.find((a) => a.tag.toLowerCase() === form.assetTag.toLowerCase()),
)

const severityLabel = computed(() => severities.find((s) => s.value === form.severity)?.label ?? '—')

const myApprovals = computed(() => inventory.myApprovals)

const counts = computed(() => ({
  pending: myApprovals.value.filter((a) => a.status === 'Pendente').length,
  approved: myApprovals.value.filter((a) => a.status === 'Aprovada').length,
  rejected: myApprovals.value.filter((a) => a.status === 'Reprovada').length,
}))

const filter = ref<'all' | 'Pendente' | 'Aprovada' | 'Reprovada'>('all')
const filteredHistory = computed(() => {
  if (filter.value === 'all') return myApprovals.value
  return myApprovals.value.filter((a) => a.status === filter.value)
})

onMounted(async () => {
  await Promise.allSettled([inventory.fetchAssets(), inventory.fetchMyApprovalsSafe()])
})

const openForm = (type: RequestType) => {
  form.type = type
  form.assetTag = ''
  form.destinationSector = ''
  form.severity = 'media'
  form.description = ''
  form.feedback = ''
  files.value = []
  previews.value = []
  step.value = 1
  formError.value = ''
  isFormOpen.value = true
}

const closeForm = () => {
  isFormOpen.value = false
}

const goToStep = (n: number) => {
  step.value = n
  formError.value = ''
}

const triggerFilePicker = () => fileInput.value?.click()

const acceptFiles = (incoming: FileList | File[]) => {
  const arr = Array.from(incoming)
  const merged = [...files.value, ...arr].slice(0, 6)
  files.value = merged
  previews.value = merged.map((file) => {
    const isImg = file.type.startsWith('image/')
    return {
      name: file.name,
      src: isImg ? URL.createObjectURL(file) : '',
      kind: isImg ? 'image' : 'doc',
      file,
    }
  })
}

const onFilePick = (ev: Event) => {
  const input = ev.target as HTMLInputElement
  if (!input.files) return
  acceptFiles(input.files)
  input.value = ''
}

const onDrop = (ev: DragEvent) => {
  isDragging.value = false
  if (ev.dataTransfer?.files) acceptFiles(ev.dataTransfer.files)
}

const removeFile = (i: number) => {
  const removed = previews.value[i]
  if (removed && removed.kind === 'image' && removed.src) URL.revokeObjectURL(removed.src)
  files.value.splice(i, 1)
  previews.value.splice(i, 1)
}

watch(isFormOpen, (val) => {
  if (!val) {
    previews.value.forEach((p) => p.kind === 'image' && URL.revokeObjectURL(p.src))
  }
})

const truncate = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

const isImage = (mime?: string) => Boolean(mime && mime.startsWith('image/'))

const formatDate = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

const statusClass = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')

const onSubmit = async () => {
  if (submitting.value) return
  formError.value = ''

  const ok = await confirm.ask(
    'Confirme com a sua senha para enviar esta solicitação ao gestor.',
    'Confirmar envio',
  )
  if (!ok) return

  submitting.value = true
  try {
    let attachments: AttachmentRef[] = []
    if (files.value.length) {
      attachments = await inventory.uploadAttachments(files.value)
    }

    const description =
      form.type === 'Movimentação' && form.destinationSector
        ? `${form.description} (destino: ${form.destinationSector})`
        : form.description

    const feedback =
      form.type === 'Manutenção'
        ? [`Severidade: ${severityLabel.value}`, form.feedback].filter(Boolean).join('\n')
        : form.feedback || undefined

    await inventory.createApproval({
      type: form.type,
      assetTag: form.assetTag,
      description,
      feedback,
      attachments,
    })

    isFormOpen.value = false
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Não foi possível enviar a solicitação.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.my-requests { animation: fade-up 0.4s ease; display: flex; flex-direction: column; gap: 24px; }

/* ===== Hero ===== */
.hero {
  display: flex; gap: 24px; flex-wrap: wrap; justify-content: space-between; align-items: center;
  padding: 28px 28px;
  background:
    radial-gradient(circle at top right, rgba(59,130,246,0.18), transparent 55%),
    radial-gradient(circle at bottom left, rgba(168,85,247,0.10), transparent 60%),
    var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
}
.hero-text { max-width: 620px; }
.hero-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: var(--primary); text-transform: uppercase; }
.hero h2 { margin: 6px 0 8px; font-size: 26px; color: var(--text-primary); }
.hero p { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; }

.hero-stats { display: flex; gap: 12px; flex-wrap: wrap; }
.hero-stat {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 12px 16px; min-width: 110px;
  background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: 12px;
}
.hero-stat svg { color: var(--text-muted); }
.hero-stat span { font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; font-weight: 600; }
.hero-stat strong { font-size: 22px; color: var(--text-primary); font-weight: 800; }

/* ===== Choice ===== */
.choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.choice-card {
  position: relative; text-align: left; padding: 28px;
  border-radius: 16px; cursor: pointer; transition: all 0.25s ease;
  background: var(--bg-card); border: 1px solid var(--border-light);
  display: flex; flex-direction: column; gap: 10px;
}
.choice-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--primary); }
.choice-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.choice-card h3 { margin: 0; font-size: 18px; color: var(--text-primary); }
.choice-card p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.choice-icon {
  width: 56px; height: 56px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
}
.choice-card.maintenance .choice-icon { background: rgba(245, 158, 11, 0.18); color: #f59e0b; }
.choice-card.movement .choice-icon { background: rgba(6, 182, 212, 0.18); color: #06b6d4; }
.choice-cta {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
  font-size: 13px; font-weight: 700; color: var(--primary);
}

/* ===== Wizard ===== */
.wizard {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 22px;
  box-shadow: var(--shadow-md);
  animation: pop 0.25s ease-out;
}
.wizard-header {
  display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center;
  padding-bottom: 16px; border-bottom: 1px solid var(--border-light);
}
.wizard-back {
  background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary);
  width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.wizard-eyebrow { font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; }
.wizard-header h3 { margin: 4px 0 0; font-size: 18px; color: var(--text-primary); }

.wizard-steps { list-style: none; padding: 0; margin: 0; display: flex; gap: 8px; }
.wizard-steps li {
  display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
  color: var(--text-muted); padding: 6px 12px; border-radius: 999px; background: var(--bg-primary);
  border: 1px solid var(--border-light);
  transition: all 0.2s ease;
}
.wizard-steps li span {
  width: 18px; height: 18px; border-radius: 50%; background: var(--bg-hover);
  display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--text-secondary);
}
.wizard-steps li.active { color: var(--primary); border-color: var(--primary); background: var(--primary-light); }
.wizard-steps li.active span { background: var(--primary); color: white; }
.wizard-steps li.done { color: var(--success); border-color: var(--success); }
.wizard-steps li.done span { background: var(--success); color: white; }

.wizard-body { display: flex; flex-direction: column; gap: 16px; }

.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.field input, .field textarea {
  padding: 11px 12px; background: var(--bg-primary); border: 1px solid var(--border-light);
  border-radius: 10px; color: var(--text-primary); font-size: 14px; font-family: inherit;
  transition: all 0.15s ease;
}
.field input:focus, .field textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.field textarea { resize: vertical; min-height: 90px; }
.field-hint { margin: 0; font-size: 12px; color: var(--text-muted); font-weight: 500; text-transform: none; letter-spacing: 0; }
.field-hint.inline { margin-left: 4px; }

.severity-row { display: flex; gap: 8px; flex-wrap: wrap; }
.sev-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; background: var(--bg-primary);
  border: 1px solid var(--border-light); border-radius: 999px;
  font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer;
  transition: all 0.15s ease;
}
.sev-pill:hover { border-color: var(--primary); color: var(--text-primary); }
.sev-pill.selected.baixa { background: rgba(34,197,94,0.15); color: #22c55e; border-color: #22c55e; }
.sev-pill.selected.media { background: rgba(245,158,11,0.15); color: #f59e0b; border-color: #f59e0b; }
.sev-pill.selected.alta { background: rgba(239,68,68,0.15); color: #ef4444; border-color: #ef4444; }

/* Dropzone & previews */
.hidden { display: none; }
.dropzone {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  padding: 32px 20px; text-align: center; border-radius: 12px; cursor: pointer;
  border: 2px dashed var(--border-light); background: var(--bg-primary);
  color: var(--text-secondary); transition: all 0.18s ease;
}
.dropzone:hover, .dropzone.active { border-color: var(--primary); background: var(--primary-light); color: var(--text-primary); }
.dropzone p { margin: 0; font-size: 14px; }
.dropzone small { color: var(--text-muted); font-size: 12px; }
.dropzone-link { color: var(--primary); font-weight: 700; }

.preview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px; margin-top: 12px;
}
.preview-tile {
  position: relative; background: var(--bg-primary); border: 1px solid var(--border-light);
  border-radius: 10px; padding: 6px; display: flex; flex-direction: column; gap: 4px; min-height: 110px;
  overflow: hidden;
}
.preview-tile img { width: 100%; height: 80px; object-fit: cover; border-radius: 6px; }
.preview-doc {
  display: flex; align-items: center; gap: 6px; height: 80px;
  background: var(--bg-hover); border-radius: 6px; padding: 8px; color: var(--text-secondary); font-size: 12px;
}
.preview-name {
  font-size: 11px; color: var(--text-secondary); text-align: center;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.preview-remove {
  position: absolute; top: 4px; right: 4px;
  background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%;
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.preview-remove:hover { background: var(--danger); }

.wizard-actions {
  display: flex; justify-content: space-between; gap: 10px;
  padding-top: 16px; border-top: 1px solid var(--border-light);
}

.btn-primary, .btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 0.15s ease; border: 1px solid transparent;
}
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
.btn-ghost { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-light); }
.btn-ghost:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }

/* Review */
.review-title {
  display: inline-flex; align-items: center; gap: 6px; margin: 0;
  font-size: 14px; font-weight: 700; color: var(--primary);
}
.review-list { margin: 0; display: grid; grid-template-columns: 1fr; gap: 12px; }
.review-list > div {
  display: grid; grid-template-columns: 130px 1fr; gap: 12px;
  padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: 10px;
}
.review-list dt { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; align-self: center; }
.review-list dd { margin: 0; font-size: 13px; color: var(--text-primary); align-self: center; }
.review-list dd.feedback { white-space: pre-wrap; line-height: 1.5; color: var(--text-secondary); }

.type-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.type-maintenance { background: rgba(245,158,11,0.15); color: #f59e0b; }
.type-movement { background: rgba(6,182,212,0.15); color: #06b6d4; }

.review-thumbs { display: flex; gap: 6px; flex-wrap: wrap; }
.review-thumb {
  width: 50px; height: 50px; background: var(--bg-hover);
  border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; color: var(--text-muted);
}
.review-thumb img { width: 100%; height: 100%; object-fit: cover; }

.form-error {
  margin: 0; padding: 10px 12px; background: var(--danger-light); color: var(--danger);
  border-left: 3px solid var(--danger); border-radius: 8px; font-size: 13px; font-weight: 500;
}

/* ===== History ===== */
.section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
.section-header h3 {
  display: inline-flex; align-items: center; gap: 8px;
  margin: 0; font-size: 16px; color: var(--text-primary);
}

.filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: 999px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn:hover { border-color: var(--primary); color: var(--text-primary); }
.tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
.tab-count {
  display: inline-flex; align-items: center; justify-content: center; min-width: 22px; padding: 0 6px; height: 18px;
  background: rgba(255,255,255,0.15); color: inherit; border-radius: 999px; font-size: 11px; font-weight: 700;
}
.tab-btn:not(.active) .tab-count { background: var(--bg-hover); color: var(--text-secondary); }

/* Timeline */
.timeline { display: flex; flex-direction: column; gap: 12px; }
.timeline-card {
  display: grid; grid-template-columns: 56px 1fr; gap: 16px; align-items: stretch;
  padding: 16px; border-radius: 14px; background: var(--bg-card); border: 1px solid var(--border-light);
  border-left-width: 4px; transition: all 0.2s ease;
}
.timeline-card:hover { transform: translateX(2px); box-shadow: var(--shadow-md); }
.timeline-card.tone-pendente { border-left-color: #f59e0b; }
.timeline-card.tone-aprovada { border-left-color: #22c55e; }
.timeline-card.tone-reprovada { border-left-color: #ef4444; }

.timeline-marker {
  width: 44px; height: 44px; border-radius: 50%; align-self: start;
  display: flex; align-items: center; justify-content: center; color: white;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
}

.timeline-content { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.timeline-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.timeline-top h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary); }
.timeline-meta { display: inline-flex; align-items: center; gap: 4px; margin: 4px 0 0; font-size: 12px; color: var(--text-muted); }

.status-badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
.status-pendente { background: rgba(245,158,11,0.15); color: #f59e0b; }
.status-aprovada { background: rgba(34,197,94,0.15); color: #22c55e; }
.status-reprovada { background: rgba(239,68,68,0.15); color: #ef4444; }

.timeline-feedback {
  display: inline-flex; align-items: flex-start; gap: 6px; margin: 0;
  padding: 8px 12px; background: var(--bg-primary); border-radius: 8px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.4;
}
.timeline-feedback svg { margin-top: 2px; color: var(--text-muted); flex-shrink: 0; }

.timeline-attachments { display: flex; gap: 6px; flex-wrap: wrap; }
.att-tile {
  width: 70px; height: 70px; border-radius: 10px;
  overflow: hidden; background: var(--bg-primary); border: 1px solid var(--border-light);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); transition: all 0.18s ease;
}
.att-tile:hover { transform: translateY(-2px); border-color: var(--primary); }
.att-tile img { width: 100%; height: 100%; object-fit: cover; }

.timeline-decision {
  display: grid; grid-template-columns: 16px 1fr; gap: 8px;
  padding: 10px 12px; background: var(--bg-primary); border-radius: 10px;
  font-size: 12px; color: var(--text-secondary);
}
.timeline-decision svg { margin-top: 3px; color: var(--text-muted); }
.timeline-decision strong { color: var(--text-primary); }
.timeline-decision p { margin: 4px 0 0; font-style: italic; }

/* Empty */
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 50px 20px; color: var(--text-muted); text-align: center;
  border: 1px dashed var(--border-light); border-radius: 14px; background: var(--bg-card);
}
.empty-state h4 { margin: 4px 0 0; font-size: 16px; color: var(--text-secondary); font-weight: 700; }
.empty-state p { margin: 0; font-size: 13px; }

.spinner { animation: spin 0.9s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop { from { opacity: 0; transform: translateY(6px) scale(0.99); } to { opacity: 1; transform: none; } }

@media (max-width: 720px) {
  .hero { padding: 22px; }
  .hero-stats { width: 100%; }
  .wizard-header { grid-template-columns: auto 1fr; }
  .wizard-steps { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; }
  .review-list > div { grid-template-columns: 1fr; gap: 4px; }
  .review-list dt { font-size: 11px; }
  .timeline-card { grid-template-columns: 1fr; }
  .timeline-marker { width: 36px; height: 36px; }
}
</style>
