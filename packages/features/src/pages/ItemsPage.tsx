import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Plus } from 'lucide-react'
import { CaptureModal } from '../components/CaptureModal'
import { ItemCard } from '../components/ItemCard'
import { useItems } from '@devdeck/api-client'
import { ALL_ITEM_TYPES, type ItemType } from '@devdeck/api-client'

// Ola 5 Fase 17 — polymorphic items grid.
//
// This page is the new canonical "everything you've saved" view. It
// reads from GET /api/items so it surfaces every type (repos, CLIs,
// snippets, notes, shortcuts, etc.), not just repos. HomePage still
// works against the legacy /api/repos endpoint and stays around
// until the rest of the UI migrates — no sudden yanking of features.

type TypeFilter = 'all' | ItemType

const STACKS = ['go', 'node', 'python', 'rust', 'typescript', 'react', 'vue', 'ai', 'cli', 'db'] as const

type StackFilter = typeof STACKS[number]

const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: 'All' },
  ...ALL_ITEM_TYPES.map((t) => ({ key: t as TypeFilter, label: t })),
]

export function ItemsPage() {
  const navigate = useNavigate()
  const [type, setType] = useState<TypeFilter>('all')
  const [stack, setStack] = useState<StackFilter[]>([])
  const [query, setQuery] = useState('')
  const [captureOpen, setCaptureOpen] = useState(false)

  // Build stack query param — comma-separated for OR logic
  const stackParam = stack.length > 0 ? stack.join(',') : undefined

  const { data, isLoading, error } = useItems({
    type: type === 'all' ? undefined : type,
    stack: stackParam,
    q: query || undefined,
    limit: 200,
    sort: 'added_desc',
  })

  const items = data?.items ?? []

  // Handler: toggle a stack in the filter
  function toggleStack(s: StackFilter) {
    setStack((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  // Handler: clear all filters
  function clearFilters() {
    setType('all')
    setStack([])
    setQuery('')
  }

  const hasFilters = type !== 'all' || stack.length > 0 || query.length > 0

  // Count by type for the chip badges. The UI doesn't paginate between
  // types so this is a single pass over the current page, not a
  // separate backend call — good enough for vault sizes < 1k.
  const countsByType = useMemo(() => {
    const out: Record<string, number> = {}
    for (const it of items) {
      out[it.item_type] = (out[it.item_type] ?? 0) + 1
    }
    return out
  }, [items])

  // Keyboard shortcuts: Cmd/Ctrl+K → open capture modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCaptureOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="font-display font-black text-2xl uppercase hover:text-accent-orange transition-colors"
          aria-label="Volver a home"
        >
          DevDeck
        </button>
        <span className="font-mono text-sm text-ink-soft">/ items</span>

        <div className="flex-1" />

        <input
          type="search"
          placeholder="Buscar en items…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-3 border-ink px-3 py-2 font-mono text-sm
                     focus:outline-none focus:bg-accent-yellow/20 w-64"
        />

        <button
          type="button"
          onClick={() => setCaptureOpen(true)}
          className="border-3 border-ink px-3 py-2 bg-accent-lime shadow-hard-sm
                     font-display font-bold uppercase text-sm hover:bg-accent-lime/80
                     flex items-center gap-1.5"
        >
          <Plus size={16} strokeWidth={3} />
          Capturar
        </button>
      </header>

      <nav className="border-b-3 border-ink px-6 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {TYPE_FILTERS.map((f) => {
            const active = f.key === type
            const count = f.key === 'all' ? items.length : countsByType[f.key] ?? 0
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setType(f.key)}
                className={`border-3 border-ink px-3 py-1 text-xs font-display font-bold
                            uppercase tracking-wide transition-colors whitespace-nowrap
                            ${
                              active
                                ? 'bg-accent-lime shadow-hard-sm'
                                : 'bg-bg-card hover:bg-accent-yellow/40'
                            }`}
              >
                {f.label}
                {count > 0 && (
                  <span className="ml-1.5 opacity-60">({count})</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Stack filters — inline pills */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-ink/30">
          <span className="text-xs font-mono text-ink-soft uppercase tracking-wide py-1">
            Stack:
          </span>
          {STACKS.map((s) => {
            const active = stack.includes(s as StackFilter)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStack(s as StackFilter)}
                className={`border-3 border-ink px-2 py-0.5 text-xs font-mono
                            lowercase transition-colors whitespace-nowrap
                            ${
                              active
                                ? 'bg-accent-orange text-white shadow-hard-sm'
                                : 'bg-bg-card hover:bg-accent-yellow/40'
                            }`}
              >
                {s}
              </button>
            )
          })}

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-2 px-2 py-0.5 text-xs font-mono text-ink-soft
                         hover:text-danger transition-colors"
            >
              [clear]
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6">
        {isLoading && <p className="font-mono text-ink-soft">Cargando…</p>}

        {error && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl">
            <p className="font-display font-bold text-lg mb-1">No se pudo conectar al backend</p>
            <p className="text-sm font-mono">{(error as Error).message}</p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Box size={64} strokeWidth={2} className="mb-4 opacity-50" />
            <p className="font-display font-bold text-xl mb-2">Nada por acá todavía</p>
            <p className="font-mono text-sm text-ink-soft max-w-sm mb-6">
              Capturá una URL, un comando, un atajo o una nota con el botón de arriba,
              o usá <kbd>⌘⇧V</kbd> con algo en el clipboard.
            </p>
            <button
              type="button"
              onClick={() => setCaptureOpen(true)}
              className="border-3 border-ink px-4 py-2 bg-accent-lime shadow-hard
                         font-display font-bold uppercase"
            >
              Capturar algo
            </button>
          </div>
        )}

        {items.length > 0 && (
          <>
            <p className="font-mono text-xs text-ink-soft mb-4">
              {data?.total} items
              {type !== 'all' && ` · tipo: ${type}`}
              {stack.length > 0 && ` · stack: ${stack.join(', ')}`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  onClick={() => {
                    navigate(`/items/${it.id}`)
                  }}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <CaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        source="manual"
      />
    </div>
  )
}
