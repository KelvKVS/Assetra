<template>
  <div class="maintenances-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Manutenções</h2>
        <p class="muted">Gestão de chamados e ordens de serviço</p>
      </div>
      <button class="btn-primary" @click="showForm = !showForm">
        <Plus :size="18" :stroke-width="2.5" />
        {{ showForm ? 'Fechar' : 'Novo Chamado' }}
      </button>
    </div>

    <!-- Add Maintenance Form -->
    <div v-if="showForm" class="form-card">
      <h3>Abrir chamado de manutenção</h3>
      <form @submit.prevent="addMaintenance" class="maintenance-form">
        <div class="form-group">
          <label>Tag do ativo</label>
          <input v-model.trim="newMaintenance.assetTag" type="text" placeholder="Ex: AST-200" required />
        </div>
        <div class="form-group">
          <label>Tipo</label>
          <input v-model.trim="newMaintenance.type" type="text" placeholder="Ex: Corretiva" required />
        </div>
        <div class="form-group">
          <label>Descrição do problema</label>
          <textarea v-model.trim="newMaintenance.description" placeholder="Descreva o problema..." required rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="newMaintenance.status" required>
            <option>Aberta</option>
            <option>Em andamento</option>
            <option>Concluída</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Abrir Chamado</button>
          <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
        </div>
      </form>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por ativo, tipo ou descrição..." />
    </div>

    <!-- Maintenance Cards -->
    <div class="maintenance-list">
      <div v-for="maintenance in filteredMaintenances" :key="maintenance.id" class="maintenance-card">
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
          </div>
          <p class="maintenance-description">{{ maintenance.description }}</p>
        </div>
        <div class="maintenance-footer">
          <div class="maintenance-actions">
            <button class="btn-icon" @click="startMaintenanceEdit(maintenance)" title="Editar">
              <Edit :size="18" :stroke-width="2.5" color="currentColor" />
            </button>
            <button class="btn-icon btn-danger" @click="removeMaintenance(maintenance.id)" title="Excluir">
              <Trash2 :size="18" :stroke-width="2.5" color="currentColor" />
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
    <div v-if="editingId !== null" class="modal-overlay" @click="cancelMaintenanceEdit">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Chamado</h3>
          <button class="btn-close" @click="cancelMaintenanceEdit">
            <X :size="20" :stroke-width="2.5" />
          </button>
        </div>
        <form @submit.prevent="saveMaintenanceEdit(editingId)" class="modal-form">
          <div class="form-group">
            <label>Tag do ativo</label>
            <input v-model.trim="editMaintenance.assetTag" type="text" required />
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <input v-model.trim="editMaintenance.type" type="text" required />
          </div>
          <div class="form-group">
            <label>Descrição</label>
            <textarea v-model.trim="editMaintenance.description" required rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="editMaintenance.status" required>
              <option>Aberta</option>
              <option>Em andamento</option>
              <option>Concluída</option>
            </select>
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
import { computed, reactive, ref } from 'vue'
import { type Maintenance, useMockDataStore } from '../stores/mockData'
import {
  Plus,
  Search,
  Wrench,
  Monitor,
  Calendar,
  Edit,
  Trash2,
  X
} from 'lucide-vue-next'

const showForm = ref(false)
const search = ref('')
const editingId = ref<number | null>(null)

const newMaintenance = reactive<Omit<Maintenance, 'id'>>({
  assetTag: '',
  type: 'Corretiva',
  description: '',
  status: 'Aberta',
  openingDate: new Date().toISOString().split('T')[0],
  priority: 'Média',
})

const editMaintenance = reactive<Omit<Maintenance, 'id'>>({
  assetTag: '',
  type: 'Corretiva',
  description: '',
  status: 'Aberta',
  openingDate: new Date().toISOString().split('T')[0],
  priority: 'Média',
})

const mockStore = useMockDataStore()
mockStore.hydrate()

const filteredMaintenances = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return mockStore.maintenances
  return mockStore.maintenances.filter((item) =>
    [item.assetTag, item.type, item.description, item.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const addMaintenance = () => {
  mockStore.addMaintenance({ ...newMaintenance })
  newMaintenance.assetTag = ''
  newMaintenance.type = 'Corretiva'
  newMaintenance.description = ''
  newMaintenance.status = 'Aberta'
  newMaintenance.openingDate = new Date().toISOString().split('T')[0]
  newMaintenance.priority = 'Média'
  showForm.value = false
}

const removeMaintenance = (id: number) => {
  if (confirm('Tem certeza que deseja excluir este chamado?')) {
    mockStore.removeMaintenance(id)
  }
}

const startMaintenanceEdit = (maintenance: Maintenance) => {
  editingId.value = maintenance.id
  editMaintenance.assetTag = maintenance.assetTag
  editMaintenance.type = maintenance.type
  editMaintenance.description = maintenance.description
  editMaintenance.status = maintenance.status
  editMaintenance.openingDate = maintenance.openingDate
  editMaintenance.priority = maintenance.priority
}

const cancelMaintenanceEdit = () => {
  editingId.value = null
}

const saveMaintenanceEdit = (id: number) => {
  mockStore.updateMaintenance(id, { ...editMaintenance })
  editingId.value = null
}

const statusClass = (status: string) => {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}
</script>

<style scoped>
.maintenances-page { animation: fade-up 0.5s ease; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0 0 4px; font-size: 28px; font-weight: 700; color: var(--text-primary); }
.page-header p { margin: 0; font-size: 14px; color: var(--text-secondary); }

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

.form-card h3 { margin: 0 0 20px; font-size: 20px; font-weight: 600; color: var(--text-primary); }
.maintenance-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }

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

.maintenance-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.maintenance-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; transition: all 0.2s ease; }
.maintenance-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--primary); }

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
  .page-header { flex-direction: column; gap: 16px; align-items: flex-start; }
  .maintenance-list { grid-template-columns: 1fr; }
  .maintenance-form { grid-template-columns: 1fr; }
}
</style>
