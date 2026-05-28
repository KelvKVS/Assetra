<template>
  <div class="assets-page">
    <!-- Header Section -->
    <header class="hero">
      <div class="hero-text">
        <span class="hero-eyebrow">Inventário</span>
        <h2>Ativos de TI</h2>
        <p class="muted">
          Cadastro e acompanhamento de equipamentos
          <template v-if="!canManageAssets"> · Apenas gestores e administradores podem criar, editar ou excluir.</template>
        </p>
      </div>
      <div class="hero-actions">
        <button v-if="canManageAssets" class="btn-primary" @click="toggleAssetForm">
          <Plus :size="18" :stroke-width="2.5" />
          {{ showForm ? 'Fechar' : 'Novo Ativo' }}
        </button>
      </div>
    </header>

    <!-- Add Asset Form -->
    <div v-if="canManageAssets && showForm" class="form-card form-card-elevated">
      <div class="form-head">
        <span class="form-eyebrow">Novo ativo</span>
        <h3>Cadastrar novo ativo</h3>
      </div>
      <ol class="wizard-steps">
        <li v-for="(label, idx) in assetStepLabels" :key="label" :class="{ active: assetStep === idx + 1, done: assetStep > idx + 1 }">
          <span>{{ idx + 1 }}</span>{{ label }}
        </li>
      </ol>
      <form @submit.prevent="addAsset" class="asset-form modern-form">
        <template v-if="assetStep === 1">
          <div class="form-group field">
            <label>Tag</label>
            <input v-model.trim="newAsset.tag" type="text" placeholder="Ex: AST-200" required />
          </div>
          <div class="form-group field">
            <label>Descrição</label>
            <input v-model.trim="newAsset.description" type="text" placeholder="Descrição do ativo" required />
          </div>
          <div class="form-group field field-wide">
            <label>Setor</label>
            <input v-model.trim="newAsset.sector" type="text" placeholder="Setor" required />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-primary" @click="goToAssetStep(2)">Continuar</button>
          </div>
        </template>

        <template v-else>
          <div class="form-group field">
            <label>Status</label>
            <select v-model="newAsset.status" required>
              <option>Em uso</option>
              <option>Disponível</option>
              <option>Em manutenção</option>
            </select>
          </div>
          <div class="form-group field field-wide">
            <label>Responsável (e-mail)</label>
            <input
              v-model.trim="newAsset.assignedTo"
              type="email"
              autocomplete="off"
              placeholder="ex.: gestor@assetra.local (opcional)"
              @focus="isCreateResponsibleFocused = true"
              @blur="hideCreateResponsibleSuggestions"
            />
            <div v-if="showCreateResponsibleSuggestions" class="suggestion-panel">
              <button
                v-for="user in filteredCreateResponsibleSuggestions"
                :key="`create-user-${user.id}`"
                type="button"
                class="suggestion-item"
                @mousedown.prevent="pickCreateResponsible(user.email)"
              >
                <strong>{{ user.name }}</strong>
                <span>{{ user.email }}</span>
              </button>
            </div>
          </div>
          <div class="form-group field field-wide">
            <label>Fotos do ativo</label>
            <div class="upload-shell">
              <label class="btn-secondary upload-btn">
                <Paperclip :size="16" />
                Subir fotos
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  class="file-hidden"
                  @change="onCreateFilesPick"
                />
              </label>
              <small class="field-hint">{{ uploadLimitsHint }}</small>
            </div>
            <ul v-if="selectedCreateFiles.length" class="picked-list">
              <li v-for="(file, idx) in selectedCreateFiles" :key="`${file.name}-${idx}`">
                <span>{{ file.name }}</span>
                <button type="button" class="picked-remove" @click="removeCreateFile(idx)">Remover</button>
              </li>
            </ul>
            <div v-if="createPreviewUrls.length" class="photo-preview-row">
              <img
                v-for="(src, idx) in createPreviewUrls"
                :key="`create-preview-${idx}`"
                :src="src"
                :alt="selectedCreateFiles[idx]?.name ?? 'Pré-visualização'"
                class="clickable-thumb"
              />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" :disabled="isSaving" @click="goToAssetStep(1)">Voltar</button>
            <button type="submit" class="btn-primary" :disabled="isSaving">
              {{ isSaving ? 'A guardar...' : 'Cadastrar' }}
            </button>
            <button type="button" class="btn-secondary" :disabled="isSaving" @click="closeAssetForm">Cancelar</button>
          </div>
        </template>
      </form>
      <p v-if="formError" class="error-message">{{ formError }}</p>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <Monitor :size="24" :stroke-width="2" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Total de ativos</span>
          <span class="stat-value">{{ assets.length }}</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <CheckCircle :size="24" :stroke-width="2" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Em uso</span>
          <span class="stat-value">{{ usageStats.inUse }}</span>
        </div>
      </div>
      <div class="stat-card stat-info">
        <Package :size="24" :stroke-width="2" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Disponíveis</span>
          <span class="stat-value">{{ usageStats.available }}</span>
        </div>
      </div>
      <div class="stat-card stat-warning">
        <Wrench :size="24" :stroke-width="2" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Em manutenção</span>
          <span class="stat-value">{{ usageStats.maintenance }}</span>
        </div>
      </div>
    </div>

    <p v-if="assignedFilter" class="assigned-filter-banner">
      A mostrar ativos do responsável <strong>{{ route.query.assigned }}</strong>
      <RouterLink :to="{ name: 'assets' }" class="assigned-filter-clear">Ver todos</RouterLink>
    </p>

    <!-- Filtros e visualização -->
    <div class="list-toolbar">
      <div class="search-bar search-bar--page">
        <Search :size="18" :stroke-width="2" />
        <input
          v-model.trim="pageSearch"
          type="search"
          placeholder="Buscar por tag, descrição, setor ou responsável..."
        />
      </div>
      <div class="toolbar-controls">
        <label class="filter-select-wrap">
          <span class="sr-only">Filtrar por status</span>
          <select v-model="statusFilter" class="filter-select">
            <option value="all">Todos os status</option>
            <option value="Em uso">Em uso</option>
            <option value="Disponível">Disponível</option>
            <option value="Em manutenção">Em manutenção</option>
          </select>
        </label>
        <div class="view-toggle" role="group" aria-label="Modo de visualização">
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ active: viewMode === 'cards' }"
            title="Cartões detalhados"
            @click="viewMode = 'cards'"
          >
            <LayoutGrid :size="16" :stroke-width="2.5" />
            <span>Detalhes</span>
          </button>
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ active: viewMode === 'compact' }"
            title="Miniatura e nome"
            @click="viewMode = 'compact'"
          >
            <LayoutList :size="16" :stroke-width="2.5" />
            <span>Miniaturas</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Assets Grid -->
    <div :class="['assets-grid', viewMode === 'compact' && 'assets-grid--compact']">
      <article
        v-for="asset in filteredAssets"
        :key="asset.id ?? asset.tag"
        :class="[
          'asset-card',
          viewMode === 'compact' && 'asset-card--compact',
          !coverPhoto(asset) && 'asset-card--no-cover',
        ]"
      >
        <template v-if="viewMode === 'cards'">
        <button
          v-if="coverPhoto(asset)"
          type="button"
          class="asset-cover asset-cover-btn"
          :aria-label="`Ver fotos de ${asset.tag}`"
          @click.stop="openGallery(asset, coverPhoto(asset)!)"
        >
            <AssetImage :attachment="coverPhoto(asset)!" :alt="coverPhoto(asset)!.originalName ?? asset.tag" />
          </button>
          <div class="asset-header" :class="{ 'asset-header--with-cover': coverPhoto(asset) }">
            <div v-if="!coverPhoto(asset)" class="asset-icon">
              <Monitor :size="24" :stroke-width="2" />
            </div>
            <div class="asset-status">
              <span :class="['status-badge', `status-${asset.status.toLowerCase().replace(' ', '-')}`]">
                {{ asset.status }}
              </span>
            </div>
          </div>
        <div class="asset-info">
          <h3 class="asset-tag">{{ asset.tag }}</h3>
          <p class="asset-description">{{ asset.description }}</p>
          <div class="asset-details">
            <div class="detail-item">
              <MapPin :size="14" :stroke-width="2.5" />
              <span>{{ asset.sector }}</span>
            </div>
            <div v-if="asset.assignedTo" class="detail-item">
              <span class="detail-label">Resp.</span>
              <span>{{ asset.assignedTo }}</span>
            </div>
            <div v-if="asset.attachments?.length" class="detail-item">
              <Paperclip :size="14" :stroke-width="2.5" />
              <span>{{ asset.attachments.length }} foto(s)</span>
            </div>
          </div>
          <div v-if="imageAttachments(asset.attachments).length > 1" class="asset-gallery">
            <button
              v-for="(att, idx) in imageAttachments(asset.attachments).slice(1)"
              :key="`${asset.tag}-photo-${idx}`"
              type="button"
              class="gallery-thumb"
              :aria-label="`Abrir foto ${idx + 2} de ${asset.tag}`"
              @click.stop="openGallery(asset, att)"
            >
              <img :src="att.url" :alt="att.originalName ?? att.filename" />
            </button>
          </div>
        </div>
        <div v-if="canManageAssets" class="asset-actions">
          <button class="btn-icon" @click="startAssetEdit(asset)" title="Editar">
            <Edit :size="18" :stroke-width="2.5" />
          </button>
          <button class="btn-icon btn-danger" @click="removeAsset(asset)" title="Excluir">
            <Trash2 :size="18" :stroke-width="2.5" />
          </button>
        </div>
        </template>

        <template v-else>
          <button
            v-if="coverPhoto(asset)"
            type="button"
            class="compact-thumb"
            :aria-label="`Ver fotos de ${asset.tag}`"
            @click.stop="openGallery(asset, coverPhoto(asset)!)"
          >
            <AssetImage :attachment="coverPhoto(asset)!" :alt="coverPhoto(asset)!.originalName ?? asset.tag" />
          </button>
          <div v-else class="compact-thumb compact-thumb--empty" aria-hidden="true">
            <Monitor :size="22" :stroke-width="2" />
          </div>
          <div class="compact-body">
            <div class="compact-title-row">
              <h3 class="asset-tag">{{ asset.tag }}</h3>
              <span :class="['status-badge', `status-${asset.status.toLowerCase().replace(' ', '-')}`]">
                {{ asset.status }}
              </span>
            </div>
            <p class="asset-description">{{ asset.description }}</p>
            <small class="compact-meta">{{ asset.sector }}</small>
          </div>
          <div v-if="canManageAssets" class="compact-actions">
            <button class="btn-icon" @click="startAssetEdit(asset)" title="Editar">
              <Edit :size="16" :stroke-width="2.5" />
            </button>
            <button class="btn-icon btn-danger" @click="removeAsset(asset)" title="Excluir">
              <Trash2 :size="16" :stroke-width="2.5" />
            </button>
          </div>
        </template>
      </article>
    </div>

    <!-- Edit Modal -->
    <div v-if="editingAssetId" class="modal-overlay" @click="cancelAssetEdit">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Ativo</h3>
          <button class="btn-close" @click="cancelAssetEdit">
            <X :size="20" :stroke-width="2.5" />
          </button>
        </div>
        <form @submit.prevent="saveAssetEdit()" class="modal-form">
          <div class="form-group">
            <label>Tag</label>
            <input v-model.trim="editAsset.tag" type="text" required />
          </div>
          <div class="form-group">
            <label>Descrição</label>
            <input v-model.trim="editAsset.description" type="text" required />
          </div>
          <div class="form-group">
            <label>Setor</label>
            <input v-model.trim="editAsset.sector" type="text" required />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="editAsset.status" required>
              <option>Em uso</option>
              <option>Disponível</option>
              <option>Em manutenção</option>
            </select>
          </div>
          <div class="form-group">
            <label>Responsável (e-mail)</label>
            <input
              v-model.trim="editAsset.assignedTo"
              type="email"
              autocomplete="off"
              placeholder="Opcional — deixe vazio para limpar"
              @focus="isEditResponsibleFocused = true"
              @blur="hideEditResponsibleSuggestions"
            />
            <div v-if="showEditResponsibleSuggestions" class="suggestion-panel">
              <button
                v-for="user in filteredEditResponsibleSuggestions"
                :key="`edit-user-${user.id}`"
                type="button"
                class="suggestion-item"
                @mousedown.prevent="pickEditResponsible(user.email)"
              >
                <strong>{{ user.name }}</strong>
                <span>{{ user.email }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Fotos do ativo</label>
            <div v-if="editAttachments.length" class="edit-attachments">
              <div v-for="(att, idx) in editAttachments" :key="`edit-att-${att.filename}-${idx}`" class="edit-att-item">
                <img
                  v-if="!att.mimetype || att.mimetype.startsWith('image/')"
                  :src="att.url"
                  :alt="att.originalName ?? att.filename"
                  class="clickable-thumb"
                />
                <span v-else>{{ att.originalName ?? att.filename }}</span>
                <button type="button" class="picked-remove" @click="removeEditAttachment(idx)">Remover</button>
              </div>
            </div>
            <div class="upload-shell">
              <label class="btn-secondary upload-btn">
                <Paperclip :size="16" />
                Adicionar fotos
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  class="file-hidden"
                  @change="onEditFilesPick"
                />
              </label>
              <small class="field-hint">{{ uploadLimitsHint }}</small>
            </div>
            <ul v-if="selectedEditFiles.length" class="picked-list">
              <li v-for="(file, idx) in selectedEditFiles" :key="`edit-file-${file.name}-${idx}`">
                <span>{{ file.name }}</span>
                <button type="button" class="picked-remove" @click="removeEditFile(idx)">Remover</button>
              </li>
            </ul>
          </div>
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Salvar</button>
            <button type="button" class="btn-secondary" @click="cancelAssetEdit">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalPageSearch } from '../composables/useLocalPageSearch'
import { useAssetViewMode } from '../composables/useAssetViewMode'
import { type Asset, type AssetStatus, type AttachmentRef } from '../types/assetra'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore } from '../stores/inventory'
import { useConfirmAction } from '../composables/useConfirmAction'
import AssetImage from '../components/AssetImage.vue'
import { imageAttachments, useImageLightbox } from '../composables/useImageLightbox'
import { prepareAttachmentsForApi } from '../utils/attachmentPayload'
import { UPLOAD_LIMITS_HINT, mergeUploadFiles } from '../utils/uploadLimits'
import { RouterLink } from 'vue-router'
import { Plus, Search, Monitor, CheckCircle, Package, Wrench, MapPin, Edit, Trash2, X, Paperclip, LayoutGrid, LayoutList } from 'lucide-vue-next'

const uploadLimitsHint = UPLOAD_LIMITS_HINT

const confirm = useConfirmAction()
const imageLightbox = useImageLightbox()
const openGallery = (asset: Asset, clicked?: AttachmentRef) => imageLightbox.openFromAsset(asset, clicked)

const route = useRoute()
const authStore = useAuthStore()
const assignedFilter = computed(() => String(route.query.assigned ?? '').trim().toLowerCase())
const canManageAssets = computed(() => ['ADM', 'GESTOR'].includes(authStore.user?.role ?? ''))

const { pageSearch, matchesPageSearch } = useLocalPageSearch()
const { viewMode } = useAssetViewMode()
const statusFilter = ref<'all' | AssetStatus>('all')

const showForm = ref(false)
const assetStep = ref(1)
const assetStepLabels = ['Dados básicos', 'Status e revisão']
const formError = ref('')
const isSaving = ref(false)
const editingAssetId = ref<string | null>(null)
const isCreateResponsibleFocused = ref(false)
const isEditResponsibleFocused = ref(false)
const selectedCreateFiles = ref<File[]>([])
const selectedEditFiles = ref<File[]>([])
const editAttachments = ref<AttachmentRef[]>([])
const createPreviewUrls = ref<string[]>([])
const coverPhoto = (asset: Asset) => imageAttachments(asset.attachments)[0]
const editAsset = reactive<Asset>({
  tag: '',
  description: '',
  sector: '',
  status: 'Disponível',
  assignedTo: '',
})
const inventory = useInventoryStore()

const assets = computed(() => inventory.assets)
const newAsset = reactive<Asset>({
  tag: '',
  description: '',
  sector: '',
  status: 'Disponível',
  assignedTo: '',
})

const filteredAssets = computed(() => {
  return assets.value.filter((asset) => {
    if (assignedFilter.value) {
      const email = (asset.assignedTo ?? '').trim().toLowerCase()
      if (email !== assignedFilter.value) return false
    }
    if (statusFilter.value !== 'all' && asset.status !== statusFilter.value) return false
    return matchesPageSearch(asset.tag, asset.description, asset.sector, asset.status, asset.assignedTo)
  })
})
const availableUsers = computed(() => inventory.users.filter((u) => u.status === 'Ativo'))
const filteredCreateResponsibleSuggestions = computed(() => {
  const q = String(newAsset.assignedTo ?? '').trim().toLowerCase()
  if (!q) return availableUsers.value.slice(0, 8)
  return availableUsers.value.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)).slice(0, 6)
})
const filteredEditResponsibleSuggestions = computed(() => {
  const q = String(editAsset.assignedTo ?? '').trim().toLowerCase()
  if (!q) return availableUsers.value.slice(0, 8)
  return availableUsers.value.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)).slice(0, 6)
})
const showCreateResponsibleSuggestions = computed(
  () => isCreateResponsibleFocused.value && filteredCreateResponsibleSuggestions.value.length > 0,
)
const showEditResponsibleSuggestions = computed(
  () => isEditResponsibleFocused.value && filteredEditResponsibleSuggestions.value.length > 0,
)

const usageStats = computed(() => ({
  inUse: inventory.assets.filter((item) => item.status === 'Em uso').length,
  available: inventory.assets.filter((item) => item.status === 'Disponível').length,
  maintenance: inventory.assets.filter((item) => item.status === 'Em manutenção').length,
}))

onMounted(async () => {
  try {
    await Promise.all([inventory.fetchAssets(), inventory.fetchUsers()])
  } catch {
    formError.value = inventory.error || 'Não foi possível carregar os ativos.'
  }
})
const pickCreateResponsible = (email: string) => {
  newAsset.assignedTo = email
  isCreateResponsibleFocused.value = false
}
const pickEditResponsible = (email: string) => {
  editAsset.assignedTo = email
  isEditResponsibleFocused.value = false
}
const hideCreateResponsibleSuggestions = () => {
  window.setTimeout(() => {
    isCreateResponsibleFocused.value = false
  }, 120)
}
const hideEditResponsibleSuggestions = () => {
  window.setTimeout(() => {
    isEditResponsibleFocused.value = false
  }, 120)
}

const revokeCreatePreviews = () => {
  createPreviewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  createPreviewUrls.value = []
}

watch(selectedCreateFiles, (files) => {
  revokeCreatePreviews()
  createPreviewUrls.value = files.map((f) => URL.createObjectURL(f))
})

onBeforeUnmount(() => revokeCreatePreviews())

const onCreateFilesPick = (ev: Event) => {
  const input = ev.target as HTMLInputElement
  if (!input.files?.length) return
  const { files, error } = mergeUploadFiles(selectedCreateFiles.value, input.files)
  if (error) formError.value = error
  selectedCreateFiles.value = files
  input.value = ''
}

const removeCreateFile = (index: number) => {
  selectedCreateFiles.value.splice(index, 1)
}

const toggleAssetForm = () => {
  showForm.value = !showForm.value
  if (showForm.value) {
    assetStep.value = 1
    formError.value = ''
  }
}

const closeAssetForm = () => {
  showForm.value = false
  assetStep.value = 1
}

const goToAssetStep = (step: number) => {
  if (step === 2) {
    if (!newAsset.tag.trim() || !newAsset.description.trim() || !newAsset.sector.trim()) {
      formError.value = 'Preencha tag, descrição e setor para continuar.'
      return
    }
  }
  formError.value = ''
  assetStep.value = step
}

const onEditFilesPick = (ev: Event) => {
  const input = ev.target as HTMLInputElement
  if (!input.files?.length) return
  const room = Math.max(0, 6 - editAttachments.value.length)
  if (!room) {
    formError.value = 'Já existem 6 fotos neste ativo.'
    input.value = ''
    return
  }
  const { files, error } = mergeUploadFiles(selectedEditFiles.value, input.files)
  if (error) formError.value = error
  selectedEditFiles.value = files.slice(0, room)
  input.value = ''
}

const removeEditFile = (index: number) => {
  selectedEditFiles.value.splice(index, 1)
}

const removeEditAttachment = (index: number) => {
  editAttachments.value.splice(index, 1)
}

const addAsset = async () => {
  if (isSaving.value) return
  formError.value = ''
  const ok = await confirm.ask('Confirme com a sua senha para cadastrar este ativo.')
  if (!ok) return
  isSaving.value = true
  try {
    const assigned = newAsset.assignedTo?.trim()
    let attachments: AttachmentRef[] = []
    if (selectedCreateFiles.value.length) {
      attachments = await inventory.uploadAttachments(selectedCreateFiles.value)
      if (!attachments.length) {
        formError.value = 'Não foi possível enviar as fotos. Tente novamente.'
        return
      }
    }
    await inventory.createAsset({
      tag: newAsset.tag,
      description: newAsset.description,
      sector: newAsset.sector,
      status: newAsset.status,
      assignedTo: assigned || undefined,
      attachments: prepareAttachmentsForApi(attachments),
    })
    newAsset.tag = ''
    newAsset.description = ''
    newAsset.sector = ''
    newAsset.status = 'Disponível'
    newAsset.assignedTo = ''
    selectedCreateFiles.value = []
    closeAssetForm()
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Erro ao cadastrar ativo.'
  } finally {
    isSaving.value = false
  }
}

const removeAsset = async (asset: Asset & { id?: string }) => {
  if (!asset.id) return
  const ok = await confirm.ask(
    `Confirme com a sua senha para excluir o ativo ${asset.tag}.`,
    'Confirmar exclusão',
  )
  if (!ok) return
  try {
    await inventory.deleteAsset(asset.id)
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Erro ao excluir.'
  }
}

const startAssetEdit = (asset: Asset & { id?: string }) => {
  formError.value = ''
  if (!asset.id) return
  editingAssetId.value = asset.id
  editAsset.tag = asset.tag
  editAsset.description = asset.description
  editAsset.sector = asset.sector
  editAsset.status = asset.status as AssetStatus
  editAsset.assignedTo = asset.assignedTo ?? ''
  editAttachments.value = [...(asset.attachments ?? [])]
  selectedEditFiles.value = []
}

const cancelAssetEdit = () => {
  editingAssetId.value = null
  editAttachments.value = []
  selectedEditFiles.value = []
}

const saveAssetEdit = async () => {
  if (isSaving.value) return
  formError.value = ''
  if (!editingAssetId.value) return
  const ok = await confirm.ask('Confirme com a sua senha para guardar as alterações.')
  if (!ok) return
  isSaving.value = true
  try {
    const assigned = editAsset.assignedTo?.trim()
    let attachments = [...editAttachments.value]
    if (selectedEditFiles.value.length) {
      const uploaded = await inventory.uploadAttachments(selectedEditFiles.value)
      if (!uploaded.length) {
        formError.value = 'Não foi possível enviar as fotos novas. Tente novamente.'
        return
      }
      attachments = [...attachments, ...uploaded].slice(0, 6)
    }
    await inventory.updateAsset(editingAssetId.value, {
      tag: editAsset.tag,
      description: editAsset.description,
      sector: editAsset.sector,
      status: editAsset.status,
      assignedTo: assigned ? assigned : null,
      attachments: prepareAttachmentsForApi(attachments),
    })
    editingAssetId.value = null
    editAttachments.value = []
    selectedEditFiles.value = []
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Não foi possível salvar.'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
/* Estilos permanecem os mesmos */
.assets-page {
  animation: fade-up 0.5s ease;
}

.hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, var(--bg-card)), var(--bg-card));
  margin-bottom: 24px;
}

.hero-text h2 {
  margin: 0 0 4px;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-text p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--primary);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--bg-card);
  border-color: var(--primary);
}

.form-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
}

.form-card-elevated {
  border-color: color-mix(in srgb, var(--primary) 22%, var(--border-light));
  box-shadow: var(--shadow-lg);
}

.form-head {
  margin-bottom: 18px;
}

.wizard-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}

.wizard-steps li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-light);
}

.wizard-steps li span {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--bg-primary);
}

.wizard-steps li.active {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-light);
}

.form-eyebrow {
  display: inline-block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--primary);
}

.form-card h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.asset-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.modern-form .field input,
.modern-form .field select,
.modern-form .field textarea {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.modern-form .field input:focus,
.modern-form .field select:focus,
.modern-form .field textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input, .form-group select {
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-primary);
}
.suggestion-panel {
  margin-top: 4px;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-md);
  max-height: 220px;
  overflow-y: auto;
  display: grid;
}
.suggestion-item {
  border: none;
  background: transparent;
  text-align: left;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  color: var(--text-primary);
}
.suggestion-item + .suggestion-item { border-top: 1px solid var(--border-light); }
.suggestion-item span { font-size: 12px; color: var(--text-muted); }
.suggestion-item:hover { background: var(--bg-hover); }

.field-wide {
  grid-column: 1 / -1;
}

.upload-shell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.upload-btn {
  cursor: pointer;
  margin: 0;
}

.file-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.picked-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.picked-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 13px;
}

.picked-remove {
  border: none;
  background: transparent;
  color: var(--danger);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.photo-preview-row,
.asset-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.photo-preview-row img,
.gallery-thumb img,
.edit-att-item img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border-light);
}

.gallery-thumb {
  display: block;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  border-radius: 8px;
}

.gallery-thumb:hover img {
  opacity: 0.9;
  box-shadow: 0 0 0 2px var(--primary);
}

.asset-cover-btn {
  display: block;
  width: 100%;
  margin: -20px -20px 12px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
  max-height: 140px;
  max-width: calc(100% + 40px);
  box-sizing: border-box;
}

.asset-cover-btn img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
  transition: transform 0.2s ease;
}

.asset-cover-btn:hover img {
  transform: scale(1.03);
}

.edit-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.edit-att-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  font-size: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  grid-column: 1 / -1;
}

.error-message {
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--danger-light);
  color: var(--danger);
  border-radius: 8px;
  border-left: 3px solid var(--danger);
  font-size: 14px;
  font-weight: 500;
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

.stat-card.stat-success .stat-icon {
  color: var(--success);
}

.stat-card.stat-info .stat-icon {
  color: var(--info);
}

.stat-card.stat-warning .stat-icon {
  color: var(--warning);
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

.assigned-filter-banner {
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--primary);
  background: var(--primary-light);
  font-size: 14px;
  color: var(--text-primary);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.assigned-filter-clear {
  margin-left: auto;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.assigned-filter-clear:hover {
  text-decoration: underline;
}

.list-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: stretch;
  margin-bottom: 20px;
}

.search-bar--page {
  flex: 1 1 240px;
  margin-bottom: 0;
}

.toolbar-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-select-wrap {
  min-width: 0;
}

.filter-select {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-primary);
  min-width: 160px;
  max-width: 100%;
}

.view-toggle {
  display: inline-flex;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-card);
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.view-toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.view-toggle-btn.active {
  background: var(--primary-light);
  color: var(--primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-items: start;
}

.assets-grid--compact {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.asset-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  height: auto;
}

.asset-card--compact {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
}

.asset-card--compact:hover {
  transform: translateY(-2px);
}

.compact-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  border-radius: 10px;
  overflow: hidden;
  cursor: zoom-in;
  background: var(--bg-hover);
}

.compact-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.compact-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.compact-body {
  flex: 1;
  min-width: 0;
}

.compact-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.compact-title-row .asset-tag {
  margin: 0;
  font-size: 15px;
}

.compact-body .asset-description {
  margin: 0 0 4px;
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.compact-meta {
  font-size: 11px;
  color: var(--text-muted);
}

.compact-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.asset-header--with-cover {
  justify-content: flex-end;
  margin-bottom: 8px;
}

.asset-header--with-cover .asset-status {
  margin-left: auto;
}

.asset-card--no-cover .asset-header {
  margin-bottom: 16px;
}

.asset-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

.asset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.asset-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-light);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-em-uso {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-disponível {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.status-em-manutencao {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.asset-info {
  flex: 1;
}

.asset-tag {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.asset-description {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.asset-details {
  display: flex;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.detail-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.asset-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon :deep(svg) {
  display: block;
  stroke: currentColor;
}

.btn-icon:hover {
  background: var(--primary);
  color: white !important;
  border-color: var(--primary);
}

.btn-icon.btn-danger:hover {
  background: var(--danger);
  border-color: var(--danger);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 560px;
  box-shadow: var(--shadow-2xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--bg-hover);
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
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
  .hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero .btn-primary {
    width: 100%;
    justify-content: center;
  }

  .stats-grid,
  .assets-grid {
    grid-template-columns: 1fr;
  }

  .asset-form {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .form-actions .btn-primary,
  .form-actions .btn-secondary {
    width: 100%;
    justify-content: center;
  }

  .modal {
    width: 100%;
    max-height: 92vh;
    overflow-y: auto;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions .btn-primary,
  .modal-actions .btn-secondary {
    width: 100%;
  }
}
</style>
