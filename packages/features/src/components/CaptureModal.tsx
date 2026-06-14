import { ClipboardEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Plus, Sparkles, Users, X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import {
  detectType,
  getLastUsedDeck,
  looksLikePotentialURL,
  looksLikeURL,
  normalizeURLInput,
  parseCaptureTags,
  suggestCaptureTags,
  useCapture,
  usePreview,
  useUpdateItem,
  type CaptureInput,
  type CaptureResponse,
  type Item,
  type ItemType,
  type PreviewResponse,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { DeckSelect } from './Deck/DeckSelect'
import { CAPTURE_LANES, laneForId, laneForType, type CaptureLaneId } from './Capture/captureTypes'

interface Props {
  open: boolean
  onClose: () => void
  prefill?: string
  initialUrl?: string | null
  initialTitle?: string | null
  source?: CaptureInput['source']
  onOpenItem?: (id: string, item?: Item | null) => void
}

export function CaptureModal({
  open,
  onClose,
  prefill,
  initialUrl,
  initialTitle,
  source = 'manual',
  onOpenItem,
}: Props) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [whySaved, setWhySaved] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [tagsTouched, setTagsTouched] = useState(false)
  const [deckId, setDeckId] = useState<string | null>(null)
  const [activeLaneId, setActiveLaneId] = useState<CaptureLaneId>('repo')
  const [userPickedLane, setUserPickedLane] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [lastCapture, setLastCapture] = useState<CaptureResponse | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const capture = useCapture()
  const updateItem = useUpdateItem()
  const previewFetch = usePreview()

  const activeLane = laneForId(activeLaneId)
  const primaryValue = activeLane.primaryKind === 'url' ? url : text

  useEffect(() => {
    if (!open) {
      resetDraftState()
      capture.reset()
      return
    }
    setDeckId(getLastUsedDeck())

    if (initialUrl) setUrl(normalizeURLInput(initialUrl))
    if (initialTitle) setTitle(initialTitle)

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
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill, initialUrl, initialTitle])

  const detected = useMemo(() => {
    if (!url.trim() && !text.trim()) return null
    return detectType({
      url: url.trim() || undefined,
      text: text.trim() || undefined,
      title_hint: title.trim() || undefined,
    })
  }, [url, text, title])

  useEffect(() => {
    if (!detected || userPickedLane) return
    setActiveLaneId(laneForType(detected.type).id)
  }, [detected, userPickedLane])

  const forcedType = activeLane.itemType
  const suggestedTags = useMemo(() => {
    const base = suggestCaptureTags({
      type: forcedType,
      url: url.trim() || undefined,
      text: text.trim() || undefined,
    })
    return [...new Set([...base, ...activeLane.defaultTags])].slice(0, 8)
  }, [activeLane.defaultTags, forcedType, text, url])

  useEffect(() => {
    if (tagsTouched || tagsRaw.trim() || suggestedTags.length === 0) return
    setTagsRaw(suggestedTags.join(', '))
  }, [suggestedTags, tagsRaw, tagsTouched])

  const [lastPreviewUrl, setLastPreviewUrl] = useState('')
  useEffect(() => {
    const urlTrimmed = url.trim()
    if (!urlTrimmed || !looksLikeURL(urlTrimmed)) {
      setPreview(null)
      setLastPreviewUrl('')
      return
    }
    if (urlTrimmed === lastPreviewUrl) return
    setLastPreviewUrl(urlTrimmed)

    const timer = setTimeout(async () => {
      try {
        const res = await previewFetch.mutateAsync({
          url: urlTrimmed,
          type_hint: forcedType,
        })
        setPreview(res)
      } catch {
        setPreview(null)
      }
    }, 300)

    return () => clearTimeout(timer)
    // Debounced URL preview. previewFetch (react-query mutation) changes
    // identity while in-flight; adding it would retrigger mid-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedType, lastPreviewUrl, url])

  const canSubmit = Boolean(primaryValue.trim()) && !capture.isPending

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const tags = parseCaptureTags(tagsRaw)
    const normalizedUrl = normalizeURLInput(url)
    const submitUrl = looksLikeURL(normalizedUrl) ? normalizedUrl : ''
    const submitText = activeLane.primaryKind === 'text'
      ? text.trim()
      : text.trim() || (!submitUrl ? normalizedUrl : '')

    try {
      const res = await capture.mutateAsync({
        source,
        deck_id: deckId || undefined,
        url: submitUrl || undefined,
        text: submitText || undefined,
        title_hint: title.trim() || undefined,
        type_hint: forcedType,
        why_saved: whySaved.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
      showToast(res.duplicate_of ? t('capture.duplicate_msg') : t('capture.saved_success'), res.duplicate_of ? 'info' : 'success')
      setLastCapture(res)
    } catch {
      /* Error shown inline below */
    }
  }

  function resetDraftState() {
    setUrl('')
    setText('')
    setTitle('')
    setWhySaved('')
    setTagsRaw('')
    setTagsTouched(false)
    setDeckId(null)
    setActiveLaneId('repo')
    setUserPickedLane(false)
    setPreview(null)
    setLastPreviewUrl('')
    setLastCapture(null)
    setIsDragging(false)
  }

  function resetDraftForNext() {
    resetDraftState()
    setDeckId(getLastUsedDeck())
    capture.reset()
  }

  function openCapturedItem() {
    const id = lastCapture?.item?.id || lastCapture?.duplicate_of
    if (!id || !onOpenItem) return
    onOpenItem(id, lastCapture?.item ?? null)
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
      showToast(t('capture.mark_review_success'), 'success')
    } catch {
      showToast(t('capture.mark_review_error'), 'error')
    }
  }

  function submitFromShortcut(e: ReactKeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  function applySuggestedTag(tag: string) {
    const existing = parseCaptureTags(tagsRaw)
    const merged = [...new Set([...existing, tag])]
    setTagsRaw(merged.join(', '))
    setTagsTouched(true)
  }

  function applyAllSuggestedTags() {
    const existing = parseCaptureTags(tagsRaw)
    const merged = [...new Set([...existing, ...suggestedTags])]
    setTagsRaw(merged.join(', '))
    setTagsTouched(true)
  }

  function pickLane(id: CaptureLaneId) {
    setActiveLaneId(id)
    setUserPickedLane(true)
  }

  function handlePrimaryChange(value: string) {
    if (activeLane.primaryKind === 'url') {
      setUrl(value)
    } else {
      setText(value)
    }
  }

  function handlePrimaryBlur() {
    if (activeLane.primaryKind === 'url') setUrl((current) => normalizeURLInput(current))
  }

  function handlePrimaryPaste(e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData('text/plain').trim()
    if (!pasted || text.trim() || url.trim()) return
    if (looksLikePotentialURL(pasted)) {
      e.preventDefault()
      setUrl(normalizeURLInput(pasted))
      setText('')
    }
  }

  if (!open) return null

  const laneKey = `capture.lanes.${activeLaneId}` as const

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- backdrop click-to-close overlay; closing is also reachable via the Close button and Escape
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-accent-cyan/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        ref={formRef}
        onSubmit={onSubmit}
        role="presentation"
        onKeyDown={submitFromShortcut}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <header className="flex items-center justify-between gap-4 border-b-3 border-ink p-5 bg-bg-card">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold text-ink-soft">Developer Utility Belt</p>
            <h2 className="font-display font-black text-3xl uppercase">{t('capture.modal_title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="border-3 border-ink p-1 hover:bg-accent-pink transition-colors"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          {lastCapture ? (
            <CaptureSuccess
              lastCapture={lastCapture}
              updatePending={updateItem.isPending}
              onOpenItem={onOpenItem ? openCapturedItem : undefined}
              onReset={resetDraftForNext}
              onReview={markForTeamReview}
              onClose={onClose}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
              <LanePicker
                activeLaneId={activeLaneId}
                detectedType={detected?.type ?? null}
                onPick={pickLane}
              />

              <div className="space-y-5">
                <section className="border-3 border-ink bg-bg-primary p-4 shadow-hard-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase font-bold text-ink-soft">{t(`${laneKey}.eyebrow`)}</p>
                      <h3 className="font-display font-black uppercase text-xl">{t(activeLane.label)}</h3>
                      <p className="text-sm text-ink-soft mt-1">{t(`${laneKey}.microcopy`)}</p>
                    </div>
                    {detected && (
                      <div className="border-2 border-ink bg-accent-lime/40 px-2 py-1 text-[10px] font-mono uppercase font-bold shrink-0">
                        {t('common.auto')}: {detected.type}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block md:col-span-2">
                      <span className="block text-xs font-mono font-bold uppercase mb-1">{t('capture.name_label')}</span>
                      <input
                        id="capture-title"
                        aria-label={t('capture.name_label')}
                        type="text"
                        placeholder={t(activeLane.namePlaceholder)}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border-3 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
                      />
                    </label>

                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drag-and-drop drop zone; the nested input/textarea provides keyboard access */}
                    <label
                      className={`block md:col-span-2 ${isDragging ? 'bg-accent-yellow/30' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        const dropped = e.dataTransfer.getData('text/plain')
                        if (!dropped) return
                        if (looksLikePotentialURL(dropped)) setUrl(normalizeURLInput(dropped))
                        else setText(dropped)
                      }}
                    >
                      <span className="block text-xs font-mono font-bold uppercase mb-1">{t(`${laneKey}.primary_label`)}</span>
                      {activeLane.multiline ? (
                        <textarea
                          id="capture-primary"
                          aria-label={t(`${laneKey}.primary_label`)}
                          autoFocus
                          rows={5}
                          placeholder={t(activeLane.primaryPlaceholder)}
                          value={primaryValue}
                          onChange={(e) => handlePrimaryChange(e.target.value)}
                          onPaste={handlePrimaryPaste}
                          className="w-full border-3 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none"
                        />
                      ) : (
                        <input
                          id="capture-primary"
                          aria-label={t(`${laneKey}.primary_label`)}
                          autoFocus
                          type="text"
                          inputMode={activeLane.primaryKind === 'url' ? 'url' : 'text'}
                          placeholder={t(activeLane.primaryPlaceholder)}
                          value={primaryValue}
                          onChange={(e) => handlePrimaryChange(e.target.value)}
                          onBlur={handlePrimaryBlur}
                          onPaste={handlePrimaryPaste}
                          className="w-full border-3 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
                        />
                      )}
                    </label>

                    <label className="block md:col-span-2">
                      <span className="block text-xs font-mono font-bold uppercase mb-1">{t(`${laneKey}.secondary_label`)}</span>
                      <input
                        id="capture-secondary"
                        aria-label={t(`${laneKey}.secondary_label`)}
                        type="text"
                        placeholder={t(`${laneKey}.secondary_placeholder`)}
                        value={whySaved}
                        onChange={(e) => setWhySaved(e.target.value)}
                        className="w-full border-3 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="block text-xs font-mono font-bold uppercase mb-1">{t('capture.tags_label')}</span>
                      <input
                        id="capture-tags"
                        aria-label={t('capture.tags_label')}
                        type="text"
                        placeholder="typescript, react, cli"
                        value={tagsRaw}
                        onChange={(e) => {
                          setTagsRaw(e.target.value)
                          setTagsTouched(true)
                        }}
                        className="w-full border-3 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
                      />
                      {suggestedTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-ink-soft">{t('capture.suggested_tags')}</span>
                          {suggestedTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => applySuggestedTag(tag)}
                              className="border-2 border-ink px-2 py-0.5 bg-accent-cyan/30 text-xs font-mono hover:bg-accent-cyan/60"
                            >
                              {tag}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={applyAllSuggestedTags}
                            className="text-xs font-mono font-bold underline"
                          >
                            {t('capture.apply_all')}
                          </button>
                        </div>
                      )}
                    </label>

                    <div className="md:col-span-2">
                      <span className="block text-xs font-mono font-bold uppercase mb-1">{t('capture.deck_label')}</span>
                      <DeckSelect value={deckId} onChange={setDeckId} />
                    </div>
                  </div>
                </section>

                <CapturePreview
                  laneId={activeLaneId}
                  forcedType={forcedType}
                  title={title || detected?.title || ''}
                  url={url}
                  text={text}
                  whySaved={whySaved}
                  tags={parseCaptureTags(tagsRaw)}
                  preview={preview}
                  previewLoading={previewFetch.isPending}
                />

                {capture.error && (
                  <div className="p-3 bg-danger text-white border-3 border-ink font-bold text-sm">
                    {(capture.error as Error).message}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
                  <Button type="submit" disabled={!canSubmit}>
                    {capture.isPending ? t('capture.saving') : t('capture.save_button')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

function LanePicker({
  activeLaneId,
  detectedType,
  onPick,
}: {
  activeLaneId: CaptureLaneId
  detectedType: ItemType | null
  onPick: (id: CaptureLaneId) => void
}) {
  const { t } = useTranslation()
  return (
    <aside className="border-3 border-ink bg-bg-elevated p-3 h-fit">
      <p className="font-display font-black uppercase text-xs tracking-widest mb-3">{t('capture.sidebar_title')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
        {CAPTURE_LANES.map((lane) => {
          const Icon = lane.icon
          const active = lane.id === activeLaneId
          const detected = detectedType && laneForType(detectedType).id === lane.id
          return (
            <button
              key={lane.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(lane.id)}
              className={`text-left border-3 border-ink p-3 transition-all ${
                active ? 'bg-accent-lime shadow-hard-sm' : 'bg-bg-card hover:bg-accent-yellow/40'
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon size={17} strokeWidth={3} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black uppercase text-xs">{t(lane.label)}</span>
                    {detected && <Sparkles size={12} className="text-accent-pink" />}
                  </div>
                  <p className="font-mono text-[10px] text-ink-soft mt-0.5 leading-tight">{t(lane.example)}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function CapturePreview({
  laneId,
  forcedType,
  title,
  url,
  text,
  whySaved,
  tags,
  preview,
  previewLoading,
}: {
  laneId: CaptureLaneId
  forcedType: ItemType
  title: string
  url: string
  text: string
  whySaved: string
  tags: string[]
  preview: PreviewResponse | null
  previewLoading: boolean
}) {
  const { t } = useTranslation()
  const lane = laneForId(laneId)
  const Icon = lane.icon
  const mainLine = lane.primaryKind === 'url' ? url : text

  return (
    <section className="border-3 border-ink bg-bg-card p-4 shadow-hard-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} strokeWidth={3} />
        <h3 className="font-display font-black uppercase text-sm tracking-widest">{t('capture.preview.title')}</h3>
        <span className="border-2 border-ink bg-bg-primary px-2 py-0.5 text-[10px] font-mono uppercase font-bold">
          {forcedType}
        </span>
      </div>

      {preview?.image && (
        <img src={preview.image} alt="" className="w-full h-32 object-cover mb-3 border-2 border-ink" />
      )}
      <p className="font-display font-black text-xl uppercase break-words">
        {title || preview?.title || t(lane.namePlaceholder)}
      </p>
      {(preview?.description || mainLine) && (
        <p className="text-sm text-ink-soft mt-1 line-clamp-3 whitespace-pre-wrap">
          {preview?.description || mainLine}
        </p>
      )}
      {whySaved && (
        <p className="text-xs font-mono text-ink-soft italic mt-3 border-l-2 border-ink pl-2">
          {whySaved}
        </p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((tag) => (
            <span key={tag} className="border-2 border-ink bg-accent-cyan/20 px-2 py-0.5 text-[10px] font-mono font-bold">
              {tag}
            </span>
          ))}
        </div>
      )}
      {previewLoading && <p className="font-mono text-[10px] text-ink-soft mt-2">{t('capture.preview.loading')}</p>}
    </section>
  )
}

function CaptureSuccess({
  lastCapture,
  updatePending,
  onOpenItem,
  onReset,
  onReview,
  onClose,
}: {
  lastCapture: CaptureResponse
  updatePending: boolean
  onOpenItem?: () => void
  onReset: () => void
  onReview: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="border-3 border-ink bg-accent-lime/30 p-5">
      <p className="font-display font-black uppercase text-2xl mb-1">
        {lastCapture.duplicate_of ? t('capture.already_saved') : t('capture.saved_success')}
      </p>
      <p className="font-mono text-sm text-ink-soft mb-4">
        {lastCapture.item?.title || t('capture.item_in_vault')}
      </p>
      <div className="flex flex-wrap gap-2">
        {onOpenItem && (lastCapture.item?.id || lastCapture.duplicate_of) && (
          <Button type="button" size="sm" onClick={onOpenItem}>
            <span className="flex items-center gap-2">
              <ExternalLink size={14} strokeWidth={3} />
              {t('capture.open_item')}
            </span>
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={onReset}>
          <span className="flex items-center gap-2">
            <Plus size={14} strokeWidth={3} />
            {t('capture.capture_another')}
          </span>
        </Button>
        {lastCapture.item && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={lastCapture.item.tags.includes('team-review') || updatePending}
            onClick={onReview}
          >
            <span className="flex items-center gap-2">
              <Users size={14} strokeWidth={3} />
              {lastCapture.item.tags.includes('team-review') ? t('capture.in_review') : t('capture.review_with_team')}
            </span>
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>{t('common.close')}</Button>
      </div>
    </div>
  )
}
