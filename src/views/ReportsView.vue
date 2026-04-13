<template>
  <section class="card">
    <h2>Relatórios</h2>
    <p class="muted">Painéis gerenciais para acompanhamento de desempenho e compliance.</p>

    <div class="stats-grid">
      <article class="stat-box">
        <span>Ativos por setor</span>
        <strong>{{ sectorCount }} setores</strong>
      </article>
      <article class="stat-box">
        <span>Taxa de manutenção</span>
        <strong>{{ maintenanceRate }}%</strong>
      </article>
      <article class="stat-box">
        <span>Ativos depreciados</span>
        <strong>{{ depreciatedAssets }}</strong>
      </article>
      <article class="stat-box">
        <span>Inventário em dia</span>
        <strong>{{ inventoryCompliance }}%</strong>
      </article>
    </div>

    <div class="charts-grid">
      <article class="chart-card">
        <h3>Distribuição por setor</h3>
        <div class="bar-list">
          <div v-for="item in assetsBySector" :key="item.label" class="bar-row">
            <span>{{ item.label }}</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill-alt" :style="{ width: `${item.percent}%` }"></div>
            </div>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>

      <article class="chart-card">
        <h3>Status de manutenção</h3>
        <div class="donut" :style="maintenanceDonutStyle">
          <span>{{ mockStore.maintenances.length }}</span>
        </div>
        <ul class="legend-list">
          <li><span class="dot dot-blue"></span>Concluídas: {{ concludedMaintenances }}</li>
          <li><span class="dot dot-amber"></span>Pendentes: {{ pendingMaintenances }}</li>
        </ul>
      </article>
    </div>

    <ul class="report-list">
      <li>Relatório de ativos por localização</li>
      <li>Relatório de movimentações por período</li>
      <li>Relatório de custos de manutenção</li>
      <li>Relatório de usuários e permissões</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMockDataStore } from '../stores/mockData'

const mockStore = useMockDataStore()
mockStore.hydrate()

const sectorCount = computed(() => new Set(mockStore.assets.map((asset) => asset.sector)).size)
const maintenanceRate = computed(() => {
  if (!mockStore.assets.length) return '0.0'
  const rate = (mockStore.maintenances.length / mockStore.assets.length) * 100
  return rate.toFixed(1)
})

const depreciatedAssets = computed(() => mockStore.assets.filter((asset) => asset.status === 'Em manutenção').length)
const inventoryCompliance = computed(() => {
  if (!mockStore.assets.length) return 0
  const compliant = mockStore.assets.filter((asset) => asset.status !== 'Em manutenção').length
  return Math.round((compliant / mockStore.assets.length) * 100)
})

const assetsBySector = computed(() => {
  const map = new Map<string, number>()
  mockStore.assets.forEach((asset) => {
    const current = map.get(asset.sector) ?? 0
    map.set(asset.sector, current + 1)
  })
  const raw = Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const max = raw[0]?.value ?? 1
  return raw.map((item) => ({
    ...item,
    percent: Math.round((item.value / max) * 100),
  }))
})

const concludedMaintenances = computed(
  () => mockStore.maintenances.filter((maintenance) => maintenance.status === 'Concluída').length,
)
const pendingMaintenances = computed(
  () => mockStore.maintenances.filter((maintenance) => maintenance.status !== 'Concluída').length,
)

const maintenanceDonutStyle = computed(() => {
  const total = mockStore.maintenances.length || 1
  const concluded = (concludedMaintenances.value / total) * 100
  return {
    background: `conic-gradient(#1d4ed8 0% ${concluded}%, #d97706 ${concluded}% 100%)`,
  }
})
</script>
