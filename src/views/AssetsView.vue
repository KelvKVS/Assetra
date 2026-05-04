<template>
  <div class="assets-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Ativos de TI</h2>
        <p class="muted">
          Cadastro e acompanhamento de equipamentos
          <template v-if="!canManageAssets"> · Apenas administradores podem criar, editar ou excluir.</template>
        </p>
      </div>
      <button v-if="canManageAssets" class="btn-primary" @click="showForm = !showForm">
        <Plus :size="18" :stroke-width="2.5" />
        {{ showForm ? 'Fechar' : 'Novo Ativo' }}
      </button>
    </div>

    <!-- Add Asset Form -->
    <div v-if="canManageAssets && showForm" class="form-card">
      <h3>Cadastrar novo ativo</h3>
      <form @submit.prevent="addAsset" class="asset-form">
        <div class="form-group">
          <label>Tag</label>
          <input v-model.trim="newAsset.tag" type="text" placeholder="Ex: AST-200" required />
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <input v-model.trim="newAsset.description" type="text" placeholder="Descrição do ativo" required />
        </div>
        <div class="form-group">
          <label>Setor</label>
          <input v-model.trim="newAsset.sector" type="text" placeholder="Setor" required />
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="newAsset.status" required>
            <option>Em uso</option>
            <option>Disponível</option>
            <option>Em manutenção</option>
          </select>
        </div>
        <div class="form-group">
          <label>Responsável (e-mail)</label>
          <input
            v-model.trim="newAsset.assignedTo"
            type="email"
            autocomplete="off"
            placeholder="ex.: gestor@assetra.local (opcional)"
          />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Cadastrar</button>
          <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
        </div>
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

    <!-- Search Bar -->
    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por tag, descrição, setor ou responsável..." />
    </div>

    <!-- Assets Grid -->
    <div class="assets-grid">
      <div v-for="asset in filteredAssets" :key="asset.id ?? asset.tag" class="asset-card">
        <div class="asset-header">
          <div class="asset-icon">
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
      </div>
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
            />
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
import { computed, onMounted, reactive, ref } from 'vue'
import { type Asset, type AssetStatus } from '../types/assetra'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore } from '../stores/inventory'
import { useConfirmAction } from '../composables/useConfirmAction'
import { Plus, Search, Monitor, CheckCircle, Package, Wrench, MapPin, Edit, Trash2, X } from 'lucide-vue-next'

const confirm = useConfirmAction()

const authStore = useAuthStore()
const canManageAssets = computed(() => authStore.user?.role === 'ADM')

const showForm = ref(false)
const search = ref('')
const formError = ref('')
const editingAssetId = ref<string | null>(null)
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
  const term = search.value.toLowerCase()
  if (!term) return inventory.assets
  return assets.value.filter((asset) =>
    [asset.tag, asset.description, asset.sector, asset.status, asset.assignedTo ?? ''].some((value) =>
      String(value).toLowerCase().includes(term),
    ),
  )
})

const usageStats = computed(() => ({
  inUse: inventory.assets.filter((item) => item.status === 'Em uso').length,
  available: inventory.assets.filter((item) => item.status === 'Disponível').length,
  maintenance: inventory.assets.filter((item) => item.status === 'Em manutenção').length,
}))

onMounted(async () => {
  try {
    await inventory.fetchAssets()
  } catch {
    formError.value = inventory.error || 'Não foi possível carregar os ativos.'
  }
})

const addAsset = async () => {
  formError.value = ''
  const ok = await confirm.ask('Confirme com a sua senha para cadastrar este ativo.')
  if (!ok) return
  try {
    const assigned = newAsset.assignedTo?.trim()
    await inventory.createAsset({
      ...newAsset,
      assignedTo: assigned || undefined,
    })
    newAsset.tag = ''
    newAsset.description = ''
    newAsset.sector = ''
    newAsset.status = 'Disponível'
    newAsset.assignedTo = ''
    showForm.value = false
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Erro ao cadastrar ativo.'
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
}

const cancelAssetEdit = () => {
  editingAssetId.value = null
}

const saveAssetEdit = async () => {
  formError.value = ''
  if (!editingAssetId.value) return
  const ok = await confirm.ask('Confirme com a sua senha para guardar as alterações.')
  if (!ok) return
  try {
    const assigned = editAsset.assignedTo?.trim()
    await inventory.updateAsset(editingAssetId.value, {
      ...editAsset,
      assignedTo: assigned ? assigned : null,
    })
    editingAssetId.value = null
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { message?: string } } }
    formError.value = ax?.response?.data?.message ?? 'Não foi possível salvar.'
  }
}
</script>

<style scoped>
/* Estilos permanecem os mesmos */
.assets-page {
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
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
}

.form-card h3 {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.asset-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
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

.form-actions {
  display: flex;
  gap: 12px;
  align-items: flex-end;
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

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.asset-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
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
}

.asset-description {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
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
  max-width: 500px;
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
</style>
