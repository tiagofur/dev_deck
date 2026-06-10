import React, { useState } from 'react'
import {
  ArrowLeft,
  User as UserIcon,
  Globe,
  MapPin,
  Github,
  Edit3,
  Calendar,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import {
  useMe,
  useDecks,
  useItems,
  useStats,
  useFeatureFlags,
  logoutCurrentSession
} from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

// Import modular presentational components
import { EditProfileModal } from '../components/Profile/EditProfileModal'
import { ReputationDashboard } from '../components/Profile/ReputationDashboard'
import { calculateReputation, buildAchievements } from '../components/Profile/reputation'
import { TechStackSection } from '../components/Profile/TechStackSection'
import { ActivityTimeline } from '../components/Profile/ActivityTimeline'
import { UserAvatar } from '../components/UserAvatar'

export function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user, isLoading: loadingUser } = useMe()
  const { data: decks = [], isLoading: loadingDecks } = useDecks()
  const { data: itemsRes } = useItems({ limit: 10 })
  const { data: stats } = useStats()
  const features = useFeatureFlags()

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logoutCurrentSession()
      showToast(t('common.logout_msg'))
      navigate('/login')
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }

  if (loadingUser) {
    return (
      <AppShell contentClassName="flex-1 overflow-y-auto">
        <div className="min-h-full bg-bg-primary p-8 flex items-center justify-center">
          <div className="font-mono text-sm animate-pulse text-ink-soft">{t('profile.edit_loading_msg')}</div>
        </div>
      </AppShell>
    )
  }

  if (!user) {
    return (
      <AppShell contentClassName="flex-1 overflow-y-auto">
        <div className="min-h-full bg-bg-primary p-8 flex flex-col items-center justify-center gap-4">
          <p className="font-display font-black text-2xl uppercase">{t('profile.login_required')}</p>
          <Button onClick={() => navigate('/login')}>{t('profile.login_button')}</Button>
        </div>
      </AppShell>
    )
  }

  const totalItemsCount = itemsRes?.total || 0
  const reputationInputs = {
    totalItems: totalItemsCount,
    decksCount: decks.length,
    streakDays: stats?.streak_days || 0
  }
  const reputation = calculateReputation(reputationInputs)
  const achievements = buildAchievements(reputationInputs, t)

  const recentItems = itemsRes?.items || []

  return (
    <AppShell contentClassName="flex-1 overflow-y-auto">
      <div className="min-h-full bg-bg-primary pb-20">
        {/* Topbar back action */}
        <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="border-3 border-ink p-2 bg-bg-card shadow-hard
                         hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                         active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                         transition-all duration-150 cursor-pointer"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={20} strokeWidth={3} />
            </button>
            <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
              <UserIcon size={22} strokeWidth={3} />
              {t('profile.title')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsModalOpen(true)} variant="accent" className="flex items-center gap-2">
              <Edit3 size={16} strokeWidth={3} />
              {t('profile.edit_profile')}
            </Button>
            <Button onClick={handleLogout} variant="secondary" className="flex items-center gap-2">
              <LogOut size={16} strokeWidth={3} />
              {t('settings.logout_button')}
            </Button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* LEFT COLUMN: Hero profile */}
          <div className="lg:col-span-1 space-y-8">
            <section className="bg-bg-card border-3 border-ink p-6 shadow-hard flex flex-col items-center text-center relative group">
              <div
                onClick={() => setIsModalOpen(true)}
                className="w-28 h-28 border-4 border-ink shadow-hard overflow-hidden bg-accent-yellow rounded-none shrink-0 relative cursor-pointer group-hover:scale-105 transition-transform"
              >
                <UserAvatar
                  src={user.avatar_url}
                  alt={user.display_name || user.username || user.login || 'Avatar'}
                  imageClassName="w-full h-full object-cover"
                  fallbackClassName="w-full h-full flex items-center justify-center bg-accent-yellow text-ink"
                  iconSize={48}
                />
                <div className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Edit3 className="text-white" size={24} />
                </div>
              </div>

              <h2 className="font-display font-black text-2xl uppercase tracking-tight mt-6 leading-none">
                {user.display_name}
              </h2>
              <p className="font-mono text-xs text-ink-soft mt-1">
                @{user.username || user.login}
              </p>

              <p className="font-mono text-[10px] text-ink-soft mt-4 flex items-center gap-1.5 justify-center">
                <Calendar size={12} />
                {t('profile.member_since', { date: new Date(user.created_at).toLocaleDateString() })}
              </p>

              {user.bio ? (
                <p className="text-sm italic text-ink-soft border-t-2 border-dashed border-ink/20 mt-6 pt-4 w-full px-2 leading-relaxed">
                  "{user.bio}"
                </p>
              ) : (
                <p className="text-xs text-ink-soft/60 italic border-t-2 border-dashed border-ink/20 mt-6 pt-4 w-full px-2">
                  {t('profile.no_bio_yet')}
                </p>
              )}

              {/* Social / Contact Links */}
              <div className="flex justify-center gap-4 mt-6 pt-4 border-t-3 border-ink w-full">
                {user.github_url ? (
                  <a
                    href={user.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="border-2 border-ink bg-bg-card p-2 shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all text-ink hover:text-accent-pink"
                    title={t('profile.github_tooltip')}
                  >
                    <Github size={16} strokeWidth={3} />
                  </a>
                ) : (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="border-2 border-ink border-dashed p-2 text-ink-soft/40 hover:text-ink hover:border-ink transition-all"
                    title={t('profile.github_link')}
                  >
                    <Github size={16} strokeWidth={2} />
                  </button>
                )}

                {user.website ? (
                  <a
                    href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="border-2 border-ink bg-bg-card p-2 shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all text-ink hover:text-accent-cyan"
                    title={t('profile.website_tooltip')}
                  >
                    <Globe size={16} strokeWidth={3} />
                  </a>
                ) : (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="border-2 border-ink border-dashed p-2 text-ink-soft/40 hover:text-ink hover:border-ink transition-all"
                    title={t('profile.website_link')}
                  >
                    <Globe size={16} strokeWidth={2} />
                  </button>
                )}

                {user.location ? (
                  <span
                    className="border-2 border-ink bg-bg-card p-2 shadow-hard-sm text-ink flex items-center gap-1.5 text-xs font-mono font-bold"
                    title={t('profile.location_tooltip', { location: user.location })}
                  >
                    <MapPin size={16} strokeWidth={3} className="text-accent-lime" />
                    <span className="max-w-[80px] truncate">{user.location}</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="border-2 border-ink border-dashed p-2 text-ink-soft/40 hover:text-ink hover:border-ink transition-all"
                    title={t('profile.location_link')}
                  >
                    <MapPin size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Stats, Tech Stack, Decks, Timeline */}
          <div className="lg:col-span-2 space-y-8">
            {features.reputation && (
              <ReputationDashboard
                totalItems={totalItemsCount}
                decksCount={decks.length}
                streakDays={stats?.streak_days || 0}
                reputation={reputation}
                achievements={achievements}
              />
            )}

            <TechStackSection
              stackTags={user.stack_tags}
              onOpenEdit={() => setIsModalOpen(true)}
            />

            {/* Decks Grid */}
            <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
                  <UserIcon size={20} strokeWidth={3} className="text-accent-pink" />
                  {t('profile.my_decks')}
                </h3>
                <Button onClick={() => navigate('/cheatsheets')} size="sm" variant="secondary">
                  {t('profile.view_all')}
                </Button>
              </div>

              {loadingDecks ? (
                <div className="font-mono text-xs text-ink-soft animate-pulse">{t('profile.decks_loading')}</div>
              ) : decks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {decks.slice(0, 4).map((deck) => (
                    <button
                      key={deck.id}
                      onClick={() => navigate(`/cheatsheets/${deck.id}`)}
                      className="bg-bg-primary border-2 border-ink p-4 shadow-hard text-left group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-display font-black text-md uppercase group-hover:text-accent-pink transition-colors truncate">
                          {deck.title}
                        </h4>
                        {deck.is_public ? (
                          <span className="border border-ink bg-accent-lime text-[8px] font-mono font-black uppercase px-1.5 py-0.5 flex items-center gap-0.5">
                            <Eye size={8} /> {t('profile.public')}
                          </span>
                        ) : (
                          <span className="border border-ink bg-accent-lavender text-[8px] font-mono font-black uppercase px-1.5 py-0.5 flex items-center gap-0.5">
                            <EyeOff size={8} /> {t('profile.private')}
                          </span>
                        )}
                      </div>
                      {deck.description && (
                        <p className="text-xs text-ink-soft mb-4 line-clamp-2">{deck.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-2 border-t border-ink/10">
                        <span className="text-[9px] font-mono uppercase bg-accent-yellow border border-ink px-1.5 py-0.5">
                          {t('items.items_count', { count: deck.item_count || 0 })}
                        </span>
                        <span className="text-[10px] font-mono font-bold group-hover:underline">
                          {t('profile.view_deck_arrow')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-ink border-dashed p-10 text-center rounded-none">
                  <p className="font-mono text-xs text-ink-soft">{t('profile.no_decks_yet')}</p>
                  <p className="font-mono text-[10px] text-ink-soft/60 mt-1">{t('profile.decks_desc')}</p>
                  <Button onClick={() => navigate('/cheatsheets')} className="mt-4" size="sm">
                    {t('profile.create_first_deck')}
                  </Button>
                </div>
              )}
            </section>

            <ActivityTimeline
              items={recentItems}
              onNavigate={(path) => navigate(path)}
            />
          </div>
        </main>

        {/* Modularized Edit Profile Modal */}
        <EditProfileModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={user}
        />
      </div>
    </AppShell>
  )
}
