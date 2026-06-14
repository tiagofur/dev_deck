import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  Sparkles, 
  PlusCircle, 
  Edit3, 
  Library, 
  LayoutGrid, 
  User as UserIcon
} from 'lucide-react'
import { useOrgFeed, usePreferences, type ActivityEntry } from '@devdeck/api-client'
import { useTranslation, type TFunction } from '@devdeck/i18n'
import { AppShell } from '../components/AppShell'
import { OrgRequiredEmptyState } from '../components/OrgRequiredEmptyState'

export function TeamFeedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrgId } = usePreferences()
  const { data, isLoading } = useOrgFeed(activeOrgId)
  const events = data?.events || []

  if (!activeOrgId) {
    return <OrgRequiredEmptyState description={t('feed.only_org_desc')} />
  }

  return (
    <AppShell contentClassName="flex-1 overflow-y-auto">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
          <Activity size={24} strokeWidth={3} className="text-accent-pink" />
          {t('feed.team_title')}
        </h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        {isLoading ? (
          <div className="p-20 text-center animate-pulse font-mono text-sm text-ink-soft">
            {t('feed.connecting')}
          </div>
        ) : events.length > 0 ? (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-1 bg-ink/10" />
            
            <div className="space-y-8 relative">
              {events.map((e: ActivityEntry) => (
                <div key={e.id} className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-full border-3 border-ink bg-bg-card shadow-hard-sm overflow-hidden shrink-0 z-10 flex items-center justify-center bg-accent-yellow">
                    {e.user_avatar_url ? (
                      <img src={e.user_avatar_url} alt={e.user_display_name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={20} strokeWidth={3} />
                    )}
                  </div>
                  
                  <div className="flex-1 pt-1">
                    <div className="bg-bg-card border-3 border-ink p-4 shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
                       <div className="flex items-center justify-between mb-2">
                          <p className="font-display font-bold text-xs uppercase tracking-tight">
                            {e.user_display_name}
                          </p>
                          <span className="font-mono text-[9px] text-ink-soft uppercase font-bold">
                            {new Date(e.created_at).toLocaleString()}
                          </span>
                       </div>
                       
                       <p className="text-sm flex items-center gap-2 flex-wrap">
                          <ActivityIcon action={e.action} />
                          {formatAction(e.action, t)}
                          <button 
                            onClick={() => navigate(`/items/${e.entity_id}`)}
                            className="font-black uppercase text-accent-pink hover:underline"
                          >
                            {(typeof e.metadata?.title === 'string' ? e.metadata.title : '') || t('feed.this_item')}
                          </button>
                       </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-20 text-center border-3 border-ink border-dashed rounded-xl space-y-4">
             <Sparkles size={48} className="mx-auto text-accent-yellow" strokeWidth={3} />
             <p className="font-mono text-sm text-ink-soft uppercase font-bold">{t('feed.no_team_activity')}</p>
             <p className="text-xs text-ink-soft italic">{t('feed.start_saving_hint')}</p>
          </div>
        )}
      </main>
    </AppShell>
  )
}

function ActivityIcon({ action }: { action: string }) {
  if (action.includes('created')) return <PlusCircle size={14} className="text-accent-lime" strokeWidth={3} />
  if (action.includes('notes')) return <Edit3 size={14} className="text-accent-lavender" strokeWidth={3} />
  if (action.includes('tags')) return <LayoutGrid size={14} className="text-accent-cyan" strokeWidth={3} />
  if (action.includes('runbook')) return <Library size={14} className="text-accent-orange" strokeWidth={3} />
  return <Sparkles size={14} className="text-accent-yellow" strokeWidth={3} />
}

function formatAction(action: string, t: TFunction) {
  switch (action) {
    case 'item.created': return t('feed.actions.item_created')
    case 'item.updated_notes': return t('feed.actions.item_updated_notes')
    case 'item.updated_tags': return t('feed.actions.item_updated_tags')
    case 'runbook.created': return t('feed.actions.runbook_created')
    case 'deck.created': return t('feed.actions.deck_created')
    default: return t('feed.actions.updated')
  }
}
