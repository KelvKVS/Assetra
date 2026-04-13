<template>
  <section class="card">
    <h2>Meus Ativos</h2>
    <p class="muted">Ativos sob responsabilidade do seu perfil.</p>

    <div class="stats-grid">
      <article class="stat-box stat-primary">
        <span>Total sob controle</span>
        <strong>{{ myAssets.length }}</strong>
      </article>
      <article class="stat-box">
        <span>Em uso</span>
        <strong>{{ inUseCount }}</strong>
      </article>
      <article class="stat-box">
        <span>Em manutenção</span>
        <strong>{{ maintenanceCount }}</strong>
      </article>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Tag</th>
          <th>Descrição</th>
          <th>Setor</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="asset in myAssets" :key="asset.tag">
          <td>{{ asset.tag }}</td>
          <td>{{ asset.description }}</td>
          <td>{{ asset.sector }}</td>
          <td>{{ asset.status }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMockDataStore } from '../stores/mockData'

const authStore = useAuthStore()
const mockStore = useMockDataStore()
mockStore.hydrate()

const sectorByEmail: Record<string, string[]> = {
  'ana.cordeiro@assetra.local': ['Financeiro', 'Compras'],
  'joao.melo@assetra.local': ['TI', 'RH'],
}

const myAssets = computed(() => {
  const email = authStore.user?.email ?? ''
  const sectors = sectorByEmail[email] ?? []
  if (!sectors.length) return mockStore.assets.slice(0, 2)
  return mockStore.assets.filter((asset) => sectors.includes(asset.sector))
})

const inUseCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Em uso').length)
const maintenanceCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Em manutenção').length)
</script>
