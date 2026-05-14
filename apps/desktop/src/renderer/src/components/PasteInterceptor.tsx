import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardPaste, ExternalLink, X } from 'lucide-react'
import {
  getLastUsedDeck,
  looksLikeURL,
  normalizeURLInput,
  suggestCaptureTags,
  useCapture,
  quickDetectFromClipboard,
  type CaptureInput,
  type ItemType,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'
import { CaptureModal } from '@devdeck/features'

// Wave 4.5 §16.12 — paste inteligente.
//
// Listens for global paste events outside of editable targets. When
// the clipboard has interesting content (URL or non-empty text), we
// show a floating toast-card with a preview and two buttons: Save
// (one-click capture) or Expand (opens the full CaptureModal with the
// payload prefilled). The card auto-dismisses in 5 s.
//
// Also wires Cmd/Ctrl+Shift+V to open the CaptureModal with the
// current clipboard pre-populated, so users can trigger the flow
// without having to paste into anything first.

const AUTO_DISMISS_MS = 5_000

interface PendingPaste {
  id: number
  raw: string
  type: ItemType
  title: string
}

interface SavedPaste {
  id: string
  title: string
  duplicate: boolean
  type: ItemType
}

interface PasteInterceptorProps {
  onOpenItem?: (id: string) => void
}

export function PasteInterceptor({ onOpenItem }: PasteInterceptorProps = {}) {
  const [pending, setPending] = useState<PendingPaste | null>(null)
  const [saved, setSaved] = useState<SavedPaste | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPrefill, setModalPrefill] = useState<string | undefined>(undefined)
  const capture = useCapture()

  const dismiss = useCallback(() => {
    setPending(null)
    setSaved(null)
  }, [])

  const openExpanded = useCallback((prefill: string) => {
    setModalPrefill(prefill)
    setModalOpen(true)
    setPending(null)
    setSaved(null)
  }, [])

  // Global paste listener.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      // Skip when the user is pasting into an editable field — that's
      // their intended target, not knowledge capture.
      const target = e.target as HTMLElement | null
      if (isEditableTarget(target)) return

      const raw = (e.clipboardData?.getData('text/plain') ?? '').trim()
      if (!raw) return
      // Very short strings (likely accidental) are ignored.
      if (raw.length < 3) return

      const det = quickDetectFromClipboard(raw)
      setPending({ id: Date.now(), raw, type: det.type, title: det.title })
      setSaved(null)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  // Cmd/Ctrl+Shift+V: open the CaptureModal with the clipboard prefilled.
  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (!e.shiftKey) return
      if (e.key.toLowerCase() !== 'v') return
      e.preventDefault()

      let clipboard = ''
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          clipboard = await navigator.clipboard.readText()
        }
      } catch {
        /* permission denied or unsupported — open blank */
      }
      setModalPrefill(clipboard || undefined)
      setModalOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Auto-dismiss the floating card after AUTO_DISMISS_MS.
  useEffect(() => {
    if (!pending && !saved) return
    const t = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [dismiss, pending, saved])

  // ESC dismisses the floating card.
  useEffect(() => {
    if (!pending && !saved) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss, pending, saved])

  const onQuickSave = useCallback(
    async (p: PendingPaste) => {
      const input = buildQuickCaptureInput(p)
      try {
        const res = await capture.mutateAsync(input)
        const id = res.item?.id || res.duplicate_of
        if (res.duplicate_of) {
          showToast('Ya lo tenías ✓', 'info')
        } else {
          showToast(`Guardado como ${p.type}`, 'success')
        }
        if (id) {
          setSaved({
            id,
            title: res.item?.title || p.title || previewLine(p.raw),
            duplicate: Boolean(res.duplicate_of),
            type: p.type,
          })
        } else {
          setSaved(null)
        }
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Error al guardar',
          'error',
        )
        setSaved(null)
      } finally {
        setPending(null)
      }
    },
    [capture],
  )

  return (
    <>
      <AnimatePresence>
        {(pending || saved) && (
          <motion.div
            key={pending?.id ?? saved?.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 w-80 bg-bg-card border-3 border-ink shadow-hard
                       p-4 font-mono"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="border-2 border-ink bg-accent-cyan p-1 shrink-0">
                <ClipboardPaste size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                {pending ? (
                  <>
                    <p className="text-xs font-bold uppercase text-ink-soft mb-0.5">
                      Pegaste · {pending.type}
                    </p>
                    <p className="text-sm font-bold truncate">
                      {pending.title || '(vacío)'}
                    </p>
                    <p className="text-xs text-ink-soft truncate mt-0.5">
                      {previewLine(pending.raw)}
                    </p>
                  </>
                ) : saved ? (
                  <>
                    <p className="text-xs font-bold uppercase text-ink-soft mb-0.5">
                      {saved.duplicate ? 'Ya estaba guardado' : 'Guardado'} · {saved.type}
                    </p>
                    <p className="text-sm font-bold truncate">
                      {saved.title || 'Item guardado'}
                    </p>
                    <p className="text-xs text-ink-soft truncate mt-0.5">
                      Listo en tu vault
                    </p>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Descartar"
                className="border-2 border-ink p-0.5 hover:bg-accent-pink transition-colors shrink-0"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>

            <div className="flex justify-end gap-2">
              {pending && (
                <>
                  <button
                    type="button"
                    onClick={() => openExpanded(pending.raw)}
                    className="text-xs font-bold uppercase border-2 border-ink px-2 py-1
                               bg-bg-card hover:bg-accent-yellow/60 transition-colors"
                  >
                    Expandir
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickSave(pending)}
                    disabled={capture.isPending}
                    className="text-xs font-bold uppercase border-2 border-ink px-2 py-1
                               bg-accent-lime shadow-hard-sm hover:bg-accent-lime/80
                               disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {capture.isPending ? '…' : 'Guardar'}
                  </button>
                </>
              )}
              {saved && onOpenItem && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenItem(saved.id)
                    dismiss()
                  }}
                  className="text-xs font-bold uppercase border-2 border-ink px-2 py-1
                             bg-accent-lime shadow-hard-sm hover:bg-accent-lime/80
                             transition-colors inline-flex items-center gap-1"
                >
                  <ExternalLink size={12} strokeWidth={3} />
                  Abrir
                </button>
              )}
            </div>

            <div className="mt-3 h-0.5 bg-ink/10 overflow-hidden">
              <motion.div
                className="h-full bg-accent-lime"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CaptureModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setModalPrefill(undefined)
        }}
        prefill={modalPrefill}
        onOpenItem={onOpenItem}
        source="web-paste"
      />
    </>
  )
}

function isEditableTarget(el: HTMLElement | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (el.isContentEditable) return true
  return false
}

function buildQuickCaptureInput(p: PendingPaste): CaptureInput {
  const raw = p.raw.trim()
  const normalizedUrl = normalizeURLInput(raw)
  const tags = suggestCaptureTags({
    type: p.type,
    url: looksLikeURL(normalizedUrl) ? normalizedUrl : undefined,
    text: looksLikeURL(normalizedUrl) ? undefined : raw,
  })
  const deckId = getLastUsedDeck()
  const input: CaptureInput = {
    source: 'web-paste',
    type_hint: p.type,
    tags,
    deck_id: deckId || undefined,
  }
  if (looksLikeURL(normalizedUrl)) {
    input.url = normalizedUrl
  } else {
    input.text = raw
  }
  return input
}

function previewLine(s: string): string {
  const line = s.split('\n')[0] ?? ''
  const trimmed = line.trim()
  if (trimmed.length <= 60) return trimmed
  return trimmed.slice(0, 57) + '…'
}
