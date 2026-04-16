<template>
  <div class="dashboard">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-box stat-primary">
        <span>{{ isAdmin ? 'Ativos cadastrados' : 'Meus ativos' }}</span>
        <strong>{{ isAdmin ? mockStore.assets.length : myAssets.length }}</strong>
      </div>
      <div class="stat-box stat-warning">
        <span>{{ isAdmin ? 'Chamados abertos' : 'Minhas pendências' }}</span>
        <strong>{{ isAdmin ? openMaintenances : myPendingMaintenances }}</strong>
      </div>
      <div class="stat-box stat-info">
        <span>{{ isAdmin ? 'Movimentações no mês' : 'Movimentações no meu fluxo' }}</span>
        <strong>{{ isAdmin ? mockStore.movements.length : myMovements.length }}</strong>
      </div>
      <div class="stat-box stat-success">
        <span>{{ isAdmin ? 'Usuários ativos' : 'Ativos em manutenção' }}</span>
        <strong>{{ isAdmin ? activeUsers : myAssetsInMaintenance }}</strong>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-grid" v-if="isAdmin">
      <div class="chart-card">
        <h3>Status dos ativos</h3>
        <div class="donut" :style="donutStyle">
          <span>{{ mockStore.assets.length }}</span>
        </div>
        <ul class="legend-list">
          <li>
            <span class="dot dot-blue"></span>
            Em uso: <strong>{{ inUseAssets }}</strong>
          </li>
          <li>
            <span class="dot dot-green"></span>
            Disponíveis: <strong>{{ availableAssets }}</strong>
          </li>
          <li>
            <span class="dot dot-amber"></span>
            Em manutenção: <strong>{{ maintenanceAssets }}</strong>
          </li>
        </ul>
      </div>

      <div class="chart-card">
        <h3>Movimentações recentes</h3>
        <div class="bar-list">
          <div v-for="item in movementBySector" :key="item.label" class="bar-row">
            <span class="bar-label">{{ item.label }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${item.percent}%` }"></div>
            </div>
            <strong class="bar-value">{{ item.value }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- User Info -->
    <div v-else class="user-box">
      <h3><Lightbulb :size="20" class="box-icon" /> Dica</h3>
      <p>Use a tela <em>Meus Ativos</em> para acompanhar mudanças e atualizações.</p>
    </div>

    <!-- Actions -->
    <div class="action-row">
      <button class="warning" @click="handleResetData"><RefreshCw :size="18" class="btn-icon" /> Resetar dados</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMockDataStore } from '../stores/mockData'
import { Lightbulb, RefreshCw } from 'lucide-vue-next'

const authStore = useAuthStore()
const mockStore = useMockDataStore()
mockStore.hydrate()
const isAdmin = computed(() => authStore.user?.role === 'ADM')

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
      #3b82f6 0% ${inUse}%,
      #22c55e ${inUse}% ${inUse + available}%,
      #f59e0b ${inUse + available}% ${inUse + available + maintenance}%
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
</script>

<style scoped>
.dashboard {
  animation: fade-up 0.5s ease;
}

.stat-box {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.chart-card h3 {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.user-box h3 {
  margin: 0 0 var(--spacing-sm);
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.box-icon {
  margin-right: 8px;
}

.btn-icon {
  margin-right: 8px;
}

.user-box p {
  margin: var(--spacing-xs) 0;
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.user-box strong {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
