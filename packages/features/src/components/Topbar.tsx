import { Activity, BookOpen, Boxes, ChevronDown, Menu, Plus, Search, Settings as SettingsIcon, Share2, Sparkles, Users, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'
import { usePreferences, useMe } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { NotificationCenter } from './NotificationCenter'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  onAdd: () => void
  onDiscovery: () => void
  onSettings: () => void
  onGlobalSearch: () => void
  reviewCount?: number
}

type NavItem = {
  key: string
  label: string
  title: string
  icon: typeof Boxes
  to?: string
  onClick?: () => void
  variant?: 'secondary' | 'accent'
  badge?: number
}

export function Topbar({
  query,
  onQueryChange,
  onAdd,
  onDiscovery,
  onSettings,
  onGlobalSearch,
  reviewCount,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrgId } = usePreferences()
  const { data: user } = useMe()
  const [menuOpen, setMenuOpen] = useState(false)

  const primaryNav: NavItem[] = [
    { key: 'items', label: 'Items', title: t('topbar.items_tooltip'), icon: Boxes, to: '/items' },
    { key: 'workbench', label: 'Workbench', title: 'Developer Workbench', icon: Wrench, to: '/workbench' },
  ]

  const secondaryNav: NavItem[] = [
    { key: 'cheats', label: 'Cheats', title: t('topbar.cheats_tooltip'), icon: BookOpen, to: '/cheatsheets' },
    {
      key: 'review',
      label: 'Review',
      title: t('topbar.review_tooltip'),
      icon: Users,
      to: '/review',
      badge: reviewCount,
    },
    ...(activeOrgId
      ? [{ key: 'activity', label: 'Activity', title: t('topbar.activity_tooltip'), icon: Activity, to: '/feed' }]
      : []),
    { key: 'network', label: 'Network', title: t('topbar.network_tooltip'), icon: Users, to: '/following' },
    { key: 'circles', label: 'Circles', title: t('topbar.circles_tooltip'), icon: Share2, to: '/circles' },
  ]

  function activate(item: NavItem) {
    setMenuOpen(false)
    if (item.to) navigate(item.to)
    item.onClick?.()
  }

  return (
    <header className="relative z-30 border-b-3 border-ink bg-bg-card px-3 py-3 sm:px-4 lg:px-6">
      <div className="grid min-w-0 gap-3 2xl:grid-cols-[auto_minmax(18rem,1fr)_auto] 2xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 shrink-0">
            <WorkspaceSwitcher />
          </div>
          <h1
            aria-label="DevDeck"
            className="shrink-0 cursor-pointer whitespace-nowrap font-display text-xl font-black uppercase tracking-tight sm:text-2xl"
            onClick={() => navigate('/')}
          >
            Dev<span className="border-2 border-ink bg-accent-pink px-1.5">Deck</span>
          </h1>
        </div>

        <div className="relative min-w-0 2xl:max-w-xl">
          <Search
            size={18}
            strokeWidth={2.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            id="topbar-search"
            type="search"
            placeholder={t('topbar.search_placeholder')}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full min-w-0 border-3 border-ink py-2 pl-10 pr-3 font-mono text-sm focus:bg-accent-yellow/20 focus:outline-none"
          />
        </div>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 2xl:justify-end 2xl:overflow-visible 2xl:pb-0">
          <SyncStatusIndicator />
          <NotificationCenter />
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings"
            title="Settings"
            className="shrink-0 border-3 border-ink bg-bg-card p-2 shadow-hard transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
          >
            <SettingsIcon size={16} strokeWidth={3} />
          </button>

          {user && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label={t('topbar.profile_tooltip')}
              title={t('topbar.profile_tooltip')}
              className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center overflow-hidden border-3 border-ink bg-bg-card shadow-hard transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
            >
              <img
                src={user.avatar_url}
                alt={user.display_name || user.username || 'Avatar'}
                className="h-full w-full object-cover"
              />
            </button>
          )}
        </div>
      </div>

      <nav aria-label="Primary navigation" className="mt-3 min-w-0 overflow-x-auto pb-1">
        <div className="flex w-max items-center gap-2">
          <TopbarAction
            label="Search"
            title={t('topbar.search_tooltip')}
            icon={Search}
            onClick={onGlobalSearch}
            variant="ghost"
            className="hidden sm:inline-flex"
          />
          {primaryNav.map(({ key, ...item }) => (
            <TopbarAction key={key} {...item} onClick={() => activate({ key, ...item })} />
          ))}
          <TopbarAction
            label="Discover"
            title={t('topbar.discover_tooltip')}
            icon={Sparkles}
            onClick={onDiscovery}
            variant="accent"
          />
          <TopbarAction label={t('topbar.capture_button')} icon={Plus} onClick={onAdd} />
          <div className="hidden items-center gap-2 min-[1800px]:flex">
            {secondaryNav.map((item) => (
              <TopbarAction
                key={item.key}
                label={item.label}
                title={item.title}
                icon={item.icon}
                badge={item.badge}
                onClick={() => activate(item)}
              />
            ))}
          </div>
          {secondaryNav.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="whitespace-nowrap min-[1800px]:hidden"
              aria-expanded={menuOpen}
              aria-controls="topbar-more-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="flex items-center gap-2">
                <Menu size={16} strokeWidth={3} />
                More
                <ChevronDown
                  size={14}
                  strokeWidth={3}
                  className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </Button>
          )}
        </div>
      </nav>

      {menuOpen && secondaryNav.length > 0 && (
        <nav
          id="topbar-more-menu"
          aria-label="More navigation"
          className="absolute left-3 right-3 top-[calc(100%-0.25rem)] grid gap-2 border-3 border-ink bg-bg-card p-3 shadow-hard sm:left-auto sm:right-6 sm:w-80 min-[1800px]:hidden"
        >
          {secondaryNav.map((item) => (
            <TopbarAction
              key={item.key}
              label={item.label}
              title={item.title}
              icon={item.icon}
              badge={item.badge}
              onClick={() => activate(item)}
              className="w-full justify-start"
            />
          ))}
        </nav>
      )}
    </header>
  )
}

function TopbarAction({
  label,
  title,
  icon: Icon,
  onClick,
  variant = 'secondary',
  badge,
  className = '',
}: {
  label: string
  title?: string
  icon: typeof Boxes
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost'
  badge?: number
  className?: string
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      size="sm"
      variant={variant}
      className={`whitespace-nowrap ${className}`}
      title={title}
    >
      <span className="flex items-center gap-2">
        <Icon size={16} strokeWidth={3} />
        <span>{label}</span>
        {!!badge && badge > 0 && (
          <span className="border-2 border-ink bg-accent-yellow px-1.5 py-0.5 text-[10px] leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
    </Button>
  )
}
