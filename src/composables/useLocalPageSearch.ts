import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

/** Busca local da página (independente da busca global da topbar). */
export function useLocalPageSearch() {
  const route = useRoute()
  const pageSearch = ref(String(route.query.q ?? '').trim())

  watch(
    () => route.query.q,
    (q) => {
      pageSearch.value = String(q ?? '').trim()
    },
  )

  function matchesPageSearch(...fields: (string | null | undefined)[]) {
    const term = pageSearch.value.toLowerCase()
    if (!term) return true
    return fields.some((f) => String(f ?? '').toLowerCase().includes(term))
  }

  function clearPageSearch() {
    pageSearch.value = ''
  }

  return { pageSearch, matchesPageSearch, clearPageSearch }
}
