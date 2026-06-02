<template>
  <div class="my-assets-page">
    <!-- Header Section -->
    <div class="page-header">
      <div>
        <h2>Meus Ativos</h2>
        <p class="muted">
          Ativos atribuídos ao seu e-mail
          <template v-if="userDepartment"> · área <strong>{{ userDepartment }}</strong></template>
        </p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <Monitor :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Total de ativos</span>
          <span class="stat-value">{{ myAssets.length }}</span>
        </div>
      </div>
      <div class="stat-card stat-success">
        <CheckCircle :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Em uso</span>
          <span class="stat-value">{{ inUseCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-warning">
        <Wrench :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Em manutenção</span>
          <span class="stat-value">{{ maintenanceCount }}</span>
        </div>
      </div>
      <div class="stat-card stat-info">
        <Shield :size="24" :stroke-width="2.5" class="stat-icon" />
        <div class="stat-content">
          <span class="stat-label">Disponíveis</span>
          <span class="stat-value">{{ availableCount }}</span>
        </div>
      </div>
    </div>

    <div class="list-toolbar">
      <div class="search-bar search-bar--page">
        <Search :size="18" :stroke-width="2" />
        <input
          v-model.trim="pageSearch"
          type="search"
          placeholder="Buscar por tag, descrição ou setor..."
        />
      </div>
      <div class="view-toggle" role="group" aria-label="Modo de visualização">
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ active: viewMode === 'tiles' }"
          title="Grelha de miniaturas"
          @click="viewMode = 'tiles'"
        >
          <LayoutGrid :size="16" :stroke-width="2.5" />
          <span>Miniaturas</span>
        </button>
        <button
          type="button"
          class="view-toggle-btn"
          :class="{ active: viewMode === 'list' }"
          title="Lista em linha"
          @click="viewMode = 'list'"
        >
          <List :size="16" :stroke-width="2.5" />
          <span>Lista</span>
        </button>
      </div>
    </div>

    <div :class="viewMode === 'list' ? 'assets-list' : ['assets-grid', 'assets-grid--tiles']">
      <article
        v-for="asset in filteredAssets"
        :key="asset.id ?? asset.tag"
        :class="[
          'asset-card',
          viewMode === 'tiles' && 'asset-card--tiles',
          viewMode === 'list' && 'asset-card--list',
        ]"
      >
        <template v-if="viewMode === 'tiles'">
          <button
            v-if="coverPhoto(asset)"
            type="button"
            class="tile-thumb"
            :aria-label="`Ver fotos de ${asset.tag}`"
            @click.stop="openGallery(asset, coverPhoto(asset)!)"
          >
            <AssetImage :attachment="coverPhoto(asset)!" :alt="coverPhoto(asset)!.originalName ?? asset.tag" />
          </button>
          <div v-else class="tile-thumb tile-thumb--empty" aria-hidden="true">
            <Monitor :size="22" :stroke-width="2" />
          </div>
          <div class="tile-body">
            <h3 class="asset-tag tile-tag">{{ asset.tag }}</h3>
            <div class="tile-badges-row">
              <span :class="['status-badge', `status-${statusClass(asset.status)}`]">{{ asset.status }}</span>
            </div>
            <p class="tile-desc">{{ asset.description }}</p>
            <small class="tile-meta">
              <MapPin :size="12" />
              {{ asset.sector }}
            </small>
          </div>
        </template>

        <template v-else>
          <button
            v-if="coverPhoto(asset)"
            type="button"
            class="list-thumb"
            :aria-label="`Ver fotos de ${asset.tag}`"
            @click.stop="openGallery(asset, coverPhoto(asset)!)"
          >
            <AssetImage :attachment="coverPhoto(asset)!" :alt="coverPhoto(asset)!.originalName ?? asset.tag" />
          </button>
          <div v-else class="list-thumb list-thumb--empty" aria-hidden="true">
            <Monitor :size="20" :stroke-width="2" />
          </div>
          <div class="list-main">
            <div class="list-ident">
              <h3 class="asset-tag list-tag">{{ asset.tag }}</h3>
              <p class="list-desc">{{ asset.description }}</p>
            </div>
            <span class="list-sector">
              <MapPin :size="12" />
              {{ asset.sector }}
            </span>
          </div>
          <div class="list-badges">
            <span :class="['status-badge', `status-${statusClass(asset.status)}`]">{{ asset.status }}</span>
          </div>
        </template>
      </article>
    </div>

    <!-- Empty State -->
    <div v-if="filteredAssets.length === 0" class="empty-state">
      <Monitor :size="64" :stroke-width="1.5" class="empty-icon" />
      <h3>Nenhum ativo atribuído</h3>
      <p>Não há ativos com o seu e-mail no campo responsável. Peça a um administrador para associar o seu e-mail na ficha do ativo.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLocalPageSearch } from '../composables/useLocalPageSearch'
import { useAssetViewMode } from '../composables/useAssetViewMode'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore } from '../stores/inventory'
import { assetsAssignedToEmail } from '../utils/userScope'
import AssetImage from '../components/AssetImage.vue'
import { imageAttachments, useImageLightbox } from '../composables/useImageLightbox'
import type { Asset, AttachmentRef } from '../types/assetra'
import { Monitor, Search, CheckCircle, Wrench, Shield, MapPin, LayoutGrid, List } from 'lucide-vue-next'

const imageLightbox = useImageLightbox()
const openGallery = (asset: Asset, clicked?: AttachmentRef) => imageLightbox.openFromAsset(asset, clicked)

const coverPhoto = (asset: Asset) => imageAttachments(asset.attachments)[0]

const authStore = useAuthStore()
const inventory = useInventoryStore()

const { pageSearch, matchesPageSearch } = useLocalPageSearch()
const { viewMode } = useAssetViewMode()

const userDepartment = computed(() => authStore.user?.department?.trim() || '')

onMounted(() => {
  void inventory.fetchAssets()
})

const myAssets = computed(() => assetsAssignedToEmail(inventory.assets, authStore.user?.email))

const filteredAssets = computed(() =>
  myAssets.value.filter((asset) => matchesPageSearch(asset.tag, asset.description, asset.sector, asset.status)),
)

const inUseCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Em uso').length)
const maintenanceCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Em manutenção').length)
const availableCount = computed(() => myAssets.value.filter((asset) => asset.status === 'Disponível').length)

const statusClass = (status: string) => {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '-')
}
</script>

<style scoped>
@import '../styles/asset-list-view.css';

.my-assets-page { animation: fade-up 0.5s ease; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0 0 4px; font-size: 28px; font-weight: 700; color: var(--text-primary); }
.page-header p { margin: 0; font-size: 14px; color: var(--text-secondary); }

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

.search-bar:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
.search-bar svg { color: var(--text-secondary); flex-shrink: 0; }
.search-bar input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--text-primary); outline: none; }

.list-toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; align-items: stretch; }
.search-bar--page { flex: 1 1 220px; margin-bottom: 0; }
.view-toggle { display: inline-flex; border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; background: var(--bg-card); }
.view-toggle-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; }
.view-toggle-btn.active { background: var(--primary-light); color: var(--primary); }

.assets-grid { display: grid; gap: 12px; align-items: start; }
.assets-grid--tiles { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }

.asset-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  transition: all 0.2s ease;
}
.asset-card:hover {
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border-light));
  box-shadow: var(--shadow-md);
}

.asset-card--tiles {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  overflow: hidden;
}
.asset-card--tiles:hover { transform: translateY(-2px); }

.tile-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  border-radius: 10px;
  overflow: hidden;
  cursor: zoom-in;
  background: var(--bg-hover);
}
.tile-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tile-thumb--empty { display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
.tile-body { flex: 1; min-width: 0; }
.tile-tag { margin: 0 0 6px; font-size: 15px; }
.tile-badges-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.tile-desc {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tile-meta { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-em-uso { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.status-disponivel { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-em-manutencao { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

.asset-tag { margin: 0; font-weight: 700; color: var(--text-primary); }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-icon { margin-bottom: 16px; opacity: 0.3; }
.empty-state h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--text-secondary); }
.empty-state p { margin: 0; font-size: 14px; }

@keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 16px; align-items: flex-start; }
  .stats-grid { grid-template-columns: 1fr; }
  .assets-grid--tiles { grid-template-columns: 1fr; }
}
</style>
