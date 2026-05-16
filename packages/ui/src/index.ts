// @devdeck/ui — design-system primitives.

export { Button } from './Button'
export { TagChip, hashIndex } from './TagChip'
export { EmptyState } from './EmptyState'
export { PageTransition } from './PageTransition'
export { Toaster } from './Toaster'
export { ConfirmHost } from './ConfirmHost'
export { CommandPalette } from './CommandPalette'

// Singletons used by Toaster and ConfirmHost. Components in apps + features
// import `showToast`, `confirm` from here to emit events.
export { showToast, subscribeToasts } from './toast'
export type { Toast } from './toast'
export { confirm, subscribeConfirm, resolveConfirm } from './confirm'
export type { ConfirmRequest } from './confirm'
