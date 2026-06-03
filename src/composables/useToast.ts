import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  message: string
  kind: ToastKind
}

const toasts = ref<ToastItem[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 1

export function dismissToast(id: number) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  const next = toasts.value.filter((t) => t.id !== id)
  if (next.length !== toasts.value.length) {
    toasts.value = next
  }
}

export function clearAllToasts() {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  toasts.value = []
}

function push(message: string, kind: ToastKind, durationMs = 3500) {
  const trimmed = message.trim()
  if (!trimmed) return

  const id = nextId++
  toasts.value = [...toasts.value, { id, message: trimmed, kind }]

  const timer = window.setTimeout(() => dismissToast(id), durationMs)
  timers.set(id, timer)
}

export function useToast() {
  return {
    toasts,
    dismiss: dismissToast,
    clearAll: clearAllToasts,
    success: (message: string, durationMs?: number) => push(message, 'success', durationMs),
    error: (message: string, durationMs?: number) => push(message, 'error', durationMs ?? 5000),
    info: (message: string, durationMs?: number) => push(message, 'info', durationMs),
  }
}
