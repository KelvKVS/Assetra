import { reactive } from 'vue'

type State = {
  open: boolean
  title: string
  message: string
  resolver: ((ok: boolean) => void) | null
}

const state = reactive<State>({
  open: false,
  title: 'Confirmar com a sua senha',
  message: 'Esta ação requer a sua senha atual.',
  resolver: null,
})

/**
 * Abre o modal de confirmação por senha e devolve uma promessa que
 * resolve em `true` quando o backend valida a senha do utilizador atual.
 */
export function useConfirmAction() {
  function ask(message?: string, title?: string): Promise<boolean> {
    if (state.open && state.resolver) {
      state.resolver(false)
    }
    state.title = title ?? 'Confirmar com a sua senha'
    state.message = message ?? 'Esta ação requer a sua senha atual.'
    state.open = true
    return new Promise<boolean>((resolve) => {
      state.resolver = resolve
    })
  }

  function onConfirmed() {
    state.resolver?.(true)
    state.resolver = null
    state.open = false
  }

  function onCancel() {
    state.resolver?.(false)
    state.resolver = null
    state.open = false
  }

  return {
    state,
    ask,
    onConfirmed,
    onCancel,
  }
}
