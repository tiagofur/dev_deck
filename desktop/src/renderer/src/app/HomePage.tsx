import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddRepoModal } from '../components/AddRepoModal'
import { EmptyState } from '../components/EmptyState'
import { GlobalSearchModal } from '../components/GlobalSearchModal'
import { Mascot } from '../components/Mascot/Mascot'
import { RepoGrid } from '../components/RepoGrid'
import { ShortcutsModal } from '../components/ShortcutsModal'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { useRepos } from '../features/repos/api'

export function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [lang, setLang] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)

  const { data, isLoading, error } = useRepos({
    q: query || undefined,
    tag: tag || undefined,
    lang: lang || undefined,
  })

  // JS-level keyboard shortcuts (window focused):
  //   Cmd/Ctrl+K → global search
  //   Cmd/Ctrl+N → add modal
  //   /          → focus search input
  //   D          → discovery mode
  //   ?          → shortcuts panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setModalOpen(true)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setGlobalSearchOpen(true)
        return
      }

      if (isTyping) return

      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('topbar-search')?.focus()
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(true)
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

  // OS-level shortcuts via Electron main process (fire even when app is background).
  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const unsub = api.onShortcut((name) => {
      if (name === 'search') setGlobalSearchOpen(true)
      if (name === 'add') setModalOpen(true)
    })
    return unsub
  }, [])

  const items = data?.items ?? []
  const hasFilters = Boolean(query || tag || lang)

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Topbar
        query={query}
        onQueryChange={setQuery}
        onAdd={() => setModalOpen(true)}
        onDiscovery={() => navigate('/discovery')}
        onSettings={() => navigate('/settings')}
        onGlobalSearch={() => setGlobalSearchOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          repos={items}
          selectedTag={tag}
          selectedLang={lang}
          onSelectTag={setTag}
          onSelectLang={setLang}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <p className="font-mono text-ink-soft">Cargando…</p>
          )}

          {error && (
            <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl">
              <p className="font-display font-bold text-lg mb-1">
                No se pudo conectar al backend
              </p>
              <p className="text-sm font-mono">
                {(error as Error).message}
              </p>
              <p className="text-xs font-mono mt-2 opacity-90">
                ¿Está corriendo `make run` en /backend? ¿VITE_API_TOKEN coincide con API_TOKEN?
              </p>
            </div>
          )}

          {!isLoading && !error && items.length === 0 && !hasFilters && (
            <EmptyState onAdd={() => setModalOpen(true)} />
          )}

          {!isLoading && !error && items.length === 0 && hasFilters && (
            <p className="font-mono text-ink-soft">
              Sin resultados para los filtros actuales.
            </p>
          )}

          {items.length > 0 && (
            <>
              <p className="font-mono text-xs text-ink-soft mb-4">
                {data?.total} repos
              </p>
              <RepoGrid
                repos={items}
                onSelect={(r) => navigate(`/repo/${r.id}`)}
              />
            </>
          )}
        </main>
      </div>

      <AddRepoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <ShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
      />

      <Mascot />
    </div>
  )
}
