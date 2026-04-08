import { FormEvent, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useCapture } from '../features/capture/api'
import { detectType } from '../features/capture/detect'
import { ALL_ITEM_TYPES, type CaptureInput, type ItemType } from '../features/capture/types'
import { showToast } from '../lib/toast'

interface Props {
  open: boolean
  onClose: () => void
  /**
   * Clipboard or paste payload to prefill. The modal infers whether to
   * drop it into the URL or the text field based on a cheap URL check.
   */
  prefill?: string
  /** Source channel reported to the backend for metrics. */
  source?: CaptureInput['source']
}

/**
 * CaptureModal is the UI seam for POST /api/items/capture. Unlike
 * AddRepoModal (which only handles GitHub URLs), this one accepts any
 * URL or text and lets the user override the detected type via a
 * chip-style picker. Fields mirror docs/CAPTURE.md §Endpoint unificado.
 */
export function CaptureModal({ open, onClose, prefill, source = 'manual' }: Props) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [typeHint, setTypeHint] = useState<ItemType | ''>('')
  const [whySaved, setWhySaved] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const capture = useCapture()

  // Reset + seed from prefill each time the modal opens.
  useEffect(() => {
    if (!open) {
      setUrl('')
      setText('')
      setTypeHint('')
      setWhySaved('')
      setTagsRaw('')
      capture.reset()
      return
    }
    if (prefill) {
      if (looksLikeURL(prefill)) {
        setUrl(prefill)
        setText('')
      } else {
        setText(prefill)
        setUrl('')
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill])

  const detected = useMemo(() => {
    if (!url.trim() && !text.trim()) return null
    return detectType({
      url: url.trim() || undefined,
      text: text.trim() || undefined,
      type_hint: typeHint || undefined,
    })
  }, [url, text, typeHint])

  const canSubmit = (url.trim() || text.trim()) && !capture.isPending

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    try {
      const res = await capture.mutateAsync({
        source,
        url: url.trim() || undefined,
        text: text.trim() || undefined,
        type_hint: typeHint || undefined,
        why_saved: whySaved.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
      if (res.duplicate_of) {
        showToast('Ya lo tenías guardado ✓', 'info')
      } else {
        showToast('Guardado', 'success')
      }
      onClose()
    } catch {
      /* Error shown inline below */
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6
                 bg-accent-cyan/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl p-8 w-full max-w-2xl
                   max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between mb-5">
          <h2 className="font-display font-black text-3xl uppercase">
            Capturar ↓
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="border-3 border-ink p-1 hover:bg-accent-pink transition-colors"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </header>

        <label className="block mb-3">
          <span className="block text-xs font-mono font-bold uppercase mb-1">URL</span>
          <input
            autoFocus={!text}
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border-3 border-ink p-3 font-mono text-base
                       focus:outline-none focus:bg-accent-yellow/20"
          />
        </label>

        <label className="block mb-3">
          <span className="block text-xs font-mono font-bold uppercase mb-1">
            o texto (comando, atajo, snippet, nota)
          </span>
          <textarea
            rows={3}
            placeholder="brew install ripgrep"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full border-3 border-ink p-3 font-mono text-sm
                       focus:outline-none focus:bg-accent-yellow/20 resize-none"
          />
        </label>

        {detected && (
          <div className="mb-4 p-3 bg-accent-lime/30 border-3 border-ink text-sm font-mono">
            <span className="font-bold">Tipo detectado: </span>
            <span className="uppercase">{detected.type}</span>
            {detected.title && (
              <>
                <span className="opacity-60"> · </span>
                <span>{detected.title}</span>
              </>
            )}
          </div>
        )}

        <fieldset className="mb-4">
          <legend className="block text-xs font-mono font-bold uppercase mb-2">
            Forzar tipo (opcional)
          </legend>
          <div className="flex flex-wrap gap-2">
            <TypeChip
              label="auto"
              active={typeHint === ''}
              onClick={() => setTypeHint('')}
            />
            {ALL_ITEM_TYPES.map((t) => (
              <TypeChip
                key={t}
                label={t}
                active={typeHint === t}
                onClick={() => setTypeHint(t)}
              />
            ))}
          </div>
        </fieldset>

        <label className="block mb-3">
          <span className="block text-xs font-mono font-bold uppercase mb-1">
            ¿Por qué lo guardás? (opcional)
          </span>
          <input
            type="text"
            placeholder="para tener a mano cuando grep no alcance"
            value={whySaved}
            onChange={(e) => setWhySaved(e.target.value)}
            className="w-full border-3 border-ink p-3 font-mono text-sm
                       focus:outline-none focus:bg-accent-yellow/20"
          />
        </label>

        <label className="block mb-5">
          <span className="block text-xs font-mono font-bold uppercase mb-1">
            Tags (separados por coma)
          </span>
          <input
            type="text"
            placeholder="cli, terminal, productivity"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            className="w-full border-3 border-ink p-3 font-mono text-sm
                       focus:outline-none focus:bg-accent-yellow/20"
          />
        </label>

        {capture.error && (
          <div className="mb-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm">
            {(capture.error as Error).message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {capture.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function TypeChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-3 border-ink px-2 py-0.5 text-xs font-mono font-bold uppercase
                  transition-colors ${
                    active ? 'bg-accent-lime shadow-hard-sm' : 'bg-bg-card hover:bg-accent-yellow/40'
                  }`}
    >
      {label}
    </button>
  )
}

function looksLikeURL(s: string): boolean {
  if (!/^https?:\/\//i.test(s)) return false
  try {
    const u = new URL(s)
    return !!u.hostname
  } catch {
    return false
  }
}
