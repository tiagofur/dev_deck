import { BookOpen, Boxes, Plus, Search, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  onAdd: () => void
  onDiscovery: () => void
  onSettings: () => void
  onGlobalSearch: () => void
}

export function Topbar({
  query,
  onQueryChange,
  onAdd,
  onDiscovery,
  onSettings,
  onGlobalSearch,
}: Props) {
  const navigate = useNavigate()

  return (
    <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-6">
      <h1
        className="font-display font-black text-2xl uppercase tracking-tight whitespace-nowrap cursor-pointer"
        onClick={() => navigate('/')}
      >
        Dev<span className="bg-accent-pink px-1.5 border-2 border-ink">Deck</span>
      </h1>

      <div className="flex-1 max-w-xl mx-auto relative">
        <Search
          size={18}
          strokeWidth={2.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          id="topbar-search"
          type="search"
          placeholder="Buscar repos…  (apretá / )"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full border-3 border-ink pl-10 pr-3 py-2 font-mono text-sm
                     focus:outline-none focus:bg-accent-yellow/20"
        />
      </div>

      <Button
        onClick={onGlobalSearch}
        size="sm"
        variant="ghost"
        className="whitespace-nowrap"
        title="Búsqueda global (Ctrl+K)"
      >
        <span className="flex items-center gap-2">
          <Search size={16} strokeWidth={3} />
          <span className="hidden sm:inline">Search</span>
        </span>
      </Button>

      <Button
        onClick={() => navigate('/items')}
        size="sm"
        variant="secondary"
        className="whitespace-nowrap"
        title="Todos los items (Ola 5)"
      >
        <span className="flex items-center gap-2">
          <Boxes size={16} strokeWidth={3} />
          <span className="hidden sm:inline">Items</span>
        </span>
      </Button>

      <Button
        onClick={() => navigate('/cheatsheets')}
        size="sm"
        variant="secondary"
        className="whitespace-nowrap"
        title="Cheatsheets"
      >
        <span className="flex items-center gap-2">
          <BookOpen size={16} strokeWidth={3} />
          <span className="hidden sm:inline">Cheats</span>
        </span>
      </Button>

      <Button
        onClick={onDiscovery}
        size="sm"
        variant="accent"
        className="whitespace-nowrap"
        title="Modo descubrimiento (D)"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={16} strokeWidth={3} />
          Discover
        </span>
      </Button>

      <Button onClick={onAdd} size="sm" className="whitespace-nowrap">
        <span className="flex items-center gap-2">
          <Plus size={16} strokeWidth={3} />
          Add
        </span>
      </Button>

      <button
        type="button"
        onClick={onSettings}
        aria-label="Settings"
        title="Settings"
        className="border-3 border-ink p-2 bg-bg-card shadow-hard
                   hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                   active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                   transition-all duration-150"
      >
        <SettingsIcon size={16} strokeWidth={3} />
      </button>
    </header>
  )
}
