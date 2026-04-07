// Tiny dependency-free toast system. Module-level state + subscribe pattern.
//
// Usage:
//   import { showToast } from '@/lib/toast'
//   showToast('Copiado al clipboard')
//   showToast('Error al guardar', 'error')
//
// The <Toaster /> component subscribes and renders.

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
let listeners: Listener[] = []
let nextId = 1

const TOAST_TTL_MS = 2500

function emit(): void {
  for (const l of listeners) l(toasts)
}

export function showToast(
  message: string,
  variant: ToastVariant = 'success',
): void {
  const id = nextId++
  toasts = [...toasts, { id, message, variant }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, TOAST_TTL_MS)
}

export function subscribeToasts(listener: Listener): () => void {
  listeners = [...listeners, listener]
  listener(toasts)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
