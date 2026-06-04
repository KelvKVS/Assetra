<template>
  <section class="exec-charts" :aria-label="variant === 'admin' ? 'Indicadores executivos' : 'Indicadores de gestão'">
    <header class="exec-charts-intro">
      <div>
        <h3>{{ sectionTitle }}</h3>
        <p>{{ sectionSubtitle }}</p>
      </div>
    </header>

    <div class="exec-charts-grid">
      <article v-for="chart in charts" :key="chart.id" class="exec-chart" :style="{ '--accent': chart.accent }">
        <header class="exec-chart-head">
          <div class="exec-chart-icon" :style="{ '--accent': chart.accent }">
            <component :is="chart.icon" :size="18" :stroke-width="2.25" />
          </div>
          <div class="exec-chart-titles">
            <h4>{{ chart.title }}</h4>
            <p>{{ chart.subtitle }}</p>
          </div>
          <div class="exec-chart-kpi">
            <strong>{{ chart.kpiValue }}</strong>
            <span>{{ chart.kpiLabel }}</span>
          </div>
        </header>

        <p v-if="chart.empty" class="exec-chart-empty">{{ chart.emptyMessage }}</p>

        <div v-else-if="chart.kind === 'donut'" class="exec-donut-layout">
          <div class="exec-donut" :style="{ background: chart.gradient }">
            <div class="exec-donut-hole">
              <strong>{{ chart.centerValue }}</strong>
              <small>{{ chart.centerLabel }}</small>
            </div>
          </div>
          <ul class="exec-legend">
            <li v-for="seg in chart.segments" :key="seg.label">
              <span class="exec-legend-dot" :style="{ background: seg.color }" />
              <span class="exec-legend-label">{{ seg.label }}</span>
              <strong>{{ seg.value }}</strong>
              <em>{{ seg.percent }}%</em>
            </li>
          </ul>
        </div>

        <div v-else-if="chart.kind === 'bars'" class="exec-bars">
          <div v-for="bar in chart.bars" :key="bar.label" class="exec-bar-row">
            <span class="exec-bar-label" :title="bar.label">{{ bar.label }}</span>
            <div class="exec-bar-track">
              <div
                class="exec-bar-fill"
                :style="{ width: `${bar.percent}%`, background: bar.color }"
              />
            </div>
            <span class="exec-bar-value">{{ bar.value }}</span>
          </div>
        </div>

      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useInventoryStore } from '../../stores/inventory'
import {
  type BarSeriesItem,
  type ChartSegmentWithPercent,
  conicGradientFromSegments,
  countBy,
  toBarSeries,
  withPercents,
} from '../../utils/chartData'
import {
  PieChart,
  BarChart3,
  Wrench,
  ClipboardCheck,
  Building2,
  Users,
} from 'lucide-vue-next'

const props = defineProps<{
  variant: 'admin' | 'manager'
}>()

const inventory = useInventoryStore()

type DonutChart = {
  id: string
  kind: 'donut'
  title: string
  subtitle: string
  icon: Component
  accent: string
  kpiValue: string | number
  kpiLabel: string
  empty?: boolean
  emptyMessage?: string
  gradient: string
  centerValue: string | number
  centerLabel: string
  segments: ChartSegmentWithPercent[]
}

type BarsChart = {
  id: string
  kind: 'bars'
  title: string
  subtitle: string
  icon: Component
  accent: string
  kpiValue: string | number
  kpiLabel: string
  empty?: boolean
  emptyMessage?: string
  bars: BarSeriesItem[]
}

type ExecChart = DonutChart | BarsChart

const sectionTitle = computed(() =>
  props.variant === 'admin' ? 'Indicadores executivos' : 'Indicadores de gestão',
)

const sectionSubtitle = computed(() =>
  props.variant === 'admin'
    ? 'Visão consolidada do inventário, operação e equipa técnica.'
    : 'Acompanhamento de aprovações, manutenções e fluxo de solicitações.',
)

function donutChart(config: Omit<DonutChart, 'kind' | 'gradient'> & { segments: ChartSegmentWithPercent[] }): DonutChart {
  const total = config.segments.reduce((sum, s) => sum + s.value, 0)
  return {
    ...config,
    kind: 'donut',
    gradient: conicGradientFromSegments(config.segments),
    empty: total === 0,
    emptyMessage: config.emptyMessage ?? 'Sem dados para exibir neste período.',
    centerValue: config.centerValue ?? total,
  }
}

function barsChart(config: Omit<BarsChart, 'kind'>): BarsChart {
  return {
    ...config,
    kind: 'bars',
    empty: !config.bars.length,
    emptyMessage: config.emptyMessage ?? 'Sem registos para este indicador.',
  }
}

const adminCharts = computed<ExecChart[]>(() => {
  const server = inventory.dashboard?.charts?.admin
  if (server) {
    const assetSegments = withPercents(server.assetSegments)
    const sectorBars = toBarSeries(server.sectorBars, { maxItems: 6, color: '#6366f1' })
    const maintSegments = withPercents(server.maintSegments)
    const workloadBars = toBarSeries(server.workloadBars, { maxItems: 5, color: '#14b8a6' })
    const { kpis } = server
    return [
      donutChart({
        id: 'asset-mix',
        title: 'Composição do inventário',
        subtitle: 'Distribuição por estado operacional',
        icon: PieChart,
        accent: '#3b82f6',
        kpiValue: kpis.assetsTotal,
        kpiLabel: 'ativos',
        centerValue: kpis.assetsTotal,
        centerLabel: 'total',
        segments: assetSegments,
        emptyMessage: 'Nenhum ativo cadastrado no inventário.',
      }),
      barsChart({
        id: 'sector-density',
        title: 'Concentração por setor',
        subtitle: 'Top setores com mais equipamentos',
        icon: Building2,
        accent: '#6366f1',
        kpiValue: kpis.sectorCount,
        kpiLabel: 'setores',
        bars: sectorBars,
        emptyMessage: 'Sem setores associados aos ativos.',
      }),
      donutChart({
        id: 'maint-pipeline',
        title: 'Pipeline de manutenções',
        subtitle: 'Volume por fase do ciclo de vida',
        icon: Wrench,
        accent: '#f59e0b',
        kpiValue: kpis.openMaint,
        kpiLabel: 'em aberto',
        centerValue: kpis.maintenancesTotal,
        centerLabel: 'chamados',
        segments: maintSegments,
        emptyMessage: 'Nenhuma manutenção registada.',
      }),
      barsChart({
        id: 'tech-load',
        title: 'Carga da equipa técnica',
        subtitle: 'Chamados ativos por responsável',
        icon: Users,
        accent: '#14b8a6',
        kpiValue: kpis.techCount,
        kpiLabel: 'técnicos',
        bars: workloadBars,
        emptyMessage: 'Sem chamados ativos atribuídos.',
      }),
    ]
  }

  const assets = inventory.assets
  const maintenances = inventory.maintenances

  const assetSegments = withPercents([
    { label: 'Em uso', value: assets.filter((a) => a.status === 'Em uso').length, color: '#3b82f6' },
    { label: 'Disponível', value: assets.filter((a) => a.status === 'Disponível').length, color: '#22c55e' },
    { label: 'Em manutenção', value: assets.filter((a) => a.status === 'Em manutenção').length, color: '#f59e0b' },
  ])

  const sectorMap = countBy(assets, (a) => String(a.sector ?? 'Sem setor'))
  const sectorBars = toBarSeries(
    Array.from(sectorMap.entries()).map(([label, value]) => ({ label, value })),
    { maxItems: 6, color: '#6366f1' },
  )

  const maintSegments = withPercents([
    { label: 'Aberta', value: maintenances.filter((m) => m.status === 'Aberta').length, color: '#94a3b8' },
    { label: 'Em andamento', value: maintenances.filter((m) => m.status === 'Em andamento').length, color: '#3b82f6' },
    { label: 'Concluída', value: maintenances.filter((m) => m.status === 'Concluída').length, color: '#22c55e' },
  ])

  const workloadMap = countBy(
    maintenances.filter((m) => m.status !== 'Concluída'),
    (m) => String(m.assignedTechnicianName || m.assignedTechnicianEmail || 'Não atribuído'),
  )
  const workloadBars = toBarSeries(
    Array.from(workloadMap.entries()).map(([label, value]) => ({ label, value })),
    { maxItems: 5, color: '#14b8a6' },
  )

  const openMaint = maintenances.filter((m) => m.status !== 'Concluída').length

  return [
    donutChart({
      id: 'asset-mix',
      title: 'Composição do inventário',
      subtitle: 'Distribuição por estado operacional',
      icon: PieChart,
      accent: '#3b82f6',
      kpiValue: assets.length,
      kpiLabel: 'ativos',
      centerValue: assets.length,
      centerLabel: 'total',
      segments: assetSegments,
      emptyMessage: 'Nenhum ativo cadastrado no inventário.',
    }),
    barsChart({
      id: 'sector-density',
      title: 'Concentração por setor',
      subtitle: 'Top setores com mais equipamentos',
      icon: Building2,
      accent: '#6366f1',
      kpiValue: sectorMap.size,
      kpiLabel: 'setores',
      bars: sectorBars,
      emptyMessage: 'Sem setores associados aos ativos.',
    }),
    donutChart({
      id: 'maint-pipeline',
      title: 'Pipeline de manutenções',
      subtitle: 'Volume por fase do ciclo de vida',
      icon: Wrench,
      accent: '#f59e0b',
      kpiValue: openMaint,
      kpiLabel: 'em aberto',
      centerValue: maintenances.length,
      centerLabel: 'chamados',
      segments: maintSegments,
      emptyMessage: 'Nenhuma manutenção registada.',
    }),
    barsChart({
      id: 'tech-load',
      title: 'Carga da equipa técnica',
      subtitle: 'Chamados ativos por responsável',
      icon: Users,
      accent: '#14b8a6',
      kpiValue: workloadBars.length,
      kpiLabel: 'técnicos',
      bars: workloadBars,
      emptyMessage: 'Sem chamados ativos atribuídos.',
    }),
  ]
})

const managerCharts = computed<ExecChart[]>(() => {
  const server = inventory.dashboard?.charts?.manager
  if (server) {
    const approvalSegments = withPercents(server.approvalSegments)
    const maintSegments = withPercents(server.maintSegments)
    const typeBars = toBarSeries(server.approvalTypeBars, { maxItems: 4, color: '#3b82f6' })
    const pendingTypeBars = toBarSeries(server.pendingTypeBars, { maxItems: 4, color: '#f59e0b' })
    const { kpis } = server
    return [
      donutChart({
        id: 'approval-queue',
        title: 'Fila de aprovações',
        subtitle: 'Estado das solicitações sob gestão',
        icon: ClipboardCheck,
        accent: '#f59e0b',
        kpiValue: kpis.pendingCount,
        kpiLabel: 'pendentes',
        centerValue: kpis.approvalsTotal,
        centerLabel: 'solicitações',
        segments: approvalSegments,
        emptyMessage: 'Nenhuma solicitação de aprovação registada.',
      }),
      donutChart({
        id: 'maint-health',
        title: 'Saúde das manutenções',
        subtitle: 'Panorama dos chamados técnicos',
        icon: Wrench,
        accent: '#3b82f6',
        kpiValue: kpis.maintInProgress,
        kpiLabel: 'em curso',
        centerValue: kpis.maintenancesTotal,
        centerLabel: 'chamados',
        segments: maintSegments,
        emptyMessage: 'Sem manutenções no tenant.',
      }),
      barsChart({
        id: 'approval-types',
        title: 'Tipos de solicitação',
        subtitle: 'Distribuição por categoria',
        icon: BarChart3,
        accent: '#3b82f6',
        kpiValue: typeBars.length,
        kpiLabel: 'tipos',
        bars: typeBars,
        emptyMessage: 'Sem solicitações classificadas.',
      }),
      barsChart({
        id: 'pending-types',
        title: 'Pendências por tipo',
        subtitle: 'O que aguarda decisão agora',
        icon: ClipboardCheck,
        accent: '#f59e0b',
        kpiValue: pendingTypeBars.length,
        kpiLabel: 'categorias',
        bars: pendingTypeBars,
        emptyMessage: 'Sem pendências por tipo.',
      }),
    ]
  }

  const approvals = inventory.approvals
  const maintenances = inventory.maintenances

  const approvalSegments = withPercents([
    { label: 'Pendentes', value: approvals.filter((a) => a.status === 'Pendente').length, color: '#f59e0b' },
    { label: 'Aprovadas', value: approvals.filter((a) => a.status === 'Aprovada').length, color: '#22c55e' },
    { label: 'Reprovadas', value: approvals.filter((a) => a.status === 'Reprovada').length, color: '#ef4444' },
  ])

  const maintSegments = withPercents([
    { label: 'Aberta', value: maintenances.filter((m) => m.status === 'Aberta').length, color: '#94a3b8' },
    { label: 'Em andamento', value: maintenances.filter((m) => m.status === 'Em andamento').length, color: '#3b82f6' },
    { label: 'Concluída', value: maintenances.filter((m) => m.status === 'Concluída').length, color: '#22c55e' },
  ])

  const typeMap = countBy(approvals, (a) => String(a.type ?? 'Outro'))
  const typeBars = toBarSeries(
    Array.from(typeMap.entries()).map(([label, value]) => ({ label, value })),
    { maxItems: 4, color: '#3b82f6' },
  )

  const pendingTypeMap = countBy(
    approvals.filter((a) => a.status === 'Pendente'),
    (a) => String(a.type ?? 'Outro'),
  )
  const pendingTypeBars = toBarSeries(
    Array.from(pendingTypeMap.entries()).map(([label, value]) => ({ label, value })),
    { maxItems: 4, color: '#f59e0b' },
  )

  const maintInProgress = maintenances.filter((m) => m.status === 'Em andamento').length
  const pendingCount = approvals.filter((a) => a.status === 'Pendente').length

  return [
    donutChart({
      id: 'approval-queue',
      title: 'Fila de aprovações',
      subtitle: 'Estado das solicitações sob gestão',
      icon: ClipboardCheck,
      accent: '#f59e0b',
      kpiValue: pendingCount,
      kpiLabel: 'pendentes',
      centerValue: approvals.length,
      centerLabel: 'solicitações',
      segments: approvalSegments,
      emptyMessage: 'Nenhuma solicitação de aprovação registada.',
    }),
    donutChart({
      id: 'maint-health',
      title: 'Saúde das manutenções',
      subtitle: 'Panorama dos chamados técnicos',
      icon: Wrench,
      accent: '#3b82f6',
      kpiValue: maintInProgress,
      kpiLabel: 'em curso',
      centerValue: maintenances.length,
      centerLabel: 'chamados',
      segments: maintSegments,
      emptyMessage: 'Sem manutenções no tenant.',
    }),
    barsChart({
      id: 'request-mix',
      title: 'Tipologia de solicitações',
      subtitle: 'Manutenção vs. movimentação',
      icon: BarChart3,
      accent: '#6366f1',
      kpiValue: typeBars.reduce((s, b) => s + b.value, 0),
      kpiLabel: 'pedidos',
      bars: typeBars,
      emptyMessage: 'Sem histórico de solicitações.',
    }),
    barsChart({
      id: 'pending-mix',
      title: 'Pendências por tipo',
      subtitle: 'O que aguarda a sua decisão',
      icon: ClipboardCheck,
      accent: '#f59e0b',
      kpiValue: pendingCount,
      kpiLabel: 'pendentes',
      bars: pendingTypeBars,
      emptyMessage: 'Não há pendências por tipo no momento.',
    }),
  ]
})

const charts = computed(() => (props.variant === 'admin' ? adminCharts.value : managerCharts.value))
</script>

<style scoped>
.exec-charts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exec-charts-intro h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.exec-charts-intro p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.exec-charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.exec-chart {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  padding: 18px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.exec-chart::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent, var(--primary));
  opacity: 0.85;
}

.exec-chart-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: start;
}

.exec-chart-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
}

.exec-chart-titles h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.exec-chart-titles p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

.exec-chart-kpi {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.exec-chart-kpi strong {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.exec-chart-kpi span {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.exec-chart-empty {
  margin: 0;
  padding: 28px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-primary);
  border: 1px dashed var(--border-light);
  border-radius: 10px;
}

.exec-donut-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
}

.exec-donut {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.exec-donut-hole {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: inset 0 0 0 1px var(--border-light);
}

.exec-donut-hole strong {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.exec-donut-hole small {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.exec-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.exec-legend li {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.exec-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.exec-legend-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exec-legend li strong {
  color: var(--text-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.exec-legend li em {
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 2.5rem;
  text-align: right;
}

.exec-bars {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.exec-bar-row {
  display: grid;
  grid-template-columns: minmax(72px, 34%) 1fr auto;
  gap: 10px;
  align-items: center;
  font-size: 12px;
}

.exec-bar-label {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.exec-bar-track {
  height: 9px;
  background: var(--bg-hover);
  border-radius: 999px;
  overflow: hidden;
}

.exec-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.45s ease;
}

.exec-bar-value {
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  min-width: 1.5rem;
  text-align: right;
}

@media (max-width: 1100px) {
  .exec-charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .exec-donut-layout {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .exec-legend {
    width: 100%;
  }

  .exec-chart-head {
    grid-template-columns: auto 1fr;
  }

  .exec-chart-kpi {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-start;
    gap: 8px;
    text-align: left;
  }

}
</style>
