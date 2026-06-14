import { Menu, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMe } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { NotificationCenter } from './NotificationCenter'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { UserAvatar } from './UserAvatar'

interface TopbarProps {
  query: string
  onQueryChange: (q: string) => void
  onAdd: () => void
  onGlobalSearch: () => void
  onMenuToggle: () => void // Triggers mobile navigation drawer
  reviewCount?: number
}


export function Topbar({
  query,
  onQueryChange,
  onAdd,
  onGlobalSearch,
  onMenuToggle,
}: TopbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user } = useMe()

  return (
    <header className="relative z-30 border-b-3 border-ink bg-bg-card px-3 py-2.5 sm:px-4 shrink-0">
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Mobile Menu Toggle, Workspace Switcher, Responsive Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 border-3 border-ink bg-bg-card shadow-hard transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
            aria-label="Open navigation menu"
          >
            <Menu size={18} strokeWidth={3} />
          </button>

          <div className="shrink-0">
            <WorkspaceSwitcher />
          </div>

          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- heading doubles as a clickable logo; primary navigation is provided elsewhere */}
          <h1
            aria-label="DevDeck"
            className="lg:hidden shrink-0 cursor-pointer whitespace-nowrap font-display text-lg font-black uppercase tracking-tight sm:text-xl"
            onClick={() => navigate('/items')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate('/items')
              }
            }}
          >
            Dev<span className="border-2 border-ink bg-accent-pink px-1 ml-1 select-none">Deck</span>
          </h1>
        </div>

        {/* Center: Global Search Input (Visible on desktop/tablet) */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search
            size={16}
            strokeWidth={3}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            id="topbar-search"
            type="search"
            placeholder={t('topbar.search_placeholder')}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full min-w-0 border-3 border-ink bg-bg-primary py-1.5 pl-9 pr-3 font-mono text-xs sm:text-sm focus:bg-accent-yellow/20 focus:outline-none"
          />
        </div>

        {/* Right Side: Search Icon (mobile), Quick Add, Sync, Notifications, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Button (reveals input modal) */}
          <button
            type="button"
            onClick={onGlobalSearch}
            className="md:hidden border-3 border-ink bg-bg-card p-2 shadow-hard transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
            aria-label="Global Search"
            title={t('topbar.search_tooltip')}
          >
            <Search size={16} strokeWidth={3} />
          </button>

          {/* Quick Capture '+' Button */}
          <button
            type="button"
            onClick={onAdd}
            className="border-3 border-ink bg-accent-pink p-2 shadow-hard transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
            aria-label="Capture"
            title={t('topbar.capture_button')}
          >
            <Plus size={16} strokeWidth={3} />
          </button>

          <SyncStatusIndicator />
          <NotificationCenter />

          {user && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label={t('topbar.profile_tooltip')}
              title={t('topbar.profile_tooltip')}
              className="flex h-[36px] w-[36px] sm:h-[38px] sm:w-[38px] shrink-0 cursor-pointer items-center justify-center overflow-hidden border-3 border-ink bg-bg-card shadow-hard transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
            >
              <UserAvatar
                src={user.avatar_url}
                alt={user.display_name || user.username || 'Avatar'}
                iconSize={18}
              />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
