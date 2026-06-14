import clsx from 'clsx'
import { BookOpen, Search, Sparkles, Star } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useExploreCheatsheets, useFeatureFlags } from '@devdeck/api-client'
import type { Cheatsheet } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import { AppShell } from '../components/AppShell'
import { FeatureDisabledState } from '../components/FeatureDisabledState'
import { DiscoverySurface } from '../components/Discovery/DiscoverySurface'

type ExploreSurface = 'cheatsheets' | 'discovery'

export function ExplorePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const features = useFeatureFlags()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const { data: cheatsheets = [], isLoading } = useExploreCheatsheets(selectedCategory ?? undefined)

  const surface: ExploreSurface = searchParams.get('tab') === 'discovery' ? 'discovery' : 'cheatsheets'
  const selectSurface = (next: ExploreSurface) =>
    setSearchParams(next === 'discovery' ? { tab: 'discovery' } : {}, { replace: true })

  if (!features.explore) {
    return <FeatureDisabledState featureName={t('nav.explore')} />
  }

  if (surface === 'discovery') {
    return (
      <AppShell contentClassName="flex-1 flex flex-col overflow-hidden">
        <SurfaceTabs surface={surface} onSelect={selectSurface} />
        <DiscoverySurface />
      </AppShell>
    )
  }

  const categoryLabels: Record<string, string> = {
    vcs: t('cheatsheets.categories.vcs'),
    os: t('cheatsheets.categories.os'),
    language: t('cheatsheets.categories.language'),
    framework: t('cheatsheets.categories.framework'),
    tool: t('cheatsheets.categories.tool'),
    'package-manager': t('cheatsheets.categories.package-manager'),
    editor: t('cheatsheets.categories.editor'),
    shell: t('cheatsheets.categories.shell'),
    cloud: t('cheatsheets.categories.cloud'),
    other: t('cheatsheets.categories.other'),
  }

  const filtered = cheatsheets.filter(c => 
    c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.description.toLowerCase().includes(searchFilter.toLowerCase())
  )

  if (isLoading) {
    return (
      <AppShell contentClassName="flex-1 flex items-center justify-center font-mono text-ink-soft bg-bg-primary">
        {t('explore.loading_message')}
      </AppShell>
    )
  }

  return (
    <AppShell contentClassName="flex-1 flex flex-col overflow-hidden">
      <SurfaceTabs surface={surface} onSelect={selectSurface} />
      <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r-3 border-ink bg-bg-elevated p-6">
        <h2 className="font-display font-black text-xs uppercase tracking-widest mb-4 text-ink">
          {t('common.categories')}
        </h2>
        <div className="space-y-1">
          <CategoryButton
            label={t('cheatsheets.categories.all')}
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
      <main className="flex-1 p-10 max-w-6xl mx-auto overflow-y-auto">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-accent-yellow border-3 border-ink p-2 shadow-hard-sm">
              <Star size={32} strokeWidth={3} className="text-ink" />
            </div>
            <h1 className="font-display font-black text-5xl uppercase tracking-tighter">
              {t('explore.title')}
            </h1>
          </div>
          <p className="font-mono text-lg text-ink-soft max-w-2xl">
            {t('explore.subtitle')}
          </p>
          
          <div className="mt-8 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={18} />
            <input 
              type="text"
              placeholder={t('explore.search_placeholder')}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full border-3 border-ink p-3 pl-10 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10"
            />
          </div>
        </header>

        {/* Categories Horizontal Scroll Strip (visible below lg) */}
        <div className="lg:hidden mb-8 overflow-x-auto pb-2 -mx-4 px-4 flex gap-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={clsx(
              'px-3 py-1 text-xs font-mono border-2 whitespace-nowrap transition-colors shrink-0',
              selectedCategory === null
                ? 'bg-accent-yellow border-ink shadow-hard-sm text-ink'
                : 'bg-bg-primary border-ink text-ink-soft hover:bg-bg-elevated hover:text-ink',
            )}
          >
            {t('cheatsheets.categories.all')}
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              className={clsx(
                'px-3 py-1 text-xs font-mono border-2 whitespace-nowrap transition-colors shrink-0',
                selectedCategory === key
                  ? 'bg-accent-yellow border-ink shadow-hard-sm text-ink'
                  : 'bg-bg-primary border-ink text-ink-soft hover:bg-bg-elevated hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-bg-card border-3 border-ink border-dashed">
            <BookOpen size={48} strokeWidth={1} className="mx-auto mb-4 text-ink-soft opacity-30" />
            <p className="font-mono text-ink-soft">
              {t('explore.no_results')}
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
    </AppShell>
  )
}

function SurfaceTabs({
  surface,
  onSelect,
}: {
  surface: ExploreSurface
  onSelect: (next: ExploreSurface) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="border-b-3 border-ink bg-bg-card px-6 py-3 flex items-center gap-3">
      <div className="flex bg-bg-card border-3 border-ink shadow-hard-sm">
        <SurfaceTabButton
          active={surface === 'cheatsheets'}
          onClick={() => onSelect('cheatsheets')}
          icon={<BookOpen size={14} />}
          label={t('explore.tabs.cheatsheets')}
        />
        <SurfaceTabButton
          active={surface === 'discovery'}
          onClick={() => onSelect('discovery')}
          icon={<Sparkles size={14} />}
          label={t('explore.tabs.discovery')}
        />
      </div>
    </div>
  )
}

function SurfaceTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-display font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-colors
        ${active ? 'bg-accent-yellow text-ink border-x-2 border-ink first:border-l-0 last:border-r-0' : 'bg-bg-card text-ink-soft hover:bg-bg-elevated'}
      `}
    >
      {icon}
      {label}
    </button>
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
  const { t } = useTranslation()
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
          {t('common.official')}
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
        {cheatsheet.description || t('explore.default_description')}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-ink-soft">
          <span className="flex items-center gap-1">
            <Star size={12} /> {cheatsheet.stars_count || 0}
          </span>
          <span>{t('explore.forks_count', { count: cheatsheet.fork_count || 0 })}</span>
        </div>
        <div className="text-[10px] font-mono font-bold uppercase underline group-hover:text-ink transition-colors">
          {t('explore.view_details')}
        </div>
      </div>
    </div>
  )
}
