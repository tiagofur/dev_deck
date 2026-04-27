/**
 * Promise-based confirm dialog. Same singleton pattern as toast.ts.
 *
 * @example
 * ```typescript
 * const ok = await confirm({
 *   title: 'Borrar repo',
 *   message: 'Esto no se puede deshacer.',
 *   confirmLabel: 'Borrar',
 *   variant: 'danger',
 * })
 * if (!ok) return
 * ```
 *
 * Replaces window.confirm() so we can show a brutalist-styled dialog
 * instead of the native OS one.
 */

export type ConfirmVariant = 'primary' | 'danger'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

export interface ConfirmRequest {
  id: number
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: ConfirmVariant
}

type Listener = (req: ConfirmRequest | null) => void

let current: ConfirmRequest | null = null
let resolver: ((ok: boolean) => void) | null = null
let listeners: Listener[] = []
let nextId = 1

function emit(): void {
  for (const l of listeners) l(current)
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  // If something is already pending, auto-cancel it.
  if (resolver) {
    resolver(false)
    resolver = null
  }
  return new Promise((resolve) => {
    current = {
      id: nextId++,
      title: opts.title ?? 'Confirmar',
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? 'Confirmar',
      cancelLabel: opts.cancelLabel ?? 'Cancelar',
      variant: opts.variant ?? 'primary',
    }
    resolver = resolve
    emit()
  })
}

export function resolveConfirm(ok: boolean): void {
  const r = resolver
  resolver = null
  current = null
  emit()
  if (r) r(ok)
}

export function subscribeConfirm(listener: Listener): () => void {
  listeners = [...listeners, listener]
  listener(current)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
