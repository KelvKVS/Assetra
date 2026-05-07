<template>
  <div class="maintenances-page">
    <header class="hero">
      <div class="hero-text">
        <span class="hero-eyebrow">Manutenções</span>
        <h2>Manutenções</h2>
        <p class="muted">{{ pageSubtitle }}</p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <Wrench :size="18" />
          <span>Total</span>
          <strong>{{ maintenanceStats.total }}</strong>
        </div>
        <div class="hero-stat">
          <Clock3 :size="18" />
          <span>Abertas</span>
          <strong>{{ maintenanceStats.open }}</strong>
        </div>
        <div class="hero-stat">
          <Activity :size="18" />
          <span>Em andamento</span>
          <strong>{{ maintenanceStats.inProgress }}</strong>
        </div>
      </div>
      <div class="header-actions" v-if="canManageMaintenances">
        <button class="btn-secondary" @click="showBulkAssign = !showBulkAssign">
          {{ showBulkAssign ? 'Fechar lote' : 'Atribuição em lote' }}
        </button>
        <button class="btn-primary" @click="showForm = !showForm">
          <Plus :size="18" :stroke-width="2.5" />
          {{ showForm ? 'Fechar' : 'Novo Chamado' }}
        </button>
      </div>
    </header>

    <div v-if="showBulkAssign && canManageMaintenances" class="form-card">
      <h3>Atribuir chamados em lote</h3>
      <p class="muted">
        Serão atribuídos <strong>{{ bulkCandidates.length }}</strong> chamados conforme o escopo selecionado.
      </p>
      <div class="maintenance-form">
        <div class="form-group">
          <label>Escopo</label>
          <select v-model="bulkScope">
            <option value="unassigned-open">Sem responsável e não concluídos</option>
            <option value="in-progress-all">Todos em andamento (trocar responsável)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Técnico destino</label>
          <select v-model="bulkTechnicianEmail">
            <option disabled value="">Selecione um técnico</option>
            <option v-for="tech in technicianUsers" :key="tech.id" :value="tech.email">
              {{ tech.name }} ({{ tech.email }})
            </option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn-primary" @click="assignMaintenancesInBatch">Aplicar atribuição</button>
        </div>
      </div>
    </div>

    <!-- Add Maintenance Form -->
    <div v-if="showForm && canManageMaintenances" class="form-card form-card-elevated">
      <div class="form-head">
        <span class="form-eyebrow">Novo chamado</span>
        <h3>Abrir chamado de manutenção</h3>
      </div>
      <form @submit.prevent="addMaintenance" class="maintenance-form modern-form">
        <div class="form-group field">
          <label>Tag do ativo</label>
          <input
            v-model.trim="newMaintenance.assetTag"
            type="text"
            placeholder="Ex.: AST-200"
            required
            @focus="isCreateAssetFocused = true"
            @blur="hideCreateAssetSuggestions"
          />
          <div v-if="showCreateAssetSuggestions" class="suggestion-panel">
            <button
              v-for="asset in filteredCreateAssetSuggestions"
              :key="`create-asset-${asset.id}`"
              type="button"
              class="suggestion-item"
              @mousedown.prevent="pickCreateAsset(asset.tag)"
            >
              <strong>{{ asset.tag }}</strong>
              <span>{{ asset.description }}</span>
            </button>
          </div>
        </div>
        <div class="form-group field">
          <label>Tipo</label>
          <select v-model="newMaintenance.type" required>
            <option value="Corretiva">Corretiva</option>
            <option value="Preventiva">Preventiva</option>
            <option value="Preditiva">Preditiva</option>
          </select>
        </div>
        <div class="form-group field field-wide details-field">
          <label>Detalhes do chamado</label>
          <textarea
            v-model.trim="newMaintenance.description"
            placeholder="Explique sintomas, impacto e contexto (ex.: equipamento não liga após queda de energia)."
            required
            rows="4"
          ></textarea>
          <small class="field-hint">Dica: informe o que acontece, quando começou e como reproduzir.</small>
        </div>
        <div class="form-group field">
          <label>Status</label>
          <select v-model="newMaintenance.status" required>
            <option>Aberta</option>
            <option>Em andamento</option>
            <option>Concluída</option>
          </select>
        </div>
        <div class="form-group field">
          <label>Técnico responsável</label>
          <input
            v-model.trim="newMaintenance.assignedTechnicianEmail"
            type="text"
            placeholder="Email do técnico"
            required
            @focus="isCreateTechnicianFocused = true"
            @blur="hideCreateTechnicianSuggestions"
          />
          <div v-if="showCreateTechnicianSuggestions" class="suggestion-panel">
            <button
              v-for="tech in filteredCreateTechnicianSuggestions"
              :key="`create-tech-${tech.id}`"
              type="button"
              class="suggestion-item"
              @mousedown.prevent="pickCreateTechnician(tech.email)"
            >
              <strong>{{ tech.name }}</strong>
              <span>{{ tech.email }}</span>
            </button>
          </div>
        </div>
        <div class="form-group field field-wide">
          <label>Fotos da manutenção</label>
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
            <small class="field-hint">Até 6 fotos (8 MB por arquivo).</small>
          </div>
          <ul v-if="selectedCreateFiles.length" class="picked-list">
            <li v-for="(file, idx) in selectedCreateFiles" :key="`${file.name}-${idx}`">
              <span>{{ file.name }}</span>
              <button type="button" class="picked-remove" @click="removeCreateFile(idx)">Remover</button>
            </li>
          </ul>
        </div>
        <div class="form-actions field-wide">
          <button type="submit" class="btn-primary">Abrir Chamado</button>
          <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
        </div>
      </form>
    </div>

    <!-- Search Bar -->
    <div class="search-bar search-shell">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por ativo, tipo ou descrição..." />
    </div>

    <!-- Maintenance Cards -->
    <div class="maintenance-list">
      <div
        v-for="maintenance in filteredMaintenances"
        :key="maintenance.id"
        :class="['maintenance-card', `tone-${statusClass(maintenance.status)}`]"
      >
        <div class="maintenance-header">
          <div class="maintenance-id">
            <Wrench :size="20" :stroke-width="2.5" class="maintenance-icon" />
            <span class="maintenance-title">Chamado #{{ maintenance.id }}</span>
          </div>
          <span :class="['status-badge', `status-${statusClass(maintenance.status)}`]">
            {{ maintenance.status }}
          </span>
        </div>
        <div class="maintenance-body">
          <div class="maintenance-info">
            <div class="info-item">
              <Monitor :size="14" :stroke-width="2" />
              <span>Ativo: <strong>{{ maintenance.assetTag }}</strong></span>
            </div>
            <div class="info-item">
              <Wrench :size="14" :stroke-width="2" />
              <span>Tipo: <strong>{{ maintenance.type }}</strong></span>
            </div>
            <div class="info-item" v-if="maintenance.openingDate">
              <Calendar :size="14" :stroke-width="2" />
              <span>{{ maintenance.openingDate }}</span>
            </div>
            <div class="info-item" v-if="maintenance.assignedTechnicianName || maintenance.assignedTechnicianEmail">
              <User :size="14" :stroke-width="2" />
              <span>
                Técnico: <strong>{{ maintenance.assignedTechnicianName || maintenance.assignedTechnicianEmail }}</strong>
              </span>
            </div>
            <div class="info-item" v-if="maintenance.attachments?.length">
              <Paperclip :size="14" :stroke-width="2" />
              <span>{{ maintenance.attachments.length }} foto(s) anexada(s)</span>
            </div>
          </div>
          <p class="maintenance-description">{{ maintenance.description }}</p>
        </div>
        <div class="maintenance-footer">
          <div v-if="canManageMaintenances" class="maintenance-actions">
            <button class="btn-icon" @click="startMaintenanceEdit(maintenance)" title="Editar">
              <Edit :size="18" :stroke-width="2.5" />
            </button>
              <button class="btn-icon btn-danger" @click="removeMaintenance(String(maintenance.id))" title="Excluir">
              <Trash2 :size="18" :stroke-width="2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredMaintenances.length === 0" class="empty-state">
      <Wrench :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhum chamado encontrado</h3>
      <p>Abra o primeiro chamado de manutenção</p>
    </div>

    <!-- Edit Modal -->
    <div v-if="editingId !== null && canManageMaintenances" class="modal-overlay" @click="cancelMaintenanceEdit">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Chamado</h3>
          <button class="btn-close" @click="cancelMaintenanceEdit">
            <X :size="20" :stroke-width="2.5" />
          </button>
        </div>
        <form @submit.prevent="saveMaintenanceEdit()" class="modal-form">
          <div class="form-group">
            <label>Tag do ativo</label>
            <input v-model.trim="editMaintenance.assetTag" type="text" required />
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <input v-model.trim="editMaintenance.type" type="text" required />
          </div>
          <div class="form-group details-field">
            <label>Detalhes do chamado</label>
            <textarea
              v-model.trim="editMaintenance.description"
              required
              rows="4"
              placeholder="Atualize os detalhes do problema e o andamento do chamado."
            ></textarea>
            <small class="field-hint">Use uma descrição clara para facilitar o diagnóstico.</small>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="editMaintenance.status" required>
              <option>Aberta</option>
              <option>Em andamento</option>
              <option>Concluída</option>
            </select>
          </div>
          <div class="form-group">
            <label>Técnico responsável</label>
            <input
              v-model.trim="editMaintenance.assignedTechnicianEmail"
              type="text"
              placeholder="Email do técnico"
              required
              @focus="isEditTechnicianFocused = true"
              @blur="hideEditTechnicianSuggestions"
            />
            <div v-if="showEditTechnicianSuggestions" class="suggestion-panel">
              <button
                v-for="tech in filteredEditTechnicianSuggestions"
                :key="`edit-tech-${tech.id}`"
                type="button"
                class="suggestion-item"
                @mousedown.prevent="pickEditTechnician(tech.email)"
              >
                <strong>{{ tech.name }}</strong>
                <span>{{ tech.email }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Fotos da manutenção</label>
            <div class="upload-shell">
              <label class="btn-secondary upload-btn">
                <Paperclip :size="16" />
                Subir fotos
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  class="file-hidden"
                  @change="onEditFilesPick"
                />
              </label>
            </div>
            <ul v-if="selectedEditFiles.length" class="picked-list">
              <li v-for="(file, idx) in selectedEditFiles" :key="`${file.name}-${idx}`">
                <span>{{ file.name }}</span>
                <button type="button" class="picked-remove" @click="removeEditFile(idx)">Remover</button>
              </li>
            </ul>
          </div>
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Salvar</button>
            <button type="button" class="btn-secondary" @click="cancelMaintenanceEdit">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { type AttachmentRef, type MaintenanceRow, useInventoryStore } from '../stores/inventory'
import { useConfirmAction } from '../composables/useConfirmAction'
import { useAuthStore } from '../stores/auth'
import { maintenancesInvolvingUserByAssets } from '../utils/userScope'
import {
  Plus,
  Search,
  Wrench,
  Monitor,
  Calendar,
  User,
  Clock3,
  Activity,
  Paperclip,
  Edit,
  Trash2,
  X
} from 'lucide-vue-next'

const confirm = useConfirmAction()
const authStore = useAuthStore()

const showForm = ref(false)
const showBulkAssign = ref(false)
const search = ref('')
const editingId = ref<string | null>(null)
const bulkTechnicianEmail = ref('')
const bulkScope = ref<'unassigned-open' | 'in-progress-all'>('unassigned-open')
const selectedCreateFiles = ref<File[]>([])
const selectedEditFiles = ref<File[]>([])
const isCreateAssetFocused = ref(false)
const isCreateTechnicianFocused = ref(false)
const isEditTechnicianFocused = ref(false)

const newMaintenance = reactive({
  assetTag: '',
  type: 'Corretiva',
  description: '',
  status: 'Aberta' as const,
  assignedTechnicianEmail: '',
  openingDate: new Date().toISOString().split('T')[0],
  priority: 'Média' as const,
})

const editMaintenance = reactive({
  assetTag: '',
  type: 'Corretiva',
  description: '',
  status: 'Aberta' as const,
  assignedTechnicianEmail: '',
  openingDate: '',
  priority: 'Média' as const,
})

const inventory = useInventoryStore()

onMounted(() => {
  void inventory.fetchMaintenances()
  void inventory.fetchAssets()
  void inventory.fetchUsers()
})

const isTechnician = computed(() => authStore.user?.role === 'TECNICO')
const canManageMaintenances = computed(() => !isTechnician.value)
const scopedMaintenances = computed(() =>
  isTechnician.value
    ? maintenancesInvolvingUserByAssets(inventory.maintenances, inventory.assets, authStore.user?.email)
    : inventory.maintenances,
)

const pageSubtitle = computed(() =>
  isTechnician.value
    ? 'Ordens de serviço que envolvem os ativos atribuídos a você'
    : 'Gestão de chamados e ordens de serviço',
)
const assetOptions = computed(() => inventory.assets)
const technicianUsers = computed(() => inventory.users.filter((u) => u.role === 'TECNICO' && u.status === 'Ativo'))
const filteredCreateAssetSuggestions = computed(() => {
  const q = newMaintenance.assetTag.trim().toLowerCase()
  if (!q) return assetOptions.value.slice(0, 8)
  return assetOptions.value
    .filter((asset) => `${asset.tag} ${asset.description}`.toLowerCase().includes(q))
    .slice(0, 6)
})
const filteredCreateTechnicianSuggestions = computed(() => {
  const q = newMaintenance.assignedTechnicianEmail.trim().toLowerCase()
  if (!q) return technicianUsers.value.slice(0, 8)
  return technicianUsers.value
    .filter((tech) => `${tech.name} ${tech.email}`.toLowerCase().includes(q))
    .slice(0, 6)
})
const filteredEditTechnicianSuggestions = computed(() => {
  const q = editMaintenance.assignedTechnicianEmail.trim().toLowerCase()
  if (!q) return technicianUsers.value.slice(0, 8)
  return technicianUsers.value
    .filter((tech) => `${tech.name} ${tech.email}`.toLowerCase().includes(q))
    .slice(0, 6)
})
const showCreateAssetSuggestions = computed(() => isCreateAssetFocused.value && filteredCreateAssetSuggestions.value.length > 0)
const showCreateTechnicianSuggestions = computed(
  () => isCreateTechnicianFocused.value && filteredCreateTechnicianSuggestions.value.length > 0,
)
const showEditTechnicianSuggestions = computed(
  () => isEditTechnicianFocused.value && filteredEditTechnicianSuggestions.value.length > 0,
)
const pickCreateAsset = (tag: string) => {
  newMaintenance.assetTag = tag
  isCreateAssetFocused.value = false
}
const pickCreateTechnician = (email: string) => {
  newMaintenance.assignedTechnicianEmail = email
  isCreateTechnicianFocused.value = false
}
const pickEditTechnician = (email: string) => {
  editMaintenance.assignedTechnicianEmail = email
  isEditTechnicianFocused.value = false
}
const hideCreateAssetSuggestions = () => {
  window.setTimeout(() => {
    isCreateAssetFocused.value = false
  }, 120)
}
const hideCreateTechnicianSuggestions = () => {
  window.setTimeout(() => {
    isCreateTechnicianFocused.value = false
  }, 120)
}
const hideEditTechnicianSuggestions = () => {
  window.setTimeout(() => {
    isEditTechnicianFocused.value = false
  }, 120)
}
const unassignedOpenMaintenances = computed(() =>
  inventory.maintenances.filter((m) => m.status !== 'Concluída' && !String(m.assignedTechnicianEmail ?? '').trim()),
)
const inProgressMaintenances = computed(() => inventory.maintenances.filter((m) => m.status === 'Em andamento'))
const bulkCandidates = computed(() =>
  bulkScope.value === 'in-progress-all' ? inProgressMaintenances.value : unassignedOpenMaintenances.value,
)
const maintenanceStats = computed(() => ({
  total: inventory.maintenances.length,
  open: inventory.maintenances.filter((m) => m.status === 'Aberta').length,
  inProgress: inventory.maintenances.filter((m) => m.status === 'Em andamento').length,
}))

const filteredMaintenances = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return scopedMaintenances.value
  return scopedMaintenances.value.filter((item) =>
    [item.assetTag, item.type, item.description, item.status].some((value) => String(value).toLowerCase().includes(term)),
  )
})

const addMaintenance = async () => {
  const ok = await confirm.ask('Confirme com a sua senha para abrir este chamado de manutenção.')
  if (!ok) return
  let attachments: AttachmentRef[] = []
  if (selectedCreateFiles.value.length) {
    attachments = await inventory.uploadAttachments(selectedCreateFiles.value)
  }
  await inventory.createMaintenance({
    assetTag: newMaintenance.assetTag,
    type: newMaintenance.type,
    description: newMaintenance.description,
    priority: newMaintenance.priority,
    status: newMaintenance.status,
    assignedTechnicianEmail: newMaintenance.assignedTechnicianEmail,
    attachments,
    openingDate: newMaintenance.openingDate,
  })
  newMaintenance.assetTag = ''
  newMaintenance.type = 'Corretiva'
  newMaintenance.description = ''
  newMaintenance.status = 'Aberta'
  newMaintenance.assignedTechnicianEmail = ''
  newMaintenance.openingDate = new Date().toISOString().split('T')[0]
  newMaintenance.priority = 'Média'
  selectedCreateFiles.value = []
  showForm.value = false
}

const removeMaintenance = async (id: string) => {
  const ok = await confirm.ask('Confirme com a sua senha para excluir este chamado.', 'Confirmar exclusão')
  if (!ok) return
  await inventory.deleteMaintenance(id)
}

const startMaintenanceEdit = (maintenance: MaintenanceRow) => {
  editingId.value = maintenance.id
  editMaintenance.assetTag = maintenance.assetTag
  editMaintenance.type = maintenance.type
  editMaintenance.description = maintenance.description
  editMaintenance.status = maintenance.status as typeof editMaintenance.status
  editMaintenance.assignedTechnicianEmail = maintenance.assignedTechnicianEmail ?? ''
  editMaintenance.openingDate = maintenance.openingDate
  editMaintenance.priority = maintenance.priority as typeof editMaintenance.priority
  selectedEditFiles.value = []
}

const cancelMaintenanceEdit = () => {
  editingId.value = null
}

const saveMaintenanceEdit = async () => {
  if (!editingId.value) return
  const ok = await confirm.ask('Confirme com a sua senha para guardar as alterações.')
  if (!ok) return
  const payload: Partial<Omit<MaintenanceRow, 'id'>> = { ...editMaintenance }
  if (selectedEditFiles.value.length) {
    payload.attachments = await inventory.uploadAttachments(selectedEditFiles.value)
  }
  await inventory.updateMaintenance(editingId.value, payload)
  selectedEditFiles.value = []
  editingId.value = null
}

const onCreateFilesPick = (ev: Event) => {
  const input = ev.target as HTMLInputElement
  if (!input.files) return
  selectedCreateFiles.value = Array.from(input.files).slice(0, 6)
}

const removeCreateFile = (index: number) => {
  selectedCreateFiles.value.splice(index, 1)
}

const onEditFilesPick = (ev: Event) => {
  const input = ev.target as HTMLInputElement
  if (!input.files) return
  selectedEditFiles.value = Array.from(input.files).slice(0, 6)
}

const removeEditFile = (index: number) => {
  selectedEditFiles.value.splice(index, 1)
}

const assignMaintenancesInBatch = async () => {
  if (!bulkTechnicianEmail.value) return
  if (!bulkCandidates.value.length) return
  const ok = await confirm.ask('Confirme com a sua senha para atribuir os chamados em lote.')
  if (!ok) return
  await inventory.bulkAssignMaintenances(
    bulkCandidates.value.map((m) => String(m.id)),
    bulkTechnicianEmail.value,
  )
}

const statusClass = (status: string) => {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}
</script>

<style scoped>
.maintenances-page { animation: fade-up 0.5s ease; }
.hero {
  display: grid;
  grid-template-columns: 1.2fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 24px;
  margin-bottom: 20px;
  background:
    radial-gradient(circle at top right, rgba(59,130,246,0.16), transparent 55%),
    radial-gradient(circle at bottom left, rgba(168,85,247,0.08), transparent 60%),
    var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
}
.hero-text h2 { margin: 6px 0 4px; font-size: 28px; font-weight: 700; color: var(--text-primary); }
.hero-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: var(--primary); text-transform: uppercase; }
.hero-text p { margin: 0; font-size: 14px; color: var(--text-secondary); }

.hero-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.hero-stat {
  display: flex; flex-direction: column; gap: 2px;
  background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: 12px;
  padding: 10px 12px; min-width: 90px;
}
.hero-stat svg { color: var(--text-muted); }
.hero-stat span { font-size: 11px; text-transform: uppercase; color: var(--text-muted); }
.hero-stat strong { font-size: 20px; font-weight: 800; color: var(--text-primary); }

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

.btn-primary:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

.header-actions { display: flex; gap: 10px; }

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

.form-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
}
.form-card-elevated {
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 55%),
    var(--bg-card);
}
.form-head { margin-bottom: 12px; }
.form-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--primary);
  text-transform: uppercase;
}

.form-card h3 { margin: 0 0 20px; font-size: 20px; font-weight: 600; color: var(--text-primary); }
.maintenance-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.modern-form { gap: 14px; }
.field label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field input,
.field select,
.field textarea {
  padding: 11px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  color: var(--text-primary);
  transition: all 0.15s ease;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}
.field-wide { grid-column: 1 / -1; }
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
.suggestion-item + .suggestion-item {
  border-top: 1px solid var(--border-light);
}
.suggestion-item span {
  font-size: 12px;
  color: var(--text-muted);
}
.suggestion-item:hover {
  background: var(--bg-hover);
}
.details-field textarea { min-height: 110px; }
.field-hint { font-size: 12px; color: var(--text-muted); }
.upload-shell { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.upload-btn { width: fit-content; cursor: pointer; }
.file-hidden { display: none; }
.picked-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.picked-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}
.picked-remove {
  border: none;
  background: transparent;
  color: var(--danger);
  font-weight: 600;
  cursor: pointer;
}

.form-group textarea {
  background: var(--bg-input);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  font-family: inherit;
  resize: vertical;
}

.form-actions { display: flex; gap: 12px; align-items: flex-end; }

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

.search-bar:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.search-bar svg { color: var(--text-secondary); flex-shrink: 0; }
.search-bar input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--text-primary); outline: none; }
.search-shell {
  background: linear-gradient(180deg, var(--bg-card), var(--bg-primary));
  border-radius: 12px;
}

.maintenance-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.maintenance-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; transition: all 0.2s ease; }
.maintenance-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--primary); }
.maintenance-card.tone-aberta { border-left: 4px solid #3b82f6; }
.maintenance-card.tone-em-andamento { border-left: 4px solid #f59e0b; }
.maintenance-card.tone-concluida { border-left: 4px solid #22c55e; }

.maintenance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-light);
}

.maintenance-id { display: flex; align-items: center; gap: 10px; }
.maintenance-icon { color: var(--primary); }
.maintenance-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-aberta { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-em-andamento { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status-concluida { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

.maintenance-body { padding: 20px; }
.maintenance-info { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.info-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.info-item svg { flex-shrink: 0; color: var(--text-muted); }
.info-item strong { color: var(--text-primary); }

.maintenance-description {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.maintenance-footer { padding: 12px 20px; border-top: 1px solid var(--border-light); display: flex; justify-content: flex-end; }
.maintenance-actions { display: flex; gap: 8px; }

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

.btn-icon:hover { background: var(--primary); color: white !important; border-color: var(--primary); }
.btn-icon.btn-danger:hover { background: var(--danger); border-color: var(--danger); }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-icon { margin-bottom: 16px; opacity: 0.3; }
.empty-state h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--text-secondary); }
.empty-state p { margin: 0; font-size: 14px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fade-in 0.2s ease; }
.modal { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 24px; width: 90%; max-width: 500px; box-shadow: var(--shadow-2xl); animation: scale-in 0.3s ease; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { margin: 0; font-size: 20px; font-weight: 600; color: var(--text-primary); }
.btn-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--bg-hover); border: none; border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; }
.btn-close:hover { background: var(--danger); color: white; }
.modal-form { display: flex; flex-direction: column; gap: 16px; }
.modal-actions { display: flex; gap: 12px; margin-top: 8px; }

@keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

@media (max-width: 768px) {
  .hero { grid-template-columns: 1fr; }
  .header-actions { width: 100%; }
  .header-actions .btn-primary,
  .header-actions .btn-secondary { flex: 1; justify-content: center; }
  .maintenance-list { grid-template-columns: 1fr; }
  .maintenance-form { grid-template-columns: 1fr; }
}
</style>
