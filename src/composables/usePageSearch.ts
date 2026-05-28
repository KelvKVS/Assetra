import { ref } from 'vue'

/** Busca partilhada entre a Topbar e as páginas de listagem. */
const searchQuery = ref('')
const searchPlaceholder = ref('Buscar...')

export function usePageSearch() {
  const setPlaceholder = (text: string) => {
    searchPlaceholder.value = text
  }

  const clear = () => {
    searchQuery.value = ''
  }

  return {
    searchQuery,
    searchPlaceholder,
    setPlaceholder,
    clear,
  }
}
