import { reactive } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useProfilePanel } from './useProfilePanel'

export type ConfirmMode = 'password' | 'needPassword'

type State = {
  open: boolean
  title: string
  message: string
  mode: ConfirmMode
  resolver: ((ok: boolean) => void) | null
}

const state = reactive<State>({
  open: false,
  title: 'Confirmar ação',
  message: 'Deseja continuar?',
  mode: 'password',
  resolver: null,
})

/**
 * Confirmação de ações sensíveis com senha de acesso (definida no perfil).
 */
export function useConfirmAction() {
  const { openProfile } = useProfilePanel()

  function ask(message?: string, title?: string, mode: ConfirmMode = 'password'): Promise<boolean> {
    if (state.open && state.resolver) {
      state.resolver(false)
    }
    state.mode = mode
    state.title = title ?? (mode === 'needPassword' ? 'Senha de acesso necessária' : 'Confirmar com a sua senha')
    state.message =
      message ??
      (mode === 'needPassword'
        ? 'Defina uma senha de acesso no seu perfil para confirmar ações sensíveis.'
        : 'Esta ação requer a sua senha de acesso.')
    state.open = true
    return new Promise<boolean>((resolve) => {
      state.resolver = resolve
    })
  }

  /** Exclusões e decisões críticas — exige senha de confirmação no perfil. */
  function askSensitive(message?: string, title?: string): Promise<boolean> {
    const auth = useAuthStore()
    if (!auth.user?.hasConfirmationPassword) {
      return ask(
        message ??
          'Para continuar, precisa de uma senha de acesso no seu perfil (independente do login Google).',
        title ?? 'Senha de acesso necessária',
        'needPassword',
      )
    }
    return ask(message, title ?? 'Confirmar ação sensível', 'password')
  }

  function openProfileForPassword() {
    state.resolver?.(false)
    state.resolver = null
    state.open = false
    openProfile({ focusPassword: true })
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
    askSensitive,
    openProfileForPassword,
    onConfirmed,
    onCancel,
  }
}
