<template>
  <section class="card">
    <h2>Manutenções</h2>
    <p class="muted">Controle de chamados e manutenções preventivas/corretivas.</p>

    <form class="inline-form" @submit.prevent="addMaintenance">
      <input v-model.trim="newMaintenance.assetTag" type="text" placeholder="Tag do ativo" required />
      <select v-model="newMaintenance.type" required>
        <option>Corretiva</option>
        <option>Preventiva</option>
      </select>
      <select v-model="newMaintenance.priority" required>
        <option>Alta</option>
        <option>Média</option>
        <option>Baixa</option>
      </select>
      <select v-model="newMaintenance.status" required>
        <option>Em andamento</option>
        <option>Agendada</option>
        <option>Concluída</option>
      </select>
      <button type="submit">Abrir manutenção</button>
    </form>

    <div class="table-toolbar">
      <input v-model.trim="search" type="text" placeholder="Buscar por ativo, tipo, prioridade ou status" />
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Ativo</th>
          <th>Tipo</th>
          <th>Abertura</th>
          <th>Prioridade</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="maintenance in filteredMaintenances" :key="maintenance.id">
          <template v-if="editingMaintenanceId === maintenance.id">
            <td><input v-model.trim="editMaintenance.assetTag" type="text" /></td>
            <td>
              <select v-model="editMaintenance.type">
                <option>Corretiva</option>
                <option>Preventiva</option>
              </select>
            </td>
            <td><input v-model.trim="editMaintenance.openingDate" type="text" /></td>
            <td>
              <select v-model="editMaintenance.priority">
                <option>Alta</option>
                <option>Média</option>
                <option>Baixa</option>
              </select>
            </td>
            <td>
              <select v-model="editMaintenance.status">
                <option>Em andamento</option>
                <option>Agendada</option>
                <option>Concluída</option>
              </select>
            </td>
            <td class="actions-cell">
              <button class="mini-btn" @click="saveMaintenanceEdit(maintenance.id)">Salvar</button>
              <button class="mini-btn warning" @click="cancelMaintenanceEdit">Cancelar</button>
            </td>
          </template>
          <template v-else>
            <td>{{ maintenance.assetTag }}</td>
            <td>{{ maintenance.type }}</td>
            <td>{{ maintenance.openingDate }}</td>
            <td>{{ maintenance.priority }}</td>
            <td>{{ maintenance.status }}</td>
            <td class="actions-cell">
              <button class="mini-btn" @click="startMaintenanceEdit(maintenance)">Editar</button>
              <button class="danger mini-btn" @click="removeMaintenance(maintenance.id)">Excluir</button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { type Maintenance, useMockDataStore } from '../stores/mockData'

const mockStore = useMockDataStore()
mockStore.hydrate()
const editingMaintenanceId = ref<number | null>(null)

const newMaintenance = reactive({
  assetTag: '',
  type: 'Corretiva' as const,
  priority: 'Média' as const,
  status: 'Agendada' as const,
})
const editMaintenance = reactive({
  assetTag: '',
  type: 'Corretiva' as const,
  openingDate: '',
  priority: 'Média' as const,
  status: 'Agendada' as const,
})

const search = ref('')

const filteredMaintenances = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return mockStore.maintenances
  return mockStore.maintenances.filter((maintenance) =>
    [maintenance.assetTag, maintenance.type, maintenance.priority, maintenance.status].some((value) =>
      value.toLowerCase().includes(term),
    ),
  )
})

const addMaintenance = () => {
  mockStore.addMaintenance({ ...newMaintenance })

  newMaintenance.assetTag = ''
  newMaintenance.type = 'Corretiva' as const
  newMaintenance.priority = 'Média' as const
  newMaintenance.status = 'Agendada' as const
}

const removeMaintenance = (id: number) => {
  mockStore.removeMaintenance(id)
}

const startMaintenanceEdit = (maintenance: Maintenance) => {
  editingMaintenanceId.value = maintenance.id
  editMaintenance.assetTag = maintenance.assetTag
  editMaintenance.type = maintenance.type
  editMaintenance.openingDate = maintenance.openingDate
  editMaintenance.priority = maintenance.priority
  editMaintenance.status = maintenance.status
}

const cancelMaintenanceEdit = () => {
  editingMaintenanceId.value = null
}

const saveMaintenanceEdit = (id: number) => {
  mockStore.updateMaintenance(id, { ...editMaintenance })
  editingMaintenanceId.value = null
}
</script>
