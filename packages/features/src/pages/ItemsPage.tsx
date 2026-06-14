import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Box, Compass, Plus, TerminalSquare, Users } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ItemCard } from '../components/ItemCard'
import { OnboardingChecklist } from '../components/OnboardingChecklist'
import { detailPathForItem } from '../utils/itemRoutes'
import { useItems } from '@devdeck/api-client'
import { ALL_ITEM_TYPES, type ItemType } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

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
type WorkflowFilter = 'team-review'

export function ItemsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [type, setType] = useState<TypeFilter>('all')
  const [stack, setStack] = useState<StackFilter[]>([])
  const [workflow, setWorkflow] = useState<WorkflowFilter | ''>('')
  const [query, setQuery] = useState('')

  const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = useMemo(() => [
    { key: 'all', label: t('items.all') },
    ...ALL_ITEM_TYPES.map((t) => ({ key: t as TypeFilter, label: String(t).toUpperCase() })),
  ], [t])

  // Build stack query param — comma-separated for OR logic
  const stackParam = stack.length > 0 ? stack.join(',') : undefined

  const { data, isLoading, error } = useItems({
    type: type === 'all' ? undefined : type,
    tag: workflow || undefined,
    stack: stackParam,
    q: query || undefined,
    limit: 200,
    sort: 'added_desc',
  })
  const { data: reviewData } = useItems({
    tag: 'team-review',
    limit: 1,
    sort: 'updated_desc',
  })

  const items = useMemo(() => data?.items ?? [], [data])
  const reviewCount = reviewData?.total ?? 0

  // Handler: toggle a stack in the filter
  function toggleStack(s: StackFilter) {
    setStack((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  // Handler: clear all filters
  function clearFilters() {
    setType('all')
    setStack([])
    setWorkflow('')
    setQuery('')
  }

  const hasFilters = type !== 'all' || stack.length > 0 || workflow || query.length > 0

  function openCapture() {
    window.dispatchEvent(new CustomEvent('devdeck:open-capture'))
  }

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

  return (
    <AppShell
      query={query}
      onQueryChange={setQuery}
      reviewCount={reviewCount}
      contentClassName="flex-1 flex flex-col overflow-hidden"
    >

      <nav className="min-w-0 border-b-3 border-ink px-4 py-3 sm:px-6">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
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
        <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto border-t border-ink/30 pt-3 pb-1 md:flex-wrap md:overflow-visible md:pb-0">
          <span className="shrink-0 py-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
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
              {t('items.clear_filters')}
            </button>
          )}
        </div>

        <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto border-t border-ink/30 pt-3 pb-1 md:flex-wrap md:overflow-visible md:pb-0">
          <span className="shrink-0 py-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
            {t('items.workflow_filter')}:
          </span>
          <button
            type="button"
            onClick={() => setWorkflow((current) => current === 'team-review' ? '' : 'team-review')}
            className={`border-3 border-ink px-2 py-0.5 text-xs font-mono
                        transition-colors whitespace-nowrap inline-flex items-center gap-1.5
                        ${
                          workflow === 'team-review'
                            ? 'bg-accent-yellow shadow-hard-sm'
                            : 'bg-bg-card hover:bg-accent-yellow/40'
                        }`}
          >
            <Users size={12} strokeWidth={3} />
            team review
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        {isLoading && <p className="font-mono text-ink-soft">{t('common.loading')}</p>}

        {error && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl">
            <p className="font-display font-bold text-lg mb-1">{t('common.error')}</p>
            <p className="text-sm font-mono">{(error as Error).message}</p>
          </div>
        )}
        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-8">
            <div>
              <Box size={64} strokeWidth={2} className="mb-4 opacity-50 mx-auto" />
              <p className="font-display font-bold text-xl mb-2">{t('items.empty_state_title')}</p>
              <p className="font-mono text-sm text-ink-soft max-w-sm">
                {hasFilters ? t('items.no_results_filters') : t('items.empty_state_desc')}
              </p>
            </div>

            {!hasFilters && (
              <div className="w-full max-w-4xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  <UtilityAction
                    icon={<TerminalSquare size={18} strokeWidth={3} />}
                    title={t('items.utility_save_cmd_title')}
                    desc={t('items.utility_save_cmd_desc')}
                    onClick={openCapture}
                  />
                  <UtilityAction
                    icon={<BookOpen size={18} strokeWidth={3} />}
                    title={t('items.utility_cheats_title')}
                    desc={t('items.utility_cheats_desc')}
                    onClick={() => navigate('/cheatsheets')}
                  />
                  <UtilityAction
                    icon={<Compass size={18} strokeWidth={3} />}
                    title={t('items.utility_discover_title')}
                    desc={t('items.utility_discover_desc')}
                    onClick={() => navigate('/discovery')}
                  />
                </div>
                <OnboardingChecklist />
              </div>
            )}

            <button
              type="button"
              onClick={openCapture}
              className="border-3 border-ink px-4 py-2 bg-accent-lime shadow-hard
                         font-display font-bold uppercase"
            >
              <Plus size={16} strokeWidth={3} className="inline-block mr-2" />
              {hasFilters ? t('items.capture_something') : t('items.capture_first_item')}
            </button>
          </div>
        )}


        {items.length > 0 && (
          <>
            <p className="font-mono text-xs text-ink-soft mb-4">
              {t('items.items_count', { count: data?.total })}
              {type !== 'all' && ` · ${t('items.type_filter')}: ${type}`}
              {stack.length > 0 && ` · ${t('items.stack_filter')}: ${stack.join(', ')}`}
              {workflow && ` · ${t('items.workflow_filter')}: ${workflow}`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  onClick={() => {
                    navigate(detailPathForItem(it))
                  }}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </AppShell>
  )
}

function UtilityAction({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: ReactNode
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-3 border-ink bg-bg-card p-4 text-left shadow-hard-sm hover:bg-accent-yellow/30 transition-colors"
    >
      <div className="flex items-center gap-2 font-display font-black uppercase text-sm">
        {icon}
        {title}
      </div>
      <p className="font-mono text-xs text-ink-soft mt-2 leading-relaxed">{desc}</p>
    </button>
  )
}
