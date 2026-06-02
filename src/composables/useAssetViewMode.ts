import { ref, watch } from 'vue'

/** tiles = grelha de miniaturas; list = fila horizontal */
export type AssetViewMode = 'tiles' | 'list'

const STORAGE_KEY = 'assetra-asset-view-mode'

function loadMode(): AssetViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'list') return 'list'
    if (v === 'tiles' || v === 'compact' || v === 'cards') return 'tiles'
  } catch {
    /* ignore */
  }
  return 'tiles'
}

const viewMode = ref<AssetViewMode>(loadMode())

watch(viewMode, (mode) => {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
})

export function useAssetViewMode() {
  return { viewMode }
}
