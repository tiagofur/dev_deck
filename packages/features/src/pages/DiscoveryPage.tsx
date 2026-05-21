import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Sparkles, Flame, Trophy, Layers, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'
import { SwipeCard, type SwipeDirection } from '../components/Discovery/SwipeCard'
import { TrendingFeed } from '../components/Discovery/TrendingFeed'
import { CuratorLeaderboard } from '../components/Discovery/CuratorLeaderboard'
import { TeamDiscovery } from '../components/Discovery/TeamDiscovery'
import {
  useDiscoveryNext,
  useMarkSeen,
  useUpdateRepo,
  usePreferences,
} from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

type Tab = 'swipe' | 'trending' | 'leaderboard' | 'team'

export function DiscoveryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrgId } = usePreferences()
  const [activeTab, setActiveTab] = useState<Tab>(activeOrgId ? 'team' : 'swipe')
  const { data: repo, isLoading, error, refetch } = useDiscoveryNext()
  const markSeen = useMarkSeen()
  const updateRepo = useUpdateRepo()

  async function handleSwipe(dir: SwipeDirection) {
    if (!repo) return
    try {
      switch (dir) {
        case 'right':
          await markSeen.mutateAsync(repo.id)
          showToast(t('discovery.marked_seen'))
          break
        case 'left':
          await updateRepo.mutateAsync({
            id: repo.id,
            input: { archived: true },
          })
          showToast(t('discovery.archived_toast'))
          break
        case 'up':
          window.open(repo.url, '_blank', 'noopener,noreferrer')
          await markSeen.mutateAsync(repo.id)
          showToast(t('discovery.opened_in_browser'))
          break
      }
      void refetch()
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={22} strokeWidth={3} className="text-accent-yellow" />
            {t('discovery.title')}
          </h1>
        </div>

        <div className="flex bg-bg-card border-3 border-ink shadow-hard-sm">
           <TabButton active={activeTab === 'swipe'} onClick={() => setActiveTab('swipe')} icon={<Layers size={14} />} label={t('discovery.tabs.review')} />
           <TabButton active={activeTab === 'trending'} onClick={() => setActiveTab('trending')} icon={<Flame size={14} />} label={t('discovery.tabs.trending')} />
           {activeOrgId && (
             <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<Users size={14} />} label={t('discovery.tabs.team')} />
           )}
           <TabButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={14} />} label={t('discovery.tabs.top')} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 sm:p-12 overflow-y-auto">
        {activeTab === 'swipe' && (
          <div className="w-full flex-1 flex items-center justify-center">
            {isLoading && <p className="font-mono text-ink-soft">{t('discovery.searching_for_you')}</p>}
            
            {!isLoading && !repo && (
              <div className="text-center max-w-md">
                <div className="text-7xl mb-6">🎉</div>
                <h2 className="font-display font-black text-4xl uppercase mb-3">{t('discovery.all_done')}</h2>
                <p className="font-mono text-ink mb-8 text-sm uppercase font-bold opacity-60">{t('discovery.reviewed_all')}</p>
                <Button variant="secondary" onClick={() => setActiveTab('trending')}>{t('discovery.explore_trending')}</Button>
              </div>
            )}

            {repo && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={repo.id}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full flex justify-center"
                >
                  <SwipeCard repo={repo} onSwipe={handleSwipe} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {activeTab === 'trending' && <TrendingFeed />}
        {activeTab === 'leaderboard' && <CuratorLeaderboard />}
        {activeTab === 'team' && activeOrgId && <TeamDiscovery orgId={activeOrgId} />}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
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
