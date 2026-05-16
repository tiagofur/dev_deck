import { TrendingUp, Award, User, Flame } from 'lucide-react'
import { useTrendingTools, type TrendingItem } from '@devdeck/api-client'
import { Button } from '@devdeck/ui'

export function TrendingFeed() {
  const { data, isLoading } = useTrendingTools()
  const items = data?.items || []

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="bg-accent-yellow border-3 border-ink p-4 shadow-hard">
         <p className="font-mono text-xs font-bold uppercase flex items-center gap-2">
            <Flame size={14} fill="currentColor" />
            Trending esta semana
         </p>
         <p className="text-[10px] uppercase font-black opacity-60 mt-1">Las herramientas más guardadas globalmente</p>
      </div>

      {isLoading ? (
        <div className="p-20 text-center animate-pulse font-mono text-sm text-ink-soft">
          Calculando tendencias globales…
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
           {items.map((item, idx) => (
             <div key={item.url_normalized} className="bg-bg-card border-3 border-ink p-5 shadow-hard flex items-center gap-6 group hover:-translate-x-1 hover:-translate-y-1 transition-all">
                <div className="w-10 h-10 flex items-center justify-center border-3 border-ink bg-bg-primary font-display font-black text-xl shadow-hard-sm">
                   {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                   <h4 className="font-display font-black text-base uppercase truncate group-hover:text-accent-pink transition-colors">
                     {item.title}
                   </h4>
                   <p className="font-mono text-[9px] text-ink-soft truncate">{item.url_normalized}</p>
                </div>

                <div className="text-right">
                   <p className="font-mono text-[10px] font-black uppercase text-ink-soft">Saves</p>
                   <p className="font-display font-black text-lg leading-none">{item.save_count}</p>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="p-20 text-center border-3 border-ink border-dashed rounded-xl">
           <p className="font-mono text-sm text-ink-soft uppercase font-bold">Aún no hay suficientes datos para el ranking.</p>
        </div>
      )}
    </div>
  )
}
