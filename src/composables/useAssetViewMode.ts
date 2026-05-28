import { ref, watch } from 'vue'

export type AssetViewMode = 'cards' | 'compact'

const STORAGE_KEY = 'assetra-asset-view-mode'

function loadMode(): AssetViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'compact' ? 'compact' : 'cards'
  } catch {
    return 'cards'
  }
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
