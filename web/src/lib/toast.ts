export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let nextId = 0
const listeners: Set<(toasts: Toast[]) => void> = new Set()
let toasts: Toast[] = []

function emit() {
  listeners.forEach((fn) => fn([...toasts]))
}

export function showToast(message: string, type: Toast['type'] = 'info') {
  const id = nextId++
  toasts = [...toasts, { id, message, type }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 3500)
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribeToToasts(fn: (toasts: Toast[]) => void): () => void {
  listeners.add(fn)
  fn([...toasts])
  return () => listeners.delete(fn)
}
