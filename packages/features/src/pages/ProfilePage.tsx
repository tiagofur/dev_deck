import React, { useState } from 'react'
import {
  ArrowLeft,
  User as UserIcon,
  Globe,
  MapPin,
  Github,
  Edit3,
  Plus,
  X,
  Flame,
  Calendar,
  Library,
  Sparkles,
  Trophy,
  Check,
  Eye,
  EyeOff,
  Briefcase,
  History,
  Terminal
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useMe,
  useUpdateMe,
  useDecks,
  useItems,
  useStats
} from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'

const POPULAR_TAGS = [
  'React', 'Next.js', 'TypeScript', 'Go', 'Rust', 'Python', 'Node.js',
  'TailwindCSS', 'Docker', 'PostgreSQL', 'SQLite', 'MongoDB', 'AWS',
  'Linux', 'Bash', 'Neovim', 'VSCode', 'Zsh', 'Git', 'Kubernetes'
]

export function ProfilePage() {
  const navigate = useNavigate()
  const { data: user, isLoading: loadingUser } = useMe()
  const { data: decks = [], isLoading: loadingDecks } = useDecks()
  const { data: itemsRes } = useItems({ limit: 10 })
  const { data: stats } = useStats()
  const updateMe = useUpdateMe()

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [stackTags, setStackTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  // Open Modal and pre-populate fields
  const openEditModal = () => {
    if (user) {
      setUsername(user.username || '')
      setBio(user.bio || '')
      setWebsite(user.website || '')
      setLocation(user.location || '')
      setGithubUrl(user.github_url || '')
      setStackTags(user.stack_tags || [])
    }
    setIsModalOpen(true)
  }

  // Handle Tag actions
  const handleToggleTag = (tag: string) => {
    if (stackTags.includes(tag)) {
      setStackTags(stackTags.filter(t => t !== tag))
    } else {
      setStackTags([...stackTags, tag])
    }
  }

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTag = newTag.trim()
    if (!cleanTag) return
    if (!stackTags.includes(cleanTag)) {
      setStackTags([...stackTags, cleanTag])
    }
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    setStackTags(stackTags.filter(t => t !== tag))
  }

  // Save changes
  const handleSaveProfile = async () => {
    try {
      await updateMe.mutateAsync({
        username: username || undefined,
        bio: bio || '',
        website: website || '',
        location: location || '',
        github_url: githubUrl || '',
        stack_tags: stackTags
      })
      showToast('¡Perfil actualizado con éxito!')
      setIsModalOpen(false)
    } catch (err) {
      showToast((err as Error).message || 'Error al actualizar el perfil', 'error')
    }
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-bg-primary p-8 flex items-center justify-center">
        <div className="font-mono text-sm animate-pulse text-ink-soft">Preparando tu perfil curador…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary p-8 flex flex-col items-center justify-center gap-4">
        <p className="font-display font-black text-2xl uppercase">Iniciá sesión para ver tu perfil</p>
        <Button onClick={() => navigate('/login')}>Ingresar</Button>
      </div>
    )
  }

  // Calculate Gamified Reputation Points
  // Reputation = (Total Items * 5) + (Decks Count * 15) + (Streak Days * 50)
  const totalItemsCount = itemsRes?.total || 0
  const reputation = (totalItemsCount * 5) + (decks.length * 15) + ((stats?.streak_days || 0) * 50)

  // Achievements evaluation
  const achievements = [
    {
      id: 'early_adopter',
      title: 'Early Adopter',
      description: 'Te uniste a los curadores pioneros de DevDeck.',
      icon: '🚀',
      unlocked: true,
      color: 'bg-accent-yellow'
    },
    {
      id: 'curator_master',
      title: 'Curator Master',
      description: 'Has guardado más de 5 items en tu vault personal.',
      icon: '🛡️',
      unlocked: totalItemsCount >= 5,
      color: 'bg-accent-cyan'
    },
    {
      id: 'deck_builder',
      title: 'Deck Builder',
      description: 'Creaste al menos un deck personalizado para organizar tips.',
      icon: '🏗️',
      unlocked: decks.length >= 1,
      color: 'bg-accent-pink'
    },
    {
      id: 'flame_keeper',
      title: 'Flame Keeper',
      description: 'Mantuviste una racha de curación de conocimiento activa.',
      icon: '🔥',
      unlocked: (stats?.streak_days || 0) >= 1,
      color: 'bg-accent-lime'
    }
  ]

  const recentItems = itemsRes?.items || []

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {/* Topbar back action */}
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="border-3 border-ink p-2 bg-bg-card shadow-hard
                       hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                       active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                       transition-all duration-150 cursor-pointer"
            aria-label="Volver"
          >
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
            <UserIcon size={22} strokeWidth={3} />
            Mi Perfil
          </h1>
        </div>
        <Button onClick={openEditModal} variant="accent" className="flex items-center gap-2">
          <Edit3 size={16} strokeWidth={3} />
          Editar Perfil
        </Button>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* LEFT COLUMN: Hero profile & stack info */}
        <div className="lg:col-span-1 space-y-8">
          {/* Hero Profile Card */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard flex flex-col items-center text-center relative group">
            <div
              onClick={openEditModal}
              className="w-28 h-28 border-4 border-ink shadow-hard overflow-hidden bg-accent-yellow rounded-none shrink-0 relative cursor-pointer group-hover:scale-105 transition-transform"
            >
              <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
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
              Miembro desde {new Date(user.created_at).toLocaleDateString()}
            </p>

            {user.bio ? (
              <p className="text-sm italic text-ink-soft border-t-2 border-dashed border-ink/20 mt-6 pt-4 w-full px-2 leading-relaxed">
                "{user.bio}"
              </p>
            ) : (
              <p className="text-xs text-ink-soft/60 italic border-t-2 border-dashed border-ink/20 mt-6 pt-4 w-full px-2">
                Sin biografía redactada aún. ¡Hacé click en editar para agregar una!
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
                  title="GitHub Profile"
                >
                  <Github size={16} strokeWidth={3} />
                </a>
              ) : (
                <button
                  onClick={openEditModal}
                  className="border-2 border-ink border-dashed p-2 text-ink-soft/40 hover:text-ink hover:border-ink transition-all"
                  title="Vincular GitHub"
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
                  title="Personal Website"
                >
                  <Globe size={16} strokeWidth={3} />
                </a>
              ) : (
                <button
                  onClick={openEditModal}
                  className="border-2 border-ink border-dashed p-2 text-ink-soft/40 hover:text-ink hover:border-ink transition-all"
                  title="Agregar Sitio Web"
                >
                  <Globe size={16} strokeWidth={2} />
                </button>
              )}

              {user.location ? (
                <span
                  className="border-2 border-ink bg-bg-card p-2 shadow-hard-sm text-ink flex items-center gap-1.5 text-xs font-mono font-bold"
                  title={`Ubicación: ${user.location}`}
                >
                  <MapPin size={16} strokeWidth={3} className="text-accent-lime" />
                  <span className="max-w-[80px] truncate">{user.location}</span>
                </span>
              ) : (
                <button
                  onClick={openEditModal}
                  className="border-2 border-ink border-dashed p-2 text-ink-soft/40 hover:text-ink hover:border-ink transition-all"
                  title="Agregar Ubicación"
                >
                  <MapPin size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </section>

          {/* Curation Achievements / Badges */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
            <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
              <Trophy size={20} strokeWidth={3} className="text-accent-yellow" />
              Logros & Insignias
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`border-2 border-ink p-3 shadow-hard-sm flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-300
                             ${ach.unlocked ? `${ach.color} bg-opacity-100` : 'bg-bg-primary bg-opacity-40 filter grayscale opacity-50'}`}
                >
                  <span className="text-3xl mb-2">{ach.icon}</span>
                  <div>
                    <h4 className="font-display font-black text-[11px] uppercase tracking-wide leading-tight">
                      {ach.title}
                    </h4>
                    <p className="text-[8px] font-mono mt-1 text-ink/75 leading-tight">
                      {ach.description}
                    </p>
                  </div>
                  {ach.unlocked && (
                    <div className="absolute top-1 right-1 border border-ink bg-white p-0.5 rounded-none flex items-center justify-center">
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (GRID SPAN 2): Stats, My Stack, Decks, Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Dashboard Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-accent-lavender border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
              <span className="font-mono text-3xl font-black">{decks.length}</span>
              <span className="font-display font-bold text-xs uppercase text-ink/65 flex items-center gap-1.5">
                <Library size={14} />
                Decks Creados
              </span>
            </div>

            <div className="bg-accent-cyan border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
              <span className="font-mono text-3xl font-black">{totalItemsCount}</span>
              <span className="font-display font-bold text-xs uppercase text-ink/65 flex items-center gap-1.5">
                <Briefcase size={14} />
                Tips Guardados
              </span>
            </div>

            <div className="bg-accent-lime border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
              <span className="font-mono text-3xl font-black flex items-center gap-1">
                {stats?.streak_days || 0}
                <Flame className="text-accent-pink fill-accent-pink animate-pulse" size={24} />
              </span>
              <span className="font-display font-bold text-xs uppercase text-ink/65">
                Racha de Curación
              </span>
            </div>

            <div className="bg-accent-yellow border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
              <span className="font-mono text-3xl font-black flex items-center gap-1">
                {reputation}
                <Sparkles size={20} className="text-accent-pink animate-spin-slow" />
              </span>
              <span className="font-display font-bold text-xs uppercase text-ink/65">
                Reputación Curador
              </span>
            </div>
          </section>

          {/* Tech Stack Section */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-4">
            <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
              <Terminal size={20} strokeWidth={3} className="text-accent-cyan" />
              Mi Stack Tecnológico
            </h3>
            {user.stack_tags && user.stack_tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {user.stack_tags.map((tag) => (
                  <span
                    key={tag}
                    className="border-2 border-ink bg-bg-primary px-3 py-1 font-mono text-xs font-bold shadow-hard-sm"
                  >
                    🚀 {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="border-2 border-ink border-dashed p-6 text-center">
                <p className="font-mono text-xs text-ink-soft">No seleccionaste tecnologías en tu stack todavía.</p>
                <Button onClick={openEditModal} size="sm" variant="secondary" className="mt-3">
                  Agregar mi Stack
                </Button>
              </div>
            )}
          </section>

          {/* Owned Decks (Grid of Decks) */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
                <Library size={20} strokeWidth={3} className="text-accent-pink" />
                Mis Decks Curados
              </h3>
              <Button onClick={() => navigate('/cheatsheets')} size="sm" variant="secondary">
                Ver todos
              </Button>
            </div>

            {loadingDecks ? (
              <div className="font-mono text-xs text-ink-soft animate-pulse">Cargando decks…</div>
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
                          <Eye size={8} /> Público
                        </span>
                      ) : (
                        <span className="border border-ink bg-accent-lavender text-[8px] font-mono font-black uppercase px-1.5 py-0.5 flex items-center gap-0.5">
                          <EyeOff size={8} /> Privado
                        </span>
                      )}
                    </div>
                    {deck.description && (
                      <p className="text-xs text-ink-soft mb-4 line-clamp-2">{deck.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-ink/10">
                      <span className="text-[9px] font-mono uppercase bg-accent-yellow border border-ink px-1.5 py-0.5">
                        {deck.item_count || 0} items
                      </span>
                      <span className="text-[10px] font-mono font-bold group-hover:underline">
                        Ver deck →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="border-2 border-ink border-dashed p-10 text-center rounded-none">
                <p className="font-mono text-xs text-ink-soft">Aún no creaste ningún deck personal.</p>
                <p className="font-mono text-[10px] text-ink-soft/60 mt-1">Los decks te permiten agrupar tips de Linux, macOS, bash o shortcuts y compartirlos.</p>
                <Button onClick={() => navigate('/cheatsheets')} className="mt-4" size="sm">
                  Crear mi primer Deck
                </Button>
              </div>
            )}
          </section>

          {/* Recent Activity Timeline */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
            <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
              <History size={20} strokeWidth={3} className="text-accent-lime" />
              Historial de Capturas
            </h3>

            {recentItems.length > 0 ? (
              <div className="relative border-l-3 border-ink pl-6 ml-2 space-y-6">
                {recentItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="relative group">
                    {/* Bullet marker */}
                    <div className="absolute -left-[31px] top-1.5 border-2 border-ink w-4 h-4 bg-accent-yellow shadow-hard-sm rounded-none" />

                    <div className="bg-bg-primary border-2 border-ink p-4 shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard transition-all">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9px] font-mono uppercase font-black bg-accent-cyan border border-ink px-1.5 py-0.5">
                          {item.item_type || 'TIP'}
                        </span>
                        <span className="text-[9px] font-mono text-ink-soft">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4
                        className="font-display font-bold text-sm uppercase mt-2 hover:text-accent-pink cursor-pointer"
                        onClick={() => navigate(item.item_type === 'repo' ? `/repo/${item.id}` : `/items/${item.id}`)}
                      >
                        {item.title}
                      </h4>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-accent-pink hover:underline block mt-1 truncate"
                        >
                          {item.url}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-ink border-dashed p-10 text-center">
                <p className="font-mono text-xs text-ink-soft">Aún no capturaste ningún item o tip.</p>
                <p className="font-mono text-[10px] text-ink-soft/60 mt-1">Usá el comando rápido o el extension de navegador para capturar.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* EDIT PROFILE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glassmorphic Backdrop */}
          <div
            className="absolute inset-0 bg-ink/75 backdrop-blur-sm cursor-pointer"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="bg-bg-card border-4 border-ink p-6 max-w-xl w-full shadow-hard relative z-10 flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b-3 border-ink pb-4 mb-6">
              <h3 className="font-display font-black text-2xl uppercase flex items-center gap-2">
                <Edit3 size={20} strokeWidth={3} className="text-accent-yellow" />
                Editar Perfil Curador
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="border-2 border-ink p-1 bg-bg-card hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0 active:shadow-none transition-all"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-6 flex-1">
              {/* Username */}
              <div className="space-y-2">
                <label className="font-display font-black text-xs uppercase text-ink block">
                  Username único
                </label>
                <input
                  type="text"
                  placeholder="ej. tux_hacker"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10"
                />
                <p className="font-mono text-[10px] text-ink-soft">
                  El slug para tu perfil público de curador: devdeck.ai/u/{username || 'username'}
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="font-display font-black text-xs uppercase text-ink block">
                  Biografía
                </label>
                <textarea
                  placeholder="Contanos un poco sobre vos, tu setup de curación, o qué compartís..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10 resize-none"
                />
              </div>

              {/* Stack Selector (Interactive Badges) */}
              <div className="space-y-3">
                <label className="font-display font-black text-xs uppercase text-ink block">
                  Mi Stack de Curation
                </label>

                {/* Selected Tags list */}
                <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                  {stackTags.length > 0 ? (
                    stackTags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => handleRemoveTag(tag)}
                        className="border-2 border-ink bg-accent-lavender text-xs font-mono font-bold px-2 py-0.5 flex items-center gap-1.5 cursor-pointer hover:bg-accent-pink hover:text-white transition-colors"
                        title="Hacé click para eliminar"
                      >
                        {tag} <X size={10} strokeWidth={4} />
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[10px] text-ink-soft italic">Sin tecnologías agregadas aún. Seleccioná abajo.</span>
                  )}
                </div>

                {/* Popular badges to click toggle */}
                <div className="space-y-1.5 pt-2 border-t border-dashed border-ink/20">
                  <p className="font-display font-bold text-[9px] uppercase tracking-wide text-ink-soft">
                    Sugeridos (Hacé click para alternar):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                    {POPULAR_TAGS.map((tag) => {
                      const isSelected = stackTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`border px-2 py-0.5 font-mono text-[10px] font-bold transition-all cursor-pointer
                                     ${isSelected ? 'bg-accent-pink text-white border-ink border-2' : 'bg-bg-primary border-ink/40 hover:border-ink'}`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Add Custom Tag Form */}
                <form onSubmit={handleAddCustomTag} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Otro (ej. Go, Swift, Astro...)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 border-3 border-ink px-3 py-1.5 font-mono text-xs focus:outline-none"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Agregar
                  </Button>
                </form>
              </div>

              {/* Website / Github / Location row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-display font-black text-xs uppercase text-ink block flex items-center gap-1.5">
                    <Globe size={14} className="text-accent-cyan" /> Sitio Web
                  </label>
                  <input
                    type="text"
                    placeholder="https://tux.dev"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full border-3 border-ink px-3 py-1.5 font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-display font-black text-xs uppercase text-ink block flex items-center gap-1.5">
                    <Github size={14} className="text-accent-pink" /> URL de GitHub
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/tux"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full border-3 border-ink px-3 py-1.5 font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="font-display font-black text-xs uppercase text-ink block flex items-center gap-1.5">
                    <MapPin size={14} className="text-accent-lime" /> Ubicación / Región
                  </label>
                  <input
                    type="text"
                    placeholder="Buenos Aires, Argentina"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border-3 border-ink px-3 py-1.5 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t-3 border-ink pt-4 mt-6">
              <Button onClick={() => setIsModalOpen(false)} variant="secondary">
                Cancelar
              </Button>
              <Button onClick={handleSaveProfile} disabled={updateMe.isPending} variant="primary">
                {updateMe.isPending ? 'Guardando…' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
