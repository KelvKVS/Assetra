import { computed, ref } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useInventoryStore } from '../stores/inventory'
import { roleLabelPt } from '../utils/roleLabels'

export type GlobalSearchKind = 'user' | 'asset' | 'maintenance' | 'movement' | 'approval' | 'request'

export type GlobalSearchItem = {
  id: string
  kind: GlobalSearchKind
  title: string
  subtitle: string
  route: RouteLocationRaw
}

const searchQuery = ref('')
const dataReady = ref(false)
let loading: Promise<void> | null = null

const KIND_LABELS: Record<GlobalSearchKind, string> = {
  user: 'Pessoas',
  asset: 'Ativos',
  maintenance: 'Manutenções',
  movement: 'Movimentações',
  approval: 'Aprovações',
  request: 'Solicitações',
}

const PER_GROUP = 4
const MAX_TOTAL = 24

function normalizeTerm(value: string) {
  return value.trim().toLowerCase()
}

function matchesTerm(term: string, ...values: (string | null | undefined)[]) {
  if (!term) return false
  return values.some((v) => String(v ?? '').toLowerCase().includes(term))
}

function pushItem(
  bucket: GlobalSearchItem[],
  counts: Record<GlobalSearchKind, number>,
  item: GlobalSearchItem,
) {
  if (counts[item.kind] >= PER_GROUP) return
  counts[item.kind] += 1
  bucket.push(item)
}

export function useGlobalSearch() {
  const auth = useAuthStore()
  const inventory = useInventoryStore()
  const router = useRouter()

  async function ensureData() {
    if (loading) return loading
    if (dataReady.value) return

    const role = String(auth.user?.role ?? '').trim().toUpperCase()
    const jobs: Promise<unknown>[] = [
      inventory.fetchAssets().catch(() => {}),
      inventory.fetchMaintenances().catch(() => {}),
      inventory.fetchMyApprovalsSafe(),
    ]

    if (['ADM', 'GESTOR', 'TECNICO'].includes(role)) {
      jobs.push(inventory.fetchMovements().catch(() => {}))
    }
    if (['ADM', 'GESTOR'].includes(role)) {
      jobs.push(inventory.fetchUsers().catch(() => {}), inventory.fetchApprovalsSafe())
    }
    if (role === 'TECNICO') {
      jobs.push(inventory.fetchTasks().catch(() => {}))
    }

    loading = Promise.allSettled(jobs).then(() => {
      dataReady.value = true
      loading = null
    })
    return loading
  }

  const results = computed<GlobalSearchItem[]>(() => {
    const term = normalizeTerm(searchQuery.value)
    if (term.length < 2) return []

    const role = String(auth.user?.role ?? '').trim().toUpperCase()
    const items: GlobalSearchItem[] = []
    const counts = {
      user: 0,
      asset: 0,
      maintenance: 0,
      movement: 0,
      approval: 0,
      request: 0,
    } satisfies Record<GlobalSearchKind, number>

    const assetsRouteName = ['ADM', 'GESTOR'].includes(role) ? 'assets' : 'my-assets'

    if (['ADM', 'GESTOR'].includes(role)) {
      for (const user of inventory.users) {
        if (!matchesTerm(term, user.name, user.email, user.role, user.department, user.status)) continue
        pushItem(items, counts, {
          id: `user-${user.id}`,
          kind: 'user',
          title: user.name,
          subtitle: `${user.email} · ${roleLabelPt(user.role)}`,
          route: { name: 'users', query: { q: user.email } },
        })
        if (items.length >= MAX_TOTAL) return items
      }
    }

    for (const asset of inventory.assets) {
      if (
        !matchesTerm(term, asset.tag, asset.shortCode, asset.description, asset.sector, asset.status, asset.assignedTo)
      ) {
        continue
      }
      pushItem(items, counts, {
        id: `asset-${asset.id ?? asset.tag}`,
        kind: 'asset',
        title: asset.tag,
        subtitle: [asset.description, asset.sector].filter(Boolean).join(' · ') || asset.status,
        route: { name: assetsRouteName, query: { q: asset.tag } },
      })
      if (items.length >= MAX_TOTAL) return items
    }

    if (['ADM', 'GESTOR', 'TECNICO'].includes(role)) {
      for (const maintenance of inventory.maintenances) {
        if (
          !matchesTerm(
            term,
            maintenance.assetTag,
            maintenance.type,
            maintenance.description,
            maintenance.status,
            maintenance.assignedTechnicianName,
            maintenance.assignedTechnicianEmail,
          )
        ) {
          continue
        }
        pushItem(items, counts, {
          id: `maint-${maintenance.id}`,
          kind: 'maintenance',
          title: `${maintenance.assetTag} — ${maintenance.type}`,
          subtitle: maintenance.status,
          route: { name: 'maintenances', query: { q: maintenance.assetTag } },
        })
        if (items.length >= MAX_TOTAL) return items
      }

      for (const movement of inventory.movements) {
        if (!matchesTerm(term, movement.assetTag, movement.origin, movement.destination, movement.responsible)) {
          continue
        }
        pushItem(items, counts, {
          id: `mov-${movement.id}`,
          kind: 'movement',
          title: movement.assetTag,
          subtitle: `${movement.origin} → ${movement.destination}`,
          route: { name: 'movements', query: { q: movement.assetTag } },
        })
        if (items.length >= MAX_TOTAL) return items
      }
    }

    if (['ADM', 'GESTOR'].includes(role)) {
      for (const approval of inventory.approvals) {
        if (
          !matchesTerm(
            term,
            approval.assetTag,
            approval.type,
            approval.description,
            approval.status,
            approval.requestedByName,
            approval.requestedByName,
          )
        ) {
          continue
        }
        pushItem(items, counts, {
          id: `approval-${approval.id}`,
          kind: 'approval',
          title: `${approval.type}: ${approval.assetTag}`,
          subtitle: `${approval.status} · ${approval.requestedByName || 'Solicitante'}`,
          route: { name: 'approvals', query: { q: approval.assetTag } },
        })
        if (items.length >= MAX_TOTAL) return items
      }
    }

    for (const request of inventory.myApprovals) {
      if (!matchesTerm(term, request.assetTag, request.type, request.description, request.status, request.feedback)) {
        continue
      }
      pushItem(items, counts, {
        id: `request-${request.id}`,
        kind: 'request',
        title: `${request.type}: ${request.assetTag}`,
        subtitle: request.status,
        route: { name: 'my-requests', query: { q: request.assetTag } },
      })
      if (items.length >= MAX_TOTAL) return items
    }

    return items
  })

  const groupedResults = computed(() => {
    const map = new Map<GlobalSearchKind, GlobalSearchItem[]>()
    for (const item of results.value) {
      const list = map.get(item.kind) ?? []
      list.push(item)
      map.set(item.kind, list)
    }
    return Array.from(map.entries()).map(([kind, items]) => ({
      kind,
      label: KIND_LABELS[kind],
      items,
    }))
  })

  const hasQuery = computed(() => normalizeTerm(searchQuery.value).length >= 2)

  function openResult(item: GlobalSearchItem) {
    searchQuery.value = ''
    void router.push(item.route)
  }

  function clear() {
    searchQuery.value = ''
  }

  function resetDataCache() {
    dataReady.value = false
    loading = null
  }

  return {
    searchQuery,
    results,
    groupedResults,
    hasQuery,
    dataReady,
    ensureData,
    openResult,
    clear,
    resetDataCache,
  }
}
