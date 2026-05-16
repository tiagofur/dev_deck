import { Award, Users, Trophy } from 'lucide-react'
import { useCuratorLeaderboard, type CuratorRanking } from '@devdeck/api-client'
import { useNavigate } from 'react-router-dom'

export function CuratorLeaderboard() {
  const { data, isLoading } = useCuratorLeaderboard()
  const navigate = useNavigate()
  const rankings = data?.rankings || []

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="bg-accent-lavender border-3 border-ink p-4 shadow-hard">
         <p className="font-mono text-xs font-bold uppercase flex items-center gap-2 text-ink">
            <Trophy size={14} fill="currentColor" />
            Top Curadores
         </p>
         <p className="text-[10px] uppercase font-black text-ink/60 mt-1">Los guardianes de conocimiento más activos</p>
      </div>

      {isLoading ? (
        <div className="p-20 text-center animate-pulse font-mono text-sm text-ink-soft">
          Clasificando a los mejores curadores…
        </div>
      ) : rankings.length > 0 ? (
        <div className="space-y-3">
           {rankings.map((curator, idx) => (
             <div 
                key={curator.id} 
                onClick={() => navigate(`/u/${curator.username}`)}
                className="bg-bg-card border-3 border-ink p-4 shadow-hard flex items-center gap-4 group cursor-pointer hover:-translate-y-1 transition-all"
              >
                <div className={`w-10 h-10 flex items-center justify-center border-2 border-ink font-display font-black text-sm shadow-hard-sm
                    ${idx === 0 ? 'bg-accent-yellow' : idx === 1 ? 'bg-accent-lavender' : 'bg-bg-primary'}
                `}>
                   #{idx + 1}
                </div>

                <div className="w-12 h-12 rounded-full border-3 border-ink bg-white overflow-hidden shadow-hard-sm">
                   {curator.avatar_url ? (
                     <img src={curator.avatar_url} alt={curator.username} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center">
                        <Users size={20} />
                     </div>
                   )}
                </div>

                <div className="flex-1 min-w-0">
                   <p className="font-display font-black text-sm uppercase tracking-tight group-hover:text-accent-pink transition-colors">
                     @{curator.username}
                   </p>
                   <p className="text-[10px] text-ink-soft font-bold uppercase flex items-center gap-2">
                      <Users size={10} /> {curator.followers_count} seguidores
                   </p>
                </div>

                <div className="bg-bg-primary border-2 border-ink px-3 py-1 shadow-hard-sm">
                   <p className="font-mono text-[8px] font-black uppercase text-ink/40">Points</p>
                   <p className="font-display font-black text-sm leading-none">{curator.reputation_points}</p>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="p-20 text-center border-3 border-ink border-dashed rounded-xl">
           <p className="font-mono text-sm text-ink-soft uppercase font-bold">Iniciando competencia comunitaria…</p>
        </div>
      )}
    </div>
  )
}
