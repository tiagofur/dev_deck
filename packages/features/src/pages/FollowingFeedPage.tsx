import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  Sparkles, 
  User as UserIcon,
  Search
} from 'lucide-react'
import { useFollowingFeed, type FeedEvent } from '@devdeck/api-client'
import { Button } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { AppShell } from '../components/AppShell'

export function FollowingFeedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useFollowingFeed()
  const events = data?.events || []

  return (
    <AppShell contentClassName="flex-1 overflow-y-auto">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
          <Users size={24} strokeWidth={3} className="text-accent-lavender" />
          {t('feed.title')}
        </h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="bg-accent-yellow/10 border-3 border-ink p-4 mb-8">
           <p className="font-mono text-xs font-bold uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-accent-yellow" />
              {t('feed.seeing_captures')}
           </p>
        </div>

        {isLoading ? (
          <div className="p-20 text-center animate-pulse font-mono text-sm text-ink-soft">
            {t('feed.exploring')}
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-6">
            {events.map((e: FeedEvent) => (
              <div key={e.item.id} className="bg-bg-card border-3 border-ink p-5 shadow-hard flex gap-5 group hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 rounded-full border-3 border-ink bg-white p-1 overflow-hidden shrink-0 shadow-hard-sm cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={e.curator_name}
                  onClick={() => navigate(`/u/${e.curator_name}`)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault()
                      navigate(`/u/${e.curator_name}`)
                    }
                  }}
                >
                  {e.curator_avatar_url ? (
                    <img src={e.curator_avatar_url} alt={e.curator_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-primary">
                      <UserIcon size={20} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-2">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/u/${e.curator_name}`)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault()
                            navigate(`/u/${e.curator_name}`)
                          }
                        }}
                        className="font-display font-black text-[10px] uppercase tracking-wider text-accent-pink hover:underline cursor-pointer"
                      >
                        @{e.curator_name}
                      </span>
                      <span className="font-mono text-[9px] text-ink-soft">
                        {new Date(e.item.created_at).toLocaleDateString()}
                      </span>
                   </div>

                   <h3 className="font-display font-black text-lg uppercase truncate mb-1">
                     {e.item.title}
                   </h3>
                   <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
                     {e.item.description || t('common.no_description')}
                   </p>

                   <div className="mt-4 flex items-center justify-between pt-3 border-t-2 border-ink/5">
                      <div className="flex flex-wrap gap-2">
                         {e.item.tags.slice(0, 3).map(tag => (
                           <span key={tag} className="px-1.5 py-0.5 bg-bg-primary border-2 border-ink text-[8px] font-mono font-bold uppercase">
                             {tag}
                           </span>
                         ))}
                      </div>
                      <Button size="sm" onClick={() => navigate(`/repo/${e.item.id}`)}>
                        {t('feed.view_more')}
                      </Button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center border-3 border-ink border-dashed rounded-xl space-y-4">
             <Search size={48} className="mx-auto text-accent-pink" strokeWidth={3} />
             <p className="font-mono text-sm text-ink-soft uppercase font-bold">{t('feed.no_activity')}</p>
             <p className="text-xs text-ink-soft italic">{t('feed.follow_hint')}</p>
             <Button variant="secondary" onClick={() => navigate('/discovery')}>{t('feed.explore_curators')}</Button>
          </div>
        )}
      </main>
    </AppShell>
  )
}
