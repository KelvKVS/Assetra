<template>
  <div class="reports-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Relatórios e Dashboards</h2>
        <p class="muted">Painéis gerenciais para acompanhamento de desempenho e compliance</p>
      </div>
      <button class="btn-primary" @click="showFilters = !showFilters">
        <SlidersHorizontal :size="18" :stroke-width="2.5" />
        {{ showFilters ? 'Fechar' : 'Filtros' }}
      </button>
    </div>
    <p v-if="loadingSummary" class="status-message">Atualizando indicadores...</p>
    <p v-else-if="reportError" class="status-message status-error">{{ reportError }}</p>

    <!-- Filters Panel -->
    <div v-if="showFilters" class="filters-card">
      <h3>Filtros do período</h3>
      <div class="filters-form">
        <div class="form-group">
          <label>Data início</label>
          <input v-model="filters.startDate" type="date" />
        </div>
        <div class="form-group">
          <label>Data fim</label>
          <input v-model="filters.endDate" type="date" />
        </div>
        <div class="form-group">
          <label>Setor</label>
          <select v-model="filters.sector">
            <option value="">Todos os setores</option>
            <option v-for="sector in sectors" :key="sector" :value="sector">{{ sector }}</option>
          </select>
        </div>
        <div class="form-group form-actions">
          <button class="btn-primary" @click="applyFilters">
            <Search :size="16" :stroke-width="2.5" />
            Aplicar
          </button>
          <button class="btn-secondary" @click="resetFilters">
            <RotateCcw :size="16" :stroke-width="2.5" />
            Limpar
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <Building2 :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Ativos por setor</span>
          <span class="stat-value">{{ sectorCount }} setores</span>
        </div>
      </div>
      <div class="stat-card stat-info">
        <Wrench :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Taxa de manutenção</span>
          <span class="stat-value">{{ maintenanceRate }}%</span>
        </div>
      </div>
      <div class="stat-card stat-warning">
        <AlertTriangle :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Ativos depreciados</span>
          <span class="stat-value">{{ depreciatedAssets }}</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <ShieldCheck :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Inventário em dia</span>
          <span class="stat-value">{{ inventoryCompliance }}%</span>
        </div>
      </div>
    </div>

    <!-- Dashboard Charts -->
    <div class="charts-grid">
      <!-- Distribution Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <BarChart3 :size="20" :stroke-width="2.5" />
          <h3>Distribuição por setor</h3>
        </div>
        <div class="bar-list">
          <div v-for="item in assetsBySector" :key="item.label" class="bar-row">
            <span class="bar-label">{{ item.label }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${item.percent}%` }"></div>
            </div>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>

      <!-- Maintenance Donut -->
      <div class="chart-card">
        <div class="chart-header">
          <PieChart :size="20" :stroke-width="2.5" />
          <h3>Status de manutenção</h3>
        </div>
        <div class="donut-container">
          <div class="donut" :style="maintenanceDonutStyle">
            <span>{{ maintenanceTotal }}</span>
          </div>
          <ul class="legend-list">
            <li>
              <span class="dot dot-blue"></span>
              Concluídas: {{ concludedMaintenances }}
            </li>
            <li>
              <span class="dot dot-amber"></span>
              Pendentes: {{ pendingMaintenances }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Report Cards -->
    <div class="reports-grid">
      <div class="report-card" @click="downloadReport('location')">
        <div class="report-icon report-icon-primary">
          <MapPin :size="24" :stroke-width="2.5" />
        </div>
        <div class="report-info">
          <h3>Ativos por localização</h3>
          <p>Relatório detalhado da localização de cada ativo</p>
        </div>
        <Download :size="18" :stroke-width="2.5" class="report-action" />
      </div>
      <div class="report-card" @click="downloadReport('movements')">
        <div class="report-icon report-icon-info">
          <ArrowRightLeft :size="24" :stroke-width="2.5" />
        </div>
        <div class="report-info">
          <h3>Movimentações por período</h3>
          <p>Histórico completo de todas as movimentações</p>
        </div>
        <Download :size="18" :stroke-width="2.5" class="report-action" />
      </div>
      <div class="report-card" @click="downloadReport('maintenance-costs')">
        <div class="report-icon report-icon-warning">
          <DollarSign :size="24" :stroke-width="2.5" />
        </div>
        <div class="report-info">
          <h3>Custos de manutenção</h3>
          <p>Análise financeira de todas as manutenções</p>
        </div>
        <Download :size="18" :stroke-width="2.5" class="report-action" />
      </div>
      <div class="report-card" @click="downloadReport('users')">
        <div class="report-icon report-icon-success">
          <Users :size="24" :stroke-width="2.5" />
        </div>
        <div class="report-info">
          <h3>Usuários e permissões</h3>
          <p>Relatório de acesso e permissões do sistema</p>
        </div>
        <Download :size="18" :stroke-width="2.5" class="report-action" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../services/api'
import {
  SlidersHorizontal,
  Search,
  RotateCcw,
  Building2,
  Wrench,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  PieChart,
  MapPin,
  ArrowRightLeft,
  DollarSign,
  Users,
  Download,
} from 'lucide-vue-next'

type ReportSummary = {
  sectors: string[]
  kpis: {
    sectorCount: number
    maintenanceRate: number
    depreciatedAssets: number
    inventoryCompliance: number
    concludedMaintenances: number
    pendingMaintenances: number
  }
  charts: {
    assetsBySector: Array<{ label: string; value: number; percent: number }>
    maintenanceStatus: {
      total: number
      concluded: number
      pending: number
    }
  }
}

const showFilters = ref(false)
const loadingSummary = ref(false)
const reportError = ref('')
const filters = reactive({
  startDate: '',
  endDate: '',
  sector: '',
})
const summary = ref<ReportSummary>({
  sectors: [],
  kpis: {
    sectorCount: 0,
    maintenanceRate: 0,
    depreciatedAssets: 0,
    inventoryCompliance: 0,
    concludedMaintenances: 0,
    pendingMaintenances: 0,
  },
  charts: {
    assetsBySector: [],
    maintenanceStatus: {
      total: 0,
      concluded: 0,
      pending: 0,
    },
  },
})

const sectors = computed(() => summary.value.sectors)

function buildFilterParams() {
  const params: Record<string, string> = {}
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  if (filters.sector) params.sector = filters.sector
  return params
}

async function fetchSummary() {
  loadingSummary.value = true
  reportError.value = ''
  try {
    const { data } = await api.get<ReportSummary>('/reports/summary', { params: buildFilterParams() })
    summary.value = data
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { message?: string } } }
    reportError.value = ax?.response?.data?.message ?? 'Não foi possível carregar os relatórios.'
  } finally {
    loadingSummary.value = false
  }
}

const applyFilters = async () => {
  showFilters.value = false
  await fetchSummary()
}

const resetFilters = async () => {
  filters.startDate = ''
  filters.endDate = ''
  filters.sector = ''
  await fetchSummary()
}

function triggerJsonDownload(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  void fetchSummary()
})

const downloadReport = async (type: string) => {
  const stamp = new Date().toISOString().slice(0, 10)
  try {
    const { data } = await api.get<{ data: unknown }>(`/reports/export/${type}`, { params: buildFilterParams() })
    const suffix =
      type === 'location'
        ? 'ativos'
        : type === 'movements'
          ? 'movimentacoes'
          : type === 'maintenance-costs'
            ? 'manutencoes'
            : 'usuarios'
    triggerJsonDownload(`assetra-${suffix}-${stamp}.json`, data?.data ?? [])
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { message?: string } } }
    window.alert(ax?.response?.data?.message ?? 'Não foi possível exportar. Confirme se a API está a responder.')
  }
}

const sectorCount = computed(() => summary.value.kpis.sectorCount)
const maintenanceRate = computed(() => Number(summary.value.kpis.maintenanceRate ?? 0).toFixed(1))
const depreciatedAssets = computed(() => summary.value.kpis.depreciatedAssets)
const inventoryCompliance = computed(() => summary.value.kpis.inventoryCompliance)
const assetsBySector = computed(() => summary.value.charts.assetsBySector)
const concludedMaintenances = computed(() => summary.value.kpis.concludedMaintenances)
const pendingMaintenances = computed(() => summary.value.kpis.pendingMaintenances)
const maintenanceTotal = computed(() => summary.value.charts.maintenanceStatus.total)

const maintenanceDonutStyle = computed(() => {
  const total = maintenanceTotal.value || 1
  const concluded = (concludedMaintenances.value / total) * 100
  return {
    background: `conic-gradient(#22c55e 0% ${concluded}%, #f59e0b ${concluded}% 100%)`,
  }
})
</script>

<style scoped>
.reports-page { animation: fade-up 0.5s ease; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0 0 4px; font-size: 28px; font-weight: 700; color: var(--text-primary); }
.page-header p { margin: 0; font-size: 14px; color: var(--text-secondary); }
.status-message { margin: -8px 0 16px; color: var(--text-secondary); font-size: 13px; }
.status-message.status-error { color: var(--danger); }

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

.filters-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-md); }
.filters-card h3 { margin: 0 0 20px; font-size: 20px; font-weight: 600; color: var(--text-primary); }
.filters-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-actions { flex-direction: row; gap: 12px; align-items: flex-end; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s ease; }
.stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.stat-icon { color: var(--primary); }
.stat-card.stat-success .stat-icon { color: var(--success); }
.stat-card.stat-info .stat-icon { color: var(--info); }
.stat-card.stat-warning .stat-icon { color: var(--warning); }

.stat-content { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--text-primary); }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-bottom: 24px; }
.chart-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 20px; transition: all 0.2s ease; }
.chart-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.chart-header svg { color: var(--primary); }
.chart-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary); }

.bar-list { display: flex; flex-direction: column; gap: 12px; }
.bar-row { display: grid; grid-template-columns: 100px 1fr 40px; align-items: center; gap: 12px; }
.bar-label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #8b5cf6); border-radius: 4px; transition: width 0.5s ease; }
.bar-row strong { font-size: 16px; font-weight: 700; color: var(--text-primary); text-align: right; }

.donut-container { display: flex; align-items: center; gap: 24px; }
.donut { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.donut span { font-size: 24px; font-weight: 800; color: var(--text-primary); background: var(--bg-card); width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.legend-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.legend-list li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-secondary); }
.dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.dot-blue { background: #22c55e; }
.dot-amber { background: #f59e0b; }

.reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.report-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s ease; }
.report-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--primary); }
.report-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; }
.report-icon-primary { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.report-icon-info { background: linear-gradient(135deg, #06b6d4, #0891b2); }
.report-icon-warning { background: linear-gradient(135deg, #f59e0b, #d97706); }
.report-icon-success { background: linear-gradient(135deg, #22c55e, #16a34a); }
.report-info { flex: 1; min-width: 0; }
.report-info h3 { margin: 0 0 4px; font-size: 16px; font-weight: 600; color: var(--text-primary); }
.report-info p { margin: 0; font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.report-action { color: var(--text-muted); flex-shrink: 0; transition: color 0.2s ease; }
.report-card:hover .report-action { color: var(--primary); }

@keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 16px; align-items: flex-start; }
  .stats-grid { grid-template-columns: 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
  .donut-container { flex-direction: column; text-align: center; }
  .reports-grid { grid-template-columns: 1fr; }
  .filters-form { grid-template-columns: 1fr; }
}
</style>
