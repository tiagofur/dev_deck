import clsx from 'clsx'
import { BookOpen, ChevronLeft, Search, Star } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExploreCheatsheets } from '@devdeck/api-client'
import type { Cheatsheet } from '@devdeck/api-client'

const categoryLabels: Record<string, string> = {
  vcs: 'Version Control',
  os: 'OS / CLI',
  language: 'Languages',
  framework: 'Frameworks',
  tool: 'Tools',
  'package-manager': 'Package Managers',
  editor: 'Editors',
  shell: 'Shell / Terminal',
  cloud: 'Cloud / DevOps',
  other: 'Other',
}

export function ExplorePage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const { data: cheatsheets = [], isLoading } = useExploreCheatsheets(selectedCategory ?? undefined)

  const filtered = cheatsheets.filter(c => 
    c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.description.toLowerCase().includes(searchFilter.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-soft bg-bg-primary">
        Explorando el conocimiento colectivo…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r-3 border-ink bg-bg-elevated p-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-mono text-ink-soft
                     hover:text-ink mb-8 transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={3} />
          Volver
        </button>

        <h2 className="font-display font-black text-xs uppercase tracking-widest mb-4 text-ink">
          Categorías
        </h2>
        <div className="space-y-1">
          <CategoryButton
            label="Todas"
            active={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          />
          {Object.entries(categoryLabels).map(([key, label]) => (
            <CategoryButton
              key={key}
              label={label}
              active={selectedCategory === key}
              onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
            />
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10 max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-accent-yellow border-3 border-ink p-2 shadow-hard-sm">
              <Star size={32} strokeWidth={3} className="text-ink" />
            </div>
            <h1 className="font-display font-black text-5xl uppercase tracking-tighter">
              Explore Vaults
            </h1>
          </div>
          <p className="font-mono text-lg text-ink-soft max-w-2xl">
            Descubre cheatsheets creadas por la comunidad y el equipo oficial de DevDeck. 
            Cópialas a tu vault personal con un solo clic.
          </p>
          
          <div className="mt-8 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
            <input 
              type="text"
              placeholder="Buscar cheatsheets públicas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full border-3 border-ink p-3 pl-10 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10"
            />
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-bg-card border-3 border-ink border-dashed">
            <BookOpen size={48} strokeWidth={1} className="mx-auto mb-4 text-ink-soft opacity-30" />
            <p className="font-mono text-ink-soft">
              No encontramos lo que buscas. ¡Prueba con otra categoría o término!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <ExploreCard
                key={c.id}
                cheatsheet={c}
                onClick={() => navigate(`/cheatsheets/${c.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function CategoryButton({
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
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-2 text-sm font-mono border-2 transition-all',
        active
          ? 'bg-bg-card border-ink shadow-hard-sm translate-x-1'
          : 'border-transparent hover:border-ink/20',
      )}
    >
      {label}
    </button>
  )
}

function ExploreCard({
  cheatsheet,
  onClick,
}: {
  cheatsheet: Cheatsheet
  onClick: () => void
}) {
  const color = cheatsheet.color ?? '#888'
  return (
    <div
      onClick={onClick}
      className="bg-bg-card border-3 border-ink shadow-hard p-6 text-left cursor-pointer
                 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                 transition-all duration-150 group relative"
    >
      {cheatsheet.is_official && (
        <div className="absolute top-3 right-3 bg-accent-blue border-2 border-ink px-1.5 py-0.5 
                      text-[9px] font-black uppercase tracking-tighter shadow-hard-sm">
          Official
        </div>
      )}
      
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 border-3 border-ink flex items-center justify-center text-2xl shrink-0 shadow-hard-sm"
          style={{ backgroundColor: color + '20' }}
        >
          {cheatsheet.icon ?? '📄'}
        </div>
        <div className="min-w-0 pr-12">
          <h3 className="font-display font-black text-xl uppercase leading-tight truncate group-hover:text-accent-pink transition-colors">
            {cheatsheet.title}
          </h3>
          <span className="font-mono text-[10px] text-ink-soft uppercase font-bold">
            {cheatsheet.category}
          </span>
        </div>
      </div>
      
      <p className="font-mono text-xs text-ink-soft line-clamp-3 mb-6 min-h-[3em]">
        {cheatsheet.description || 'Una colección de comandos esenciales para potenciar tu flujo de trabajo.'}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-ink-soft">
          <span className="flex items-center gap-1">
            <Star size={12} /> {cheatsheet.stars_count || 0}
          </span>
          <span>{cheatsheet.fork_count || 0} forks</span>
        </div>
        <div className="text-[10px] font-mono font-bold uppercase underline group-hover:text-ink transition-colors">
          Ver detalles
        </div>
      </div>
    </div>
  )
}
