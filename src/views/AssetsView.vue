<template>
  <section class="card">
    <h2>Ativos de TI</h2>
    <p class="muted">Cadastro e acompanhamento de equipamentos.</p>

    <form class="inline-form" @submit.prevent="addAsset">
      <input v-model.trim="newAsset.tag" type="text" placeholder="Tag (ex: AST-200)" required />
      <input v-model.trim="newAsset.description" type="text" placeholder="Descrição do ativo" required />
      <input v-model.trim="newAsset.sector" type="text" placeholder="Setor" required />
      <select v-model="newAsset.status" required>
        <option>Em uso</option>
        <option>Disponível</option>
        <option>Em manutenção</option>
      </select>
      <button type="submit">Cadastrar ativo</button>
    </form>
    <p v-if="formError" class="error">{{ formError }}</p>

    <div class="table-toolbar">
      <input v-model.trim="search" type="text" placeholder="Buscar por tag, descrição ou setor" />
    </div>

    <div class="stats-grid">
      <article class="stat-box">
        <span>Total de ativos</span>
        <strong>{{ assets.length }}</strong>
      </article>
      <article class="stat-box">
        <span>Em uso</span>
        <strong>{{ usageStats.inUse }}</strong>
      </article>
      <article class="stat-box">
        <span>Disponíveis</span>
        <strong>{{ usageStats.available }}</strong>
      </article>
      <article class="stat-box">
        <span>Em manutenção</span>
        <strong>{{ usageStats.maintenance }}</strong>
      </article>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Tag</th>
          <th>Descrição</th>
          <th>Setor</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="asset in filteredAssets" :key="asset.tag">
          <template v-if="editingTag === asset.tag">
            <td><input v-model.trim="editAsset.tag" type="text" /></td>
            <td><input v-model.trim="editAsset.description" type="text" /></td>
            <td><input v-model.trim="editAsset.sector" type="text" /></td>
            <td>
              <select v-model="editAsset.status">
                <option>Em uso</option>
                <option>Disponível</option>
                <option>Em manutenção</option>
              </select>
            </td>
            <td class="actions-cell">
              <button class="mini-btn" @click="saveAssetEdit(asset.tag)">Salvar</button>
              <button class="mini-btn warning" @click="cancelAssetEdit">Cancelar</button>
            </td>
          </template>
          <template v-else>
            <td>{{ asset.tag }}</td>
            <td>{{ asset.description }}</td>
            <td>{{ asset.sector }}</td>
            <td>{{ asset.status }}</td>
            <td class="actions-cell">
              <button class="mini-btn" @click="startAssetEdit(asset)">Editar</button>
              <button class="danger mini-btn" @click="removeAsset(asset.tag)">Excluir</button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { type Asset, useMockDataStore } from '../stores/mockData'

const search = ref('')
const formError = ref('')
const editingTag = ref<string | null>(null)
const editAsset = reactive<Asset>({
  tag: '',
  description: '',
  sector: '',
  status: 'Disponível',
})
const mockStore = useMockDataStore()
mockStore.hydrate()

const assets = computed(() => mockStore.assets)
const newAsset = reactive<Asset>({
  tag: '',
  description: '',
  sector: '',
  status: 'Disponível',
})

const filteredAssets = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return mockStore.assets
  return assets.value.filter((asset) =>
    [asset.tag, asset.description, asset.sector, asset.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const usageStats = computed(() => ({
  inUse: mockStore.assets.filter((item) => item.status === 'Em uso').length,
  available: mockStore.assets.filter((item) => item.status === 'Disponível').length,
  maintenance: mockStore.assets.filter((item) => item.status === 'Em manutenção').length,
}))

const addAsset = () => {
  formError.value = ''
  const added = mockStore.addAsset({ ...newAsset })
  if (!added) {
    formError.value = 'Já existe um ativo com esta tag.'
    return
  }
  newAsset.tag = ''
  newAsset.description = ''
  newAsset.sector = ''
  newAsset.status = 'Disponível'
}

const removeAsset = (tag: string) => {
  mockStore.removeAsset(tag)
}

const startAssetEdit = (asset: Asset) => {
  formError.value = ''
  editingTag.value = asset.tag
  editAsset.tag = asset.tag
  editAsset.description = asset.description
  editAsset.sector = asset.sector
  editAsset.status = asset.status
}

const cancelAssetEdit = () => {
  editingTag.value = null
}

const saveAssetEdit = (originalTag: string) => {
  formError.value = ''
  const updated = mockStore.updateAsset(originalTag, { ...editAsset })
  if (!updated) {
    formError.value = 'Não foi possível salvar: a nova tag já existe.'
    return
  }
  editingTag.value = null
}
</script>
