import { useOrgInsights } from '@devdeck/api-client'
import { Activity, BarChart3, Users, LayoutGrid } from 'lucide-react'
import { useTranslation } from '@devdeck/i18n'

export function OrgInsights({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const { data: insights, isLoading } = useOrgInsights(orgId)

  if (isLoading) {
    return <div className="p-20 text-center animate-pulse font-mono text-xs text-ink-soft">{t('insights.loading')}</div>
  }

  if (!insights) return null

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div className="bg-bg-primary border-3 border-ink p-4 shadow-hard flex flex-col gap-1">
            <span className="font-display font-black text-[10px] uppercase tracking-widest text-ink/40">{t('insights.total_items')}</span>
            <div className="flex items-end gap-2">
               <span className="font-display font-black text-3xl leading-none">{insights.total_items}</span>
               <LayoutGrid size={20} className="mb-1 text-accent-pink" />
            </div>
         </div>
         <div className="bg-bg-primary border-3 border-ink p-4 shadow-hard flex flex-col gap-1">
            <span className="font-display font-black text-[10px] uppercase tracking-widest text-ink/40">{t('insights.recent_activity')}</span>
            <div className="flex items-end gap-2">
               <span className="font-display font-black text-3xl leading-none">{insights.recent_activity}</span>
               <Activity size={20} className="mb-1 text-accent-lime" />
            </div>
         </div>
      </div>

      {/* Language Heatmap */}
      <div className="bg-bg-card border-3 border-ink p-5 shadow-hard">
         <h4 className="font-display font-black uppercase text-xs tracking-widest flex items-center gap-2 mb-6">
            <BarChart3 size={14} className="text-accent-cyan" />
            {t('insights.team_ecosystem')}
         </h4>
         
         <div className="space-y-4">
            {insights.top_languages.map(ls => (
              <div key={ls.language} className="space-y-1.5">
                 <div className="flex items-center justify-between font-mono text-[10px] font-black uppercase">
                    <span>{ls.language}</span>
                    <span className="text-ink-soft">{Math.round(ls.share * 100)}%</span>
                 </div>
                 <div className="h-3 border-2 border-ink bg-bg-primary relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-accent-yellow border-r-2 border-ink transition-all duration-1000"
                      style={{ width: `${ls.share * 100}%` }}
                    />
                 </div>
              </div>
            ))}
            {insights.top_languages.length === 0 && (
              <p className="text-center py-8 font-mono text-[10px] text-ink-soft italic">{t('insights.no_language_data')}</p>
            )}
         </div>
      </div>

      {/* Top Curators */}
      <div className="bg-bg-card border-3 border-ink p-5 shadow-hard">
         <h4 className="font-display font-black uppercase text-xs tracking-widest flex items-center gap-2 mb-6">
            <Users size={14} className="text-accent-lavender" />
            {t('insights.star_curators')}
         </h4>

         <div className="space-y-3">
            {insights.top_curators.map((cs) => (
              <div key={cs.display_name} className="flex items-center gap-4 bg-bg-primary border-2 border-ink p-2 shadow-hard-sm">
                 <div className="w-8 h-8 rounded-full border-2 border-ink bg-accent-pink overflow-hidden shrink-0">
                    {cs.avatar_url && <img src={cs.avatar_url} alt={cs.display_name} className="w-full h-full object-cover" />}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="font-display font-black text-[10px] uppercase truncate">{cs.display_name}</p>
                 </div>
                 <div className="text-right">
                    <span className="font-mono text-xs font-bold">{cs.item_count}</span>
                    <span className="font-mono text-[8px] uppercase text-ink-soft ml-1">items</span>
                 </div>
              </div>
            ))}
            {insights.top_curators.length === 0 && (
              <p className="text-center py-8 font-mono text-[10px] text-ink-soft italic">{t('insights.no_curation_activity')}</p>
            )}
         </div>
      </div>
    </div>
  )
}
