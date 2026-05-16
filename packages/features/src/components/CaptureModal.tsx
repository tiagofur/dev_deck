import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Plus, Users, X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import {
  normalizeURLInput,
  parseCaptureTags,
  suggestCaptureTags,
  useCapture,
  useUpdateItem,
  usePreview,
  type CaptureResponse,
  type PreviewResponse,
} from '@devdeck/api-client'
import { detectType } from '@devdeck/api-client'
import { ALL_ITEM_TYPES, getLastUsedDeck, looksLikePotentialURL, looksLikeURL, type CaptureInput, type ItemType } from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'
import { DeckSelect } from './Deck/DeckSelect'

interface Props {
  open: boolean
  onClose: () => void
  /**
   * Clipboard or paste payload to prefill. The modal infers whether to
   * drop it into the URL or the text field based on a cheap URL check.
   */
  prefill?: string
  /** URL passed from external Share Target or browser extension. */
  initialUrl?: string | null
  /** Title passed from external Share Target. */
  initialTitle?: string | null
  /** Source channel reported to the backend for metrics. */
  source?: CaptureInput['source']
  /** Called after a successful capture when the user chooses to open it. */
  onOpenItem?: (id: string) => void
}

/**
 * CaptureModal is the UI seam for POST /api/items/capture. Unlike
 * AddRepoModal (which only handles GitHub URLs), this one accepts any
 * URL or text and lets the user override the detected type via a
 * chip-style picker. Fields mirror docs/CAPTURE.md §Endpoint unificado.
 */
export function CaptureModal({ 
  open, 
  onClose, 
  prefill, 
  initialUrl, 
  initialTitle, 
  source = 'manual', 
  onOpenItem 
}: Props) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [typeHint, setTypeHint] = useState<ItemType | ''>('')
  const [whySaved, setWhySaved] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [tagsTouched, setTagsTouched] = useState(false)
  const [deckId, setDeckId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [lastCapture, setLastCapture] = useState<CaptureResponse | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const capture = useCapture()
  const updateItem = useUpdateItem()
  const previewFetch = usePreview()

  // Reset + seed from prefill each time the modal opens.
  useEffect(() => {
    if (!open) {
      setUrl('')
      setText('')
      setTypeHint('')
      setWhySaved('')
      setTagsRaw('')
      setTagsTouched(false)
      setDeckId(null)
      setLastCapture(null)
      capture.reset()
      return
    }
    setDeckId(getLastUsedDeck())

    if (initialUrl) {
      setUrl(normalizeURLInput(initialUrl))
    }
    if (initialTitle && !whySaved) {
      // Use initial title as a hint in whySaved or similar? 
      // Actually let's just keep it for now.
    }

    if (prefill && !initialUrl) {
      if (looksLikePotentialURL(prefill)) {
        setUrl(normalizeURLInput(prefill))
        setText('')
      } else {
        setText(prefill)
        setUrl('')
      }
    }
    function onKey(e: KeyboardEvent) {
      // Don't trap Enter in inputs - native form submission handles it
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill])

  // Fetch preview when URL changes (debounced)
  const [lastPreviewUrl, setLastPreviewUrl] = useState('')
  useEffect(() => {
    const urlTrimmed = url.trim()
    if (!urlTrimmed || !looksLikeURL(urlTrimmed)) {
      setPreview(null)
      setLastPreviewUrl('')
      return
    }
    // Debounce: only fetch if URL changed significantly
    if (urlTrimmed === lastPreviewUrl) return
    setLastPreviewUrl(urlTrimmed)

    const timer = setTimeout(async () => {
      try {
        const res = await previewFetch.mutateAsync({
          url: urlTrimmed,
          type_hint: typeHint || undefined,
        })
        setPreview(res)
      } catch {
        // Best-effort: failure to fetch shouldn't block capture
        setPreview(null)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [url, typeHint])

  const detected = useMemo(() => {
    if (!url.trim() && !text.trim()) return null
    return detectType({
      url: url.trim() || undefined,
      text: text.trim() || undefined,
      type_hint: typeHint || undefined,
    })
  }, [url, text, typeHint])

  const suggestedTags = useMemo(() => {
    if (!detected) return []
    return suggestCaptureTags({
      type: detected.type,
      url: url.trim() || undefined,
      text: text.trim() || undefined,
    })
  }, [detected, url, text])

  useEffect(() => {
    if (tagsTouched || tagsRaw.trim() || suggestedTags.length === 0) return
    setTagsRaw(suggestedTags.join(', '))
  }, [suggestedTags, tagsRaw, tagsTouched])

  const canSubmit = (url.trim() || text.trim()) && !capture.isPending

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const tags = parseCaptureTags(tagsRaw)
    const normalizedUrl = normalizeURLInput(url)
    const submitUrl = looksLikeURL(normalizedUrl) ? normalizedUrl : ''
    const submitText = text.trim() || (!submitUrl ? normalizedUrl : '')
    try {
      const res = await capture.mutateAsync({
        source,
        deck_id: deckId || undefined,
        url: submitUrl || undefined,
        text: submitText || undefined,
        type_hint: typeHint || undefined,
        why_saved: whySaved.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
      if (res.duplicate_of) {
        showToast('Ya lo tenías guardado ✓', 'info')
      } else {
        showToast('Guardado', 'success')
      }
      setLastCapture(res)
    } catch {
      /* Error shown inline below */
    }
  }

  function resetDraftForNext() {
    setUrl('')
    setText('')
    setTypeHint('')
    setWhySaved('')
    setTagsRaw('')
    setTagsTouched(false)
    setPreview(null)
    setLastPreviewUrl('')
    setLastCapture(null)
    capture.reset()
  }

  function openCapturedItem() {
    const id = lastCapture?.item?.id || lastCapture?.duplicate_of
    if (!id || !onOpenItem) return
    onOpenItem(id)
    onClose()
  }

  async function markForTeamReview() {
    const item = lastCapture?.item
    if (!item || item.tags.includes('team-review')) return
    try {
      const updated = await updateItem.mutateAsync({
        id: item.id,
        input: { tags: [...item.tags, 'team-review'] },
      })
      setLastCapture((current) => current ? { ...current, item: updated } : current)
      showToast('Marcado para revisar con el equipo', 'success')
    } catch {
      showToast('No se pudo marcar para revisión', 'error')
    }
  }

  function submitFromShortcut(e: ReactKeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  function applySuggestedTags() {
    if (suggestedTags.length === 0) return
    const existing = parseCaptureTags(tagsRaw)
    const merged = [...new Set([...existing, ...suggestedTags])]
    setTagsRaw(merged.join(', '))
    setTagsTouched(true)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6
                 bg-accent-cyan/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onKeyDown={submitFromShortcut}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl p-5 w-full max-w-lg
                   max-h-[85vh] overflow-y-auto"
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

        {lastCapture && (
          <div className="mb-5 border-3 border-ink bg-accent-lime/30 p-4">
            <p className="font-display font-black uppercase text-lg mb-1">
              {lastCapture.duplicate_of ? 'Ya estaba guardado' : 'Guardado'}
            </p>
            <p className="font-mono text-sm text-ink-soft mb-4">
              {lastCapture.item?.title || 'El item quedó en tu vault.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {onOpenItem && (lastCapture.item?.id || lastCapture.duplicate_of) && (
                <Button type="button" size="sm" onClick={openCapturedItem}>
                  <span className="flex items-center gap-2">
                    <ExternalLink size={14} strokeWidth={3} />
                    Abrir item
                  </span>
                </Button>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={resetDraftForNext}>
                <span className="flex items-center gap-2">
                  <Plus size={14} strokeWidth={3} />
                  Capturar otro
                </span>
              </Button>
              {lastCapture.item && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={lastCapture.item.tags.includes('team-review') || updateItem.isPending}
                  onClick={markForTeamReview}
                >
                  <span className="flex items-center gap-2">
                    <Users size={14} strokeWidth={3} />
                    {lastCapture.item.tags.includes('team-review') ? 'En revisión' : 'Revisar con equipo'}
                  </span>
                </Button>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {!lastCapture && (
          <>
        <label
          className={`block mb-3 ${isDragging ? 'bg-accent-yellow/30' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const text = e.dataTransfer.getData('text/plain')
            if (text && looksLikeURL(text)) {
              setUrl(text)
            }
          }}
        >
          <span className="block text-xs font-mono font-bold uppercase mb-1">URL</span>
          <input
            autoFocus={!text}
            type="text"
            inputMode="url"
            placeholder="https://… o github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setUrl((current) => normalizeURLInput(current))}
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
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text/plain').trim()
              if (!pasted || text.trim() || url.trim()) return
              if (looksLikePotentialURL(pasted)) {
                e.preventDefault()
                setUrl(normalizeURLInput(pasted))
                setText('')
              }
            }}
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

        {preview && (
          <div className="mb-4 p-3 bg-accent-cyan/20 border-3 border-ink">
            {preview.image && (
              <img
                src={preview.image}
                alt=""
                className="w-full h-32 object-cover mb-2 border-2 border-ink"
              />
            )}
            {preview.title && (
              <div className="font-bold text-sm truncate">{preview.title}</div>
            )}
            {preview.description && (
              <div className="text-xs opacity-70 truncate mt-1">
                {preview.description}
              </div>
            )}
            {previewFetch.isPending && (
              <div className="text-xs opacity-50 mt-1">Cargando preview…</div>
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
            onChange={(e) => {
              setTagsRaw(e.target.value)
              setTagsTouched(true)
            }}
            className="w-full border-3 border-ink p-3 font-mono text-sm
                       focus:outline-none focus:bg-accent-yellow/20"
          />
          {suggestedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-ink-soft">Sugeridos:</span>
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={applySuggestedTags}
                  className="border-2 border-ink px-2 py-0.5 bg-accent-cyan/30
                             text-xs font-mono hover:bg-accent-cyan/60"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="mb-5">
          <span className="block text-xs font-mono font-bold uppercase mb-1">
            Deck (opcional)
          </span>
          <DeckSelect value={deckId} onChange={setDeckId} />
        </div>

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
            {capture.isPending ? 'Guardando…' : 'Guardar ⌘Enter'}
          </Button>
        </div>
          </>
        )}
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
