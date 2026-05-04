import { reactive } from 'vue'

const state = reactive({
  open: false,
})

/** Estado partilhado para abrir/fechar o menu lateral em ecrãs pequenos. */
export function useSidebar() {
  function toggle() {
    state.open = !state.open
  }
  function close() {
    state.open = false
  }
  function openMenu() {
    state.open = true
  }
  return { state, toggle, close, openMenu }
}
