<template>
  <section class="card">
    <h2>Movimentações</h2>
    <p class="muted">Histórico de transferências e alocações de ativos.</p>

    <form class="inline-form" @submit.prevent="addMovement">
      <input v-model.trim="newMovement.assetTag" type="text" placeholder="Tag do ativo" required />
      <input v-model.trim="newMovement.origin" type="text" placeholder="Origem" required />
      <input v-model.trim="newMovement.destination" type="text" placeholder="Destino" required />
      <input v-model.trim="newMovement.responsible" type="text" placeholder="Responsável" required />
      <button type="submit">Registrar movimentação</button>
    </form>

    <div class="table-toolbar">
      <input v-model.trim="search" type="text" placeholder="Buscar por ativo, origem, destino ou responsável" />
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Ativo</th>
          <th>Origem</th>
          <th>Destino</th>
          <th>Responsável</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="movement in filteredMovements" :key="movement.id">
          <template v-if="editingMovementId === movement.id">
            <td><input v-model.trim="editMovement.date" type="text" /></td>
            <td><input v-model.trim="editMovement.assetTag" type="text" /></td>
            <td><input v-model.trim="editMovement.origin" type="text" /></td>
            <td><input v-model.trim="editMovement.destination" type="text" /></td>
            <td><input v-model.trim="editMovement.responsible" type="text" /></td>
            <td class="actions-cell">
              <button class="mini-btn" @click="saveMovementEdit(movement.id)">Salvar</button>
              <button class="mini-btn warning" @click="cancelMovementEdit">Cancelar</button>
            </td>
          </template>
          <template v-else>
            <td>{{ movement.date }}</td>
            <td>{{ movement.assetTag }}</td>
            <td>{{ movement.origin }}</td>
            <td>{{ movement.destination }}</td>
            <td>{{ movement.responsible }}</td>
            <td class="actions-cell">
              <button class="mini-btn" @click="startMovementEdit(movement)">Editar</button>
              <button class="danger mini-btn" @click="removeMovement(movement.id)">Excluir</button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { type Movement, useMockDataStore } from '../stores/mockData'

const mockStore = useMockDataStore()
mockStore.hydrate()
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

const search = ref('')

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
}

const removeMovement = (id: number) => {
  mockStore.removeMovement(id)
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
