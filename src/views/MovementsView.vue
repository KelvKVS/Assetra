<template>
  <div class="movements-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Movimentações</h2>
        <p class="muted">Histórico de transferências e alocações de ativos</p>
      </div>
      <button class="btn-primary" @click="showForm = !showForm">
        <Plus :size="18" :stroke-width="2.5" />
        {{ showForm ? 'Fechar' : 'Nova Movimentação' }}
      </button>
    </div>

    <!-- Add Movement Form -->
    <div v-if="showForm" class="form-card">
      <h3>Registrar movimentação</h3>
      <form @submit.prevent="addMovement" class="movement-form">
        <div class="form-group">
          <label>Tag do ativo</label>
          <input v-model.trim="newMovement.assetTag" type="text" placeholder="Ex: AST-200" required />
        </div>
        <div class="form-group">
          <label>Origem</label>
          <input v-model.trim="newMovement.origin" type="text" placeholder="Local de origem" required />
        </div>
        <div class="form-group">
          <label>Destino</label>
          <input v-model.trim="newMovement.destination" type="text" placeholder="Local de destino" required />
        </div>
        <div class="form-group">
          <label>Responsável</label>
          <input v-model.trim="newMovement.responsible" type="text" placeholder="Nome do responsável" required />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Registrar</button>
          <button type="button" class="btn-secondary" @click="showForm = false">Cancelar</button>
        </div>
      </form>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <Search :size="18" :stroke-width="2" />
      <input v-model.trim="search" type="text" placeholder="Buscar por ativo, origem, destino ou responsável..." />
    </div>

    <!-- Timeline -->
    <div class="timeline">
      <div v-for="movement in filteredMovements" :key="movement.id" class="timeline-item">
        <div class="timeline-marker">
          <ArrowRightLeft :size="20" :stroke-width="2.5" />
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <div class="timeline-info">
              <h4>{{ movement.assetTag }}</h4>
              <p class="timeline-route">{{ movement.origin }} → {{ movement.destination }}</p>
            </div>
            <div class="timeline-date">
              <Calendar :size="14" :stroke-width="2" />
              <span>{{ movement.date }}</span>
            </div>
          </div>
          <div class="timeline-footer">
            <div class="responsible-badge">
              <User :size="14" :stroke-width="2" />
              <span>{{ movement.responsible }}</span>
            </div>
            <div class="timeline-actions">
              <button class="btn-icon" @click="startMovementEdit(movement)" title="Editar">
                <Edit :size="16" :stroke-width="2.5" color="currentColor" />
              </button>
              <button class="btn-icon btn-danger" @click="removeMovement(movement.id)" title="Excluir">
                <Trash2 :size="16" :stroke-width="2.5" color="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredMovements.length === 0" class="empty-state">
      <ArrowRightLeft :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhuma movimentação encontrada</h3>
      <p>Registre a primeira movimentação de um ativo</p>
    </div>

    <!-- Edit Modal -->
    <div v-if="editingMovementId !== null" class="modal-overlay" @click="cancelMovementEdit">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Movimentação</h3>
          <button class="btn-close" @click="cancelMovementEdit">
            <X :size="20" :stroke-width="2.5" />
          </button>
        </div>
        <form @submit.prevent="saveMovementEdit(editingMovementId)" class="modal-form">
          <div class="form-group">
            <label>Data</label>
            <input v-model.trim="editMovement.date" type="text" required />
          </div>
          <div class="form-group">
            <label>Tag do ativo</label>
            <input v-model.trim="editMovement.assetTag" type="text" required />
          </div>
          <div class="form-group">
            <label>Origem</label>
            <input v-model.trim="editMovement.origin" type="text" required />
          </div>
          <div class="form-group">
            <label>Destino</label>
            <input v-model.trim="editMovement.destination" type="text" required />
          </div>
          <div class="form-group">
            <label>Responsável</label>
            <input v-model.trim="editMovement.responsible" type="text" required />
          </div>
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Salvar</button>
            <button type="button" class="btn-secondary" @click="cancelMovementEdit">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { type Movement, useMockDataStore } from '../stores/mockData'
import {
  Plus,
  Search,
  ArrowRightLeft,
  Calendar,
  User,
  Edit,
  Trash2,
  X
} from 'lucide-vue-next'

const showForm = ref(false)
const search = ref('')
const editingMovementId = ref<number | null>(null)

const newMovement = reactive({
  assetTag: '',
  origin: '',
  destination: '',
  responsible: '',
})

const editMovement = reactive({
  date: '',
  assetTag: '',
  origin: '',
  destination: '',
  responsible: '',
})

const mockStore = useMockDataStore()
mockStore.hydrate()

const filteredMovements = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return mockStore.movements
  return mockStore.movements.filter((movement) =>
    [movement.assetTag, movement.origin, movement.destination, movement.responsible].some((value) =>
      value.toLowerCase().includes(term),
    ),
  )
})

const addMovement = () => {
  mockStore.addMovement({ ...newMovement })
  newMovement.assetTag = ''
  newMovement.origin = ''
  newMovement.destination = ''
  newMovement.responsible = ''
  showForm.value = false
}

const removeMovement = (id: number) => {
  if (confirm('Tem certeza que deseja excluir esta movimentação?')) {
    mockStore.removeMovement(id)
  }
}

const startMovementEdit = (movement: Movement) => {
  editingMovementId.value = movement.id
  editMovement.date = movement.date
  editMovement.assetTag = movement.assetTag
  editMovement.origin = movement.origin
  editMovement.destination = movement.destination
  editMovement.responsible = movement.responsible
}

const cancelMovementEdit = () => {
  editingMovementId.value = null
}

const saveMovementEdit = (id: number) => {
  mockStore.updateMovement(id, { ...editMovement })
  editingMovementId.value = null
}
</script>

<style scoped>
.movements-page { animation: fade-up 0.5s ease; }
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
.movement-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
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

.timeline { position: relative; padding-left: 32px; }
.timeline::before { content: ''; position: absolute; left: 15px; top: 0; bottom: 0; width: 2px; background: var(--border-light); }
.timeline-item { position: relative; margin-bottom: 20px; animation: fade-in-left 0.4s ease; }

.timeline-marker {
  position: absolute;
  left: -32px;
  top: 16px;
  width: 32px;
  height: 32px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 0 0 4px var(--bg-primary);
}

.timeline-content { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px 20px; transition: all 0.2s ease; }
.timeline-content:hover { border-color: var(--primary); box-shadow: var(--shadow-md); }

.timeline-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.timeline-info h4 { margin: 0 0 4px; font-size: 18px; font-weight: 700; color: var(--text-primary); }
.timeline-route { margin: 0; font-size: 14px; color: var(--text-secondary); }

.timeline-date {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-hover);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-muted);
}

.timeline-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-light); }
.responsible-badge { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
.timeline-actions { display: flex; gap: 8px; }

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  border-radius: 6px;
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
@keyframes fade-in-left { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 16px; align-items: flex-start; }
  .movement-form { grid-template-columns: 1fr; }
  .timeline-header { flex-direction: column; gap: 12px; }
  .timeline-footer { flex-direction: column; gap: 12px; align-items: flex-start; }
}
</style>
