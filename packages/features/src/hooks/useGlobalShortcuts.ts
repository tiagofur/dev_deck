import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface UseGlobalShortcutsOptions {
  /** Callback when cmd+K is pressed */
  onCapture?: () => void
  /** Callback when cmd+/ is pressed */
  onShortcuts?: () => void
  /** Callback when search input should be focused */
  onSearchFocus?: () => void
}

/**
 * Global keyboard shortcuts hook.
 * Must be used inside a Router context (uses useNavigate).
 */
export function useGlobalShortcuts({
  onCapture,
  onShortcuts,
  onSearchFocus,
}: UseGlobalShortcutsOptions): void {
  const navigate = useNavigate()

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Ignore if typing in an input
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (isTyping && e.key !== 'Escape') return

      // Cmd+K: Open capture modal
      if (modKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onCapture?.()
        return
      }

      // Cmd+L: Focus search (or go to items page)
      if (modKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        if (onSearchFocus) {
          onSearchFocus()
        } else {
          navigate('/items')
        }
        return
      }

      // Cmd+N: New item (capture modal)
      if (modKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        onCapture?.()
        return
      }

      // Cmd+/: Show shortcuts modal
      if (e.key === '/' && modKey) {
        e.preventDefault()
        onShortcuts?.()
        return
      }

      // Escape: Close any modal (handled by individual modals)
    },
    [navigate, onCapture, onShortcuts, onSearchFocus]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])
}