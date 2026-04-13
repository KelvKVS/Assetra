<template>
  <section class="card">
    <h2>{{ isAdmin ? 'Dashboard Executivo' : 'Dashboard Operacional' }}</h2>
    <p class="muted">
      {{ isAdmin ? 'Indicadores e visão operacional dos ativos de TI.' : 'Resumo do que está sob sua responsabilidade.' }}
    </p>

    <div class="stats-grid">
      <article class="stat-box stat-primary">
        <span>{{ isAdmin ? 'Ativos cadastrados' : 'Meus ativos' }}</span>
        <strong>{{ isAdmin ? mockStore.assets.length : myAssets.length }}</strong>
      </article>
      <article class="stat-box">
        <span>{{ isAdmin ? 'Chamados abertos' : 'Minhas pendências' }}</span>
        <strong>{{ isAdmin ? openMaintenances : myPendingMaintenances }}</strong>
      </article>
      <article class="stat-box">
        <span>{{ isAdmin ? 'Movimentações no mês' : 'Movimentações no meu fluxo' }}</span>
        <strong>{{ isAdmin ? mockStore.movements.length : myMovements.length }}</strong>
      </article>
      <article class="stat-box">
        <span>{{ isAdmin ? 'Usuários ativos' : 'Ativos em manutenção' }}</span>
        <strong>{{ isAdmin ? activeUsers : myAssetsInMaintenance }}</strong>
      </article>
    </div>

    <div class="charts-grid" v-if="isAdmin">
      <article class="chart-card">
        <h3>Status dos ativos</h3>
        <div class="donut" :style="donutStyle">
          <span>{{ mockStore.assets.length }}</span>
        </div>
        <ul class="legend-list">
          <li><span class="dot dot-blue"></span>Em uso: {{ inUseAssets }}</li>
          <li><span class="dot dot-green"></span>Disponíveis: {{ availableAssets }}</li>
          <li><span class="dot dot-amber"></span>Em manutenção: {{ maintenanceAssets }}</li>
        </ul>
      </article>

      <article class="chart-card">
        <h3>Movimentações recentes</h3>
        <div class="bar-list">
          <div v-for="item in movementBySector" :key="item.label" class="bar-row">
            <span>{{ item.label }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${item.percent}%` }"></div>
            </div>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="user-box">
      <p><strong>Próxima ação sugerida:</strong> revisar status dos ativos do seu setor.</p>
      <p><strong>Dica:</strong> use a tela <em>Meus Ativos</em> para acompanhar mudanças.</p>
    </div>

    <div class="user-box" v-if="authStore.user">
      <p><strong>Nome:</strong> {{ authStore.user.name }}</p>
      <p><strong>E-mail:</strong> {{ authStore.user.email }}</p>
      <p><strong>ID:</strong> {{ authStore.user.id }}</p>
    </div>

    <div class="action-row">
      <button class="warning" @click="handleResetData">Resetar dados mockados</button>
      <button class="danger" @click="handleLogout">Sair</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMockDataStore } from '../stores/mockData'

const router = useRouter()
const authStore = useAuthStore()
const mockStore = useMockDataStore()
mockStore.hydrate()
const isAdmin = computed(() => authStore.user?.profile === 'Administrador')

const activeUsers = computed(() => mockStore.users.filter((user) => user.status === 'Ativo').length)
const openMaintenances = computed(() => mockStore.maintenances.filter((item) => item.status !== 'Concluída').length)
const inUseAssets = computed(() => mockStore.assets.filter((item) => item.status === 'Em uso').length)
const availableAssets = computed(() => mockStore.assets.filter((item) => item.status === 'Disponível').length)
const maintenanceAssets = computed(() => mockStore.assets.filter((item) => item.status === 'Em manutenção').length)

const donutStyle = computed(() => {
  const total = mockStore.assets.length || 1
  const inUse = (inUseAssets.value / total) * 100
  const available = (availableAssets.value / total) * 100
  const maintenance = 100 - inUse - available
  return {
    background: `conic-gradient(
      #1d4ed8 0% ${inUse}%,
      #059669 ${inUse}% ${inUse + available}%,
      #d97706 ${inUse + available}% ${inUse + available + maintenance}%
    )`,
  }
})

const movementBySector = computed(() => {
  const sectorMap = new Map<string, number>()
  mockStore.movements.forEach((movement) => {
    const current = sectorMap.get(movement.destination) ?? 0
    sectorMap.set(movement.destination, current + 1)
  })

  const raw = Array.from(sectorMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const max = raw[0]?.value ?? 1
  return raw.map((item) => ({
    ...item,
    percent: Math.round((item.value / max) * 100),
  }))
})

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

const myMovements = computed(() => {
  const sectors = sectorByEmail[authStore.user?.email ?? ''] ?? []
  return mockStore.movements.filter((movement) => sectors.includes(movement.destination))
})

const myPendingMaintenances = computed(() => {
  const tags = new Set(myAssets.value.map((asset) => asset.tag))
  return mockStore.maintenances.filter((item) => tags.has(item.assetTag) && item.status !== 'Concluída').length
})

const myAssetsInMaintenance = computed(() => myAssets.value.filter((asset) => asset.status === 'Em manutenção').length)

const handleResetData = () => {
  mockStore.resetAllData()
}

const handleLogout = async () => {
  await authStore.logout()
  await router.push('/login')
}
</script>
