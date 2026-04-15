<template>
  <div class="my-assets-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Meus Ativos</h2>
        <p class="muted">Ativos sob responsabilidade do seu perfil</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <Monitor size="24" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Total de ativos</span>
          <span class="stat-value">{{ myAssets.length }}</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <CheckCircle size="24" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Em uso</span>
          <span class="stat-value">{{ inUseCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-warning">
        <Wrench size="24" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Em manuten&atilde;o</span>
          <span class="stat-value">{{ maintenanceCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-info">
        <Shield size="24" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Dispon&iacute;veis</span>
          <span class="stat-value">{{ availableCount }}</span>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <Search size="18" />
      <input v-model.trim="search" type="text" placeholder="Buscar por tag, descri&ccedil;&atilde;o ou setor..." />
    </div>

    <!-- Assets Grid -->
    <div class="assets-grid">
      <div v-for="asset in filteredAssets" :key="asset.tag" class="asset-card">
        <div class="asset-header">
          <div class="asset-icon">
            <Monitor size="24" />
          </div>
          <div class="asset-status">
            <span :class="['status-badge', `status-${statusClass(asset.status)}`]">
              {{ asset.status }}
            </span>
          </div>
        </div>
        <div class="asset-info">
          <h3 class="asset-tag">{{ asset.tag }}</h3>
          <p class="asset-description">{{ asset.description }}</p>
          <div class="asset-details">
            <div class="detail-item">
              <MapPin size="14" />
              <span>{{ asset.sector }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredAssets.length === 0" class="empty-state">
      <Monitor size="64" class="empty-icon" />
      <h3>Nenhum ativo encontrado</h3>
      <p>Voc&ecirc; n&atilde;o possui ativos sob responsabilidade no momento</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMockDataStore } from '../stores/mockData'
import { Monitor, Search, CheckCircle, Wrench, Shield, MapPin } from 'lucide-vue-next'

const authStore = useAuthStore()
const mockStore = useMockDataStore()
mockStore.hydrate()

const search = ref('')

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

const filteredAssets = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return myAssets.value
  return myAssets.value.filter((asset) =>
    [asset.tag, asset.description, asset.sector, asset.status].some((value) => value.toLowerCase().includes(term)),
  )
})

const inUseCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Em uso').length)
const maintenanceCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Em manuten&ccedil;&atilde;o').length)
const availableCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Dispon&iacute;vel').length)

const statusClass = (status: string) => {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}
</script>

<style scoped>
.my-assets-page {
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

/* Stats Grid */
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

/* Search Bar */
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

.search-bar input::placeholder {
  color: var(--text-muted);
}

/* Assets Grid */
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

.status-disponivel {
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

.detail-item svg {
  flex-shrink: 0;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .assets-grid {
    grid-template-columns: 1fr;
  }
}
</style>
