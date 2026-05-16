import { ArrowLeft, Library, Sparkles, User as UserIcon, UserPlus, UserMinus, Flame } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  usePublicProfile, 
  useUserPublicDecks, 
  useFollowUser, 
  useUnfollowUser,
  useMe
} from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { data: profileRes, isLoading: loadingProfile } = usePublicProfile(username || '')
  const { data: decksRes, isLoading: loadingDecks } = useUserPublicDecks(username || '')
  const { data: me } = useMe()
  const follow = useFollowUser()
  const unfollow = useUnfollowUser()

  const profile = profileRes?.profile
  const decks = decksRes?.decks || []
  const isMe = me?.username === username

  async function handleToggleFollow() {
    if (!username) return
    try {
      if (profile?.is_following) {
        await unfollow.mutateAsync(username)
        showToast('Dejaste de seguir a este curador')
      } else {
        await follow.mutateAsync(username)
        showToast('¡Siguiendo!')
      }
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-bg-primary p-8 flex items-center justify-center">
        <div className="font-mono text-sm animate-pulse text-ink-soft">Buscando perfil…</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg-primary p-8 flex flex-col items-center justify-center gap-4">
        <p className="font-display font-black text-2xl uppercase">Usuario no encontrado</p>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
          <UserIcon size={22} strokeWidth={3} />
          Perfil de {profile.username}
        </h1>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-12">
        {/* Profile Info */}
        <section className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div className="w-32 h-32 border-4 border-ink shadow-hard overflow-hidden bg-accent-yellow shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-bg-elevated">
                <UserIcon size={48} className="text-ink-soft" />
              </div>
            )}
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <h2 className="font-display font-black text-4xl uppercase leading-none">
                @{profile.username}
              </h2>
              <p className="font-mono text-xs text-ink-soft mt-1">
                Miembro desde {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
            {profile.bio && (
              <p className="text-lg leading-relaxed max-w-2xl italic border-l-4 border-ink pl-4 text-ink-soft">
                "{profile.bio}"
              </p>
            )}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
               <Stat label="Decks" value={profile.public_decks_count} color="bg-accent-lavender" />
               <Stat label="Seguidores" value={profile.followers_count} color="bg-accent-cyan" />
               <Stat label="Siguiendo" value={profile.following_count} color="bg-accent-lime" />
               <Stat label="Reputación" value={profile.reputation_points} color="bg-accent-yellow" icon={<Flame size={12} className="text-ink/40" />} />
            </div>

            {!isMe && me && (
              <div className="pt-2 flex justify-center md:justify-start">
                <Button 
                  onClick={handleToggleFollow} 
                  variant={profile.is_following ? 'secondary' : 'primary'}
                  disabled={follow.isPending || unfollow.isPending}
                >
                   <span className="flex items-center gap-2">
                     {profile.is_following ? (
                       <><UserMinus size={18} strokeWidth={3} /> Dejar de seguir</>
                     ) : (
                       <><UserPlus size={18} strokeWidth={3} /> Seguir Curador</>
                     )}
                   </span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Public Decks */}
        <section className="space-y-6">
          <h3 className="font-display font-black text-2xl uppercase tracking-widest flex items-center gap-3">
            <Library size={24} strokeWidth={3} className="text-accent-pink" />
            Decks Públicos
          </h3>

          {loadingDecks ? (
            <div className="font-mono text-sm text-ink-soft animate-pulse">Cargando decks…</div>
          ) : decks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => navigate(`/deck/${deck.slug}`)}
                  className="bg-bg-card border-3 border-ink p-6 shadow-hard text-left group
                             hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                             active:translate-x-0 active:translate-y-0 active:shadow-none
                             transition-all"
                >
                  <h4 className="font-display font-black text-xl uppercase mb-2 group-hover:text-accent-pink transition-colors">
                    {deck.title}
                  </h4>
                  {deck.description && (
                    <p className="text-sm text-ink-soft mb-4 line-clamp-2">{deck.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-mono uppercase font-bold bg-accent-yellow border-2 border-ink px-2 py-0.5">
                      {deck.item_count} items
                    </span>
                    <span className="text-xs font-mono font-bold group-hover:underline flex items-center gap-1">
                      Ver deck →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-3 border-ink border-dashed rounded-xl">
              <p className="font-mono text-ink-soft">Este usuario no tiene decks públicos todavía.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-4xl mx-auto p-12 text-center">
        <p className="text-[10px] font-mono text-ink-soft uppercase tracking-widest flex items-center justify-center gap-2">
          <Sparkles size={12} className="text-accent-pink" />
          Powered by DevDeck.ai
        </p>
      </footer>
    </div>
  )
}

function Stat({ label, value, color, icon }: { label: string; value: number | string; color: string; icon?: React.ReactNode }) {
  return (
    <div className={`flex flex-col border-2 border-ink shadow-hard-sm ${color} p-3 min-w-[80px]`}>
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm font-black leading-none">{value}</span>
        {icon}
      </div>
      <span className="font-display font-bold text-[9px] uppercase tracking-wider text-ink/60 mt-1">
        {label}
      </span>
    </div>
  )
}
