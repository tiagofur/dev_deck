import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'
import { Github, Plus } from 'lucide-react'
import { detailPathForItem } from '../utils/itemRoutes'
import { Mascot } from '../components/Mascot/Mascot'
import { ItemGrid } from '../components/ItemGrid'
import { Sidebar } from '../components/Sidebar'
import { AppShell } from '../components/AppShell'
import { useItems } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [lang, setLang] = useState<string | null>(null)

  const { data, isLoading, error } = useItems({
    q: query || undefined,
    tag: tag || undefined,
    stack: lang || undefined, // Sidebar 'lang' maps to 'stack' filter in items
    sort: 'added_desc',
    limit: 100,
  })

  // Local keys for contextual navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isTyping) return

      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('topbar-search')?.focus()
        return
      }
      if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        navigate('/discovery')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const items = data?.items ?? []
  const hasFilters = Boolean(query || tag || lang)

  function openCapture() {
    window.dispatchEvent(new CustomEvent('devdeck:open-capture'))
  }

  return (
    <AppShell
      query={query}
      onQueryChange={setQuery}
      contentClassName="flex-1 flex overflow-hidden"
    >
      <Sidebar
        items={items}
        selectedTag={tag}
        selectedLang={lang}
        onSelectTag={setTag}
        onSelectLang={setLang}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {isLoading && (
          <p className="font-mono text-ink-soft">{t('common.loading')}</p>
        )}

        {error && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl">
            <p className="font-display font-bold text-lg mb-1">
              {t('items.backend_connection_error')}
            </p>
            <p className="text-sm font-mono">
              {(error as Error).message}
            </p>
            <p className="text-xs font-mono mt-2 opacity-90">
              {t('items.make_run_hint')}
            </p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && !hasFilters && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Github size={72} strokeWidth={2} className="mb-6 text-ink-soft" />
            <h2 className="font-display font-black text-4xl uppercase mb-3">
              {t('repos.empty_state_title')}
            </h2>
            <p className="font-mono text-ink-soft mb-3 max-w-md">
              {t('repos.empty_state_desc')}
            </p>
            <p className="font-mono text-xs text-ink-soft/70 mb-8 max-w-md">
              {t('repos.empty_state_hint')}
            </p>
            <Button onClick={openCapture} size="lg">
              <span className="flex items-center gap-2">
                <Plus size={16} strokeWidth={3} />
                {t('repos.empty_state_action')}
              </span>
            </Button>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && hasFilters && (
          <p className="font-mono text-ink-soft">
            {t('items.no_results_filters')}
          </p>
        )}

        {items.length > 0 && (
          <>
            <p className="font-mono text-xs text-ink-soft mb-4">
              {t('items.items_count', { count: data?.total })}
            </p>
            <ItemGrid
              items={items}
              onSelect={(it) => navigate(detailPathForItem(it))}
            />
          </>
        )}
      </main>

      <Mascot />
    </AppShell>
  )
}
