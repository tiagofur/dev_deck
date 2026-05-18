import { useOrgTrendingTags, useOrgRecommendations } from '@devdeck/api-client'
import { Sparkles, TrendingUp, Zap, Plus, ExternalLink } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useNavigate } from 'react-router-dom'

export function TeamDiscovery({ orgId }: { orgId: string }) {
  const { data: trendingRes, isLoading: loadingTags } = useOrgTrendingTags(orgId)
  const { data: recsRes, isLoading: loadingRecs } = useOrgRecommendations(orgId)

  const tags = trendingRes?.tags || []
  const recs = recsRes?.recommendations || []

  return (
    <div className="w-full max-w-4xl space-y-10">
      {/* Internal Hot Topics */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b-3 border-ink pb-2">
           <TrendingUp size={18} className="text-accent-pink" strokeWidth={3} />
           <h3 className="font-display font-black uppercase text-sm tracking-widest">Hot Topics del Equipo</h3>
        </div>
        
        {loadingTags ? (
          <div className="h-20 animate-pulse bg-bg-card border-2 border-ink border-dashed" />
        ) : (
          <div className="flex flex-wrap gap-3">
             {tags.map(t => (
               <div key={t.tag} className="bg-white border-2 border-ink px-3 py-1.5 shadow-hard-sm flex items-center gap-3 group hover:bg-accent-yellow transition-all cursor-default">
                  <span className="font-mono text-xs font-bold text-ink-soft group-hover:text-ink">#{t.tag}</span>
                  <span className="bg-bg-primary border border-ink px-1.5 py-0.5 text-[9px] font-black">{t.count}</span>
               </div>
             ))}
             {tags.length === 0 && <p className="text-xs text-ink-soft italic font-mono">— sin tendencias recientes —</p>}
          </div>
        )}
      </section>

      {/* Team Recommendations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b-3 border-ink pb-2">
           <Sparkles size={18} className="text-accent-yellow" strokeWidth={3} />
           <h3 className="font-display font-black uppercase text-sm tracking-widest">Sugerencias del Vault</h3>
        </div>

        {loadingRecs ? (
          <div className="space-y-3">
             {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse bg-bg-card border-2 border-ink" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {recs.map(r => (
               <div key={r.url_normalized} className="bg-bg-card border-3 border-ink p-4 shadow-hard flex flex-col justify-between hover:-translate-y-1 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <span className="px-1.5 py-0.5 border-2 border-ink bg-bg-primary text-[8px] font-black uppercase shadow-hard-sm">
                         {r.item_type}
                       </span>
                       <div className="flex items-center gap-1 text-ink-soft">
                          <Zap size={10} className="text-accent-lime" fill="currentColor" />
                          <span className="font-mono text-[9px] font-bold">{r.save_count} saves</span>
                       </div>
                    </div>
                    <h4 className="font-display font-black text-xs uppercase truncate mb-1">{r.title}</h4>
                    <p className="font-mono text-[9px] text-ink-soft truncate mb-3">{r.url_normalized}</p>
                  </div>
                  
                  <div className="flex gap-2">
                     <Button 
                      className="flex-1" 
                      size="sm" 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('devdeck:open-capture', { detail: { url: r.url_normalized, title: r.title } }))
                      }}
                     >
                        <Plus size={12} strokeWidth={4} /> Capturar
                     </Button>
                     <button 
                      onClick={() => window.open(`https://${r.url_normalized}`, '_blank')}
                      className="p-1.5 border-2 border-ink hover:bg-accent-yellow transition-colors"
                     >
                        <ExternalLink size={14} />
                     </button>
                  </div>
               </div>
             ))}
             {recs.length === 0 && (
               <div className="col-span-full py-12 text-center border-3 border-ink border-dashed rounded-xl opacity-60">
                  <p className="font-mono text-sm uppercase font-bold text-ink-soft italic">¡Estás al día con tu equipo!</p>
               </div>
             )}
          </div>
        )}
      </section>
    </div>
  )
}
