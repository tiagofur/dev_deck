import clsx from 'clsx'
import { 
  X, 
  Boxes, 
  Folder, 
  BookOpen, 
  Library, 
  Wrench, 
  Share2, 
  Users, 
  Activity, 
  Settings as SettingsIcon, 
  User, 
  Shield 
} from 'lucide-react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { usePreferences, useMe, useFeatureFlags } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import { UserAvatar } from './UserAvatar'

interface NavSidebarProps {
  isOpen: boolean
  onClose: () => void
  reviewCount?: number
}

export function NavSidebar({ isOpen, onClose, reviewCount }: NavSidebarProps) {
  const { t } = useTranslation()
  const features = useFeatureFlags()
  const navigate = useNavigate()
  const location = useLocation()
  const { activeOrgId } = usePreferences()
  const { data: user } = useMe()

  const isActive = (path: string) => {
    if (path === '/repos') {
      return location.pathname === '/repos' || location.pathname.startsWith('/repo/')
    }
    if (path === '/items') {
      return location.pathname === '/items' || location.pathname.startsWith('/items/')
    }
    if (path === '/cheatsheets') {
      return location.pathname === '/cheatsheets' || location.pathname.startsWith('/cheatsheets/')
    }
    if (path === '/circles') {
      return location.pathname === '/circles' || location.pathname.startsWith('/circles/')
    }
    return location.pathname === path
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Header Logo */}
      <div className="p-4 border-b-3 border-ink flex items-center justify-between shrink-0">
        <h1
          aria-label="DevDeck"
          className="cursor-pointer font-display text-2xl font-black uppercase tracking-tight"
          onClick={() => {
            navigate('/items')
            onClose()
          }}
        >
          Dev<span className="border-2 border-ink bg-accent-pink px-1.5 ml-1 select-none">Deck</span>
        </h1>
        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1 border-2 border-ink bg-bg-card hover:bg-accent-pink/20 transition-colors"
          aria-label={t('nav.close_menu')}
        >
          <X size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Nav Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Vault Section */}
        <Section title={t('nav.vault')}>
          <NavItem
            to="/items"
            icon={Boxes}
            label={t('nav.items')}
            active={isActive('/items')}
            onClick={onClose}
          />
          <NavItem
            to="/repos"
            icon={Folder}
            label={t('nav.repos')}
            active={isActive('/repos')}
            onClick={onClose}
          />
          <NavItem
            to="/cheatsheets"
            icon={BookOpen}
            label={t('nav.cheatsheets')}
            active={isActive('/cheatsheets')}
            onClick={onClose}
          />
          <NavItem
            to="/runbooks"
            icon={Library}
            label={t('nav.runbooks')}
            active={isActive('/runbooks')}
            onClick={onClose}
          />
        </Section>

        {/* Tools Section */}
        <Section title={t('nav.tools')}>
          <NavItem
            to="/workbench"
            icon={Wrench}
            label={t('nav.workbench')}
            active={isActive('/workbench')}
            onClick={onClose}
          />
        </Section>

        {/* Social Section */}
        <Section title={t('nav.social')}>
          <NavItem
            to="/circles"
            icon={Share2}
            label={t('nav.circles')}
            active={isActive('/circles')}
            onClick={onClose}
          />
          <NavItem
            to="/following"
            icon={Users}
            label={t('nav.following')}
            active={isActive('/following')}
            onClick={onClose}
          />
        </Section>

        {/* Team Section (Progressive Disclosure) */}
        {!!activeOrgId && (
          <Section title={t('nav.team')}>
            <NavItem
              to="/feed"
              icon={Activity}
              label={t('nav.feed')}
              active={isActive('/feed')}
              onClick={onClose}
            />
            {features.team_review && (
              <NavItem
                to="/review"
                icon={Users}
                label={t('nav.review')}
                active={isActive('/review')}
                badge={reviewCount}
                onClick={onClose}
              />
            )}
          </Section>
        )}

        {/* System Section */}
        <Section title={t('nav.system')}>
          <NavItem
            to="/settings"
            icon={SettingsIcon}
            label={t('nav.settings')}
            active={isActive('/settings')}
            onClick={onClose}
          />
          <NavItem
            to="/profile"
            icon={User}
            label={t('nav.profile')}
            active={isActive('/profile')}
            onClick={onClose}
          />
          {user?.role === 'admin' && (
            <NavItem
              to="/admin"
              icon={Shield}
              label={t('nav.admin')}
              active={isActive('/admin')}
              onClick={onClose}
            />
          )}
        </Section>
      </div>

      {/* Footer Info / User display */}
      {user && (
        <div className="p-4 border-t-3 border-ink bg-bg-elevated flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 shrink-0 overflow-hidden border-2 border-ink shadow-hard-sm">
            <UserAvatar
              src={user.avatar_url}
              alt={user.display_name || user.username || 'Avatar'}
              iconSize={18}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-black text-xs uppercase tracking-tight truncate">
              {user.display_name || user.username}
            </p>
            <p className="font-mono text-[9px] text-ink-soft truncate">
              {user.login}
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        data-testid="desktop-sidebar"
        className="hidden lg:block w-64 border-r-3 border-ink bg-bg-card shrink-0 h-screen sticky top-0 overflow-hidden"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div
        data-testid="mobile-drawer"
        className={clsx('lg:hidden fixed inset-0 z-45', isOpen ? 'visible' : 'invisible')}
      >
        {/* Backdrop */}
        <div
          className={clsx(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />
        {/* Drawer Panel */}
        <aside
          className={clsx(
            'absolute inset-y-0 left-0 w-64 border-r-3 border-ink bg-bg-card transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="px-2 font-display font-black text-[10px] uppercase tracking-widest text-ink-soft mb-1 select-none">
        {title}
      </h3>
      {children}
    </div>
  )
}

interface NavItemProps {
  to: string
  icon: typeof Boxes
  label: string
  active: boolean
  badge?: number
  onClick?: () => void
}

function NavItem({ to, icon: Icon, label, active, badge, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between px-3 py-2 border-2 border-transparent font-mono text-sm uppercase tracking-tight transition-all duration-100',
        active
          ? 'bg-accent-lime border-ink shadow-hard-sm translate-x-[-2px] translate-y-[-2px] font-bold'
          : 'hover:bg-accent-yellow/40 hover:border-ink/20 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-xs'
      )}
    >
      <span className="flex items-center gap-2.5">
        <Icon size={16} strokeWidth={active ? 3.5 : 2.5} className="shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {!!badge && badge > 0 && (
        <span className="border-2 border-ink bg-accent-yellow px-1 text-[9px] leading-none font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
