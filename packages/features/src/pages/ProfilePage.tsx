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
  Terminal,
  LogOut
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import {
  useMe,
  useUpdateMe,
  useUploadAvatar,
  useDecks,
  useItems,
  useStats,
  logoutCurrentSession
} from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

const POPULAR_TAGS = [
  'React', 'Next.js', 'TypeScript', 'Go', 'Rust', 'Python', 'Node.js',
  'TailwindCSS', 'Docker', 'PostgreSQL', 'SQLite', 'MongoDB', 'AWS',
  'Linux', 'Bash', 'Neovim', 'VSCode', 'Zsh', 'Git', 'Kubernetes'
]

export function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user, isLoading: loadingUser } = useMe()

  const handleLogout = async () => {
    try {
      await logoutCurrentSession()
      showToast(t('common.logout_msg'))
      navigate('/login')
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }
  const { data: decks = [], isLoading: loadingDecks } = useDecks()
  const { data: itemsRes } = useItems({ limit: 10 })
  const { data: stats } = useStats()
  const updateMe = useUpdateMe()
  const uploadAvatar = useUploadAvatar()

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [stackTags, setStackTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  // Crop Modal and Avatar State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)

  const triggerFileSelect = () => {
    document.getElementById('avatar-file-input')?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast(t('profile.invalid_image_type', 'El archivo no es una imagen válida'), 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('profile.image_too_large', 'La imagen supera el límite de 5MB'), 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropImageSrc(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCropSave = async (blob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('avatar', blob, 'avatar.png')
      
      const result = await uploadAvatar.mutateAsync(formData)
      setAvatarPreviewUrl(result.avatar_url)
      showToast(t('profile.avatar_uploaded', '¡Imagen de perfil subida con éxito!'))
      setCropImageSrc(null)
    } catch (err) {
      showToast((err as Error).message || t('profile.upload_error', 'Error al subir la imagen'), 'error')
    }
  }

  const handleGithubSync = async () => {
    const url = githubUrl.trim()
    if (!url) {
      showToast(t('profile.github_url_empty', 'Introduce tu URL de GitHub primero'), 'error')
      return
    }

    let parsedUsername = url
    if (url.includes('github.com/')) {
      const parts = url.split('github.com/')
      const pathPart = parts[parts.length - 1]
      parsedUsername = pathPart.split('/')[0]
    }

    parsedUsername = parsedUsername.trim()
    if (!parsedUsername) {
      showToast(t('profile.github_username_invalid', 'No se pudo obtener el usuario de la URL'), 'error')
      return
    }

    const githubAvatarUrl = `https://github.com/${parsedUsername}.png`

    try {
      await updateMe.mutateAsync({
        avatar_url: githubAvatarUrl,
      })
      setAvatarPreviewUrl(githubAvatarUrl)
      showToast(t('profile.github_synced', '¡Avatar sincronizado desde GitHub!'))
    } catch (err) {
      showToast((err as Error).message || t('profile.github_sync_error', 'Error al sincronizar con GitHub'), 'error')
    }
  }

  // Open Modal and pre-populate fields
  const openEditModal = () => {
    if (user) {
      setUsername(user.username || '')
      setBio(user.bio || '')
      setWebsite(user.website || '')
      setLocation(user.location || '')
      setGithubUrl(user.github_url || '')
      setStackTags(user.stack_tags || [])
      setAvatarPreviewUrl(user.avatar_url || '')
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
      showToast(t('common.profile_updated'))
      setIsModalOpen(false)
    } catch (err) {
      showToast((err as Error).message || t('profile.save_error'), 'error')
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

  // Calculate Gamified Reputation Points
  // Reputation = (Total Items * 5) + (Decks Count * 15) + (Streak Days * 50)
  const totalItemsCount = itemsRes?.total || 0
  const reputation = (totalItemsCount * 5) + (decks.length * 15) + ((stats?.streak_days || 0) * 50)

  // Achievements evaluation
  const achievements = [
    {
      id: 'early_adopter',
      title: 'Early Adopter',
      description: t('profile.achievement_early_adopter_desc'),
      icon: '🚀',
      unlocked: true,
      color: 'bg-accent-yellow'
    },
    {
      id: 'curator_master',
      title: 'Curator Master',
      description: t('profile.achievement_curator_master_desc'),
      icon: '🛡️',
      unlocked: totalItemsCount >= 5,
      color: 'bg-accent-cyan'
    },
    {
      id: 'deck_builder',
      title: 'Deck Builder',
      description: t('profile.achievement_deck_builder_desc'),
      icon: '🏗️',
      unlocked: decks.length >= 1,
      color: 'bg-accent-pink'
    },
    {
      id: 'flame_keeper',
      title: 'Flame Keeper',
      description: t('profile.achievement_flame_keeper_desc'),
      icon: '🔥',
      unlocked: (stats?.streak_days || 0) >= 1,
      color: 'bg-accent-lime'
    }
  ]

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
          <Button onClick={openEditModal} variant="accent" className="flex items-center gap-2">
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
                  onClick={openEditModal}
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
                  onClick={openEditModal}
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
                  onClick={openEditModal}
                  className="border-2 border-ink border-dashed p-2 text-ink-soft/40 hover:text-ink hover:border-ink transition-all"
                  title={t('profile.location_link')}
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
              {t('profile.achievements')}
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
                {t('profile.decks_count')}
              </span>
            </div>

            <div className="bg-accent-cyan border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
              <span className="font-mono text-3xl font-black">{totalItemsCount}</span>
              <span className="font-display font-bold text-xs uppercase text-ink/65 flex items-center gap-1.5">
                <Briefcase size={14} />
                {t('profile.tips_count')}
              </span>
            </div>

            <div className="bg-accent-lime border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
              <span className="font-mono text-3xl font-black flex items-center gap-1">
                {stats?.streak_days || 0}
                <Flame className="text-accent-pink fill-accent-pink animate-pulse" size={24} />
              </span>
              <span className="font-display font-bold text-xs uppercase text-ink/65">
                {t('profile.streak_days')}
              </span>
            </div>

            <div className="bg-accent-yellow border-3 border-ink p-4 shadow-hard flex flex-col justify-between">
              <span className="font-mono text-3xl font-black flex items-center gap-1">
                {reputation}
                <Sparkles size={20} className="text-accent-pink animate-spin-slow" />
              </span>
              <span className="font-display font-bold text-xs uppercase text-ink/65">
                {t('profile.reputation')}
              </span>
            </div>
          </section>

          {/* Tech Stack Section */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-4">
            <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
              <Terminal size={20} strokeWidth={3} className="text-accent-cyan" />
              {t('profile.tech_stack_title')}
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
                <p className="font-mono text-xs text-ink-soft">{t('profile.no_tech_selected')}</p>
                <Button onClick={openEditModal} size="sm" variant="secondary" className="mt-3">
                  {t('profile.add_my_stack')}
                </Button>
              </div>
            )}
          </section>

          {/* Owned Decks (Grid of Decks) */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
                <Library size={20} strokeWidth={3} className="text-accent-pink" />
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

          {/* Recent Activity Timeline */}
          <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
            <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
              <History size={20} strokeWidth={3} className="text-accent-lime" />
              {t('profile.capture_history')}
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
                <p className="font-mono text-xs text-ink-soft">{t('profile.no_history')}</p>
                <p className="font-mono text-[10px] text-ink-soft/60 mt-1">{t('profile.no_history_desc')}</p>
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
                {t('profile.edit_modal_title')}
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
              {/* Avatar Editing Area */}
              <div className="flex flex-col items-center gap-4 border-b-2 border-dashed border-ink/20 pb-6 mb-6">
                <label className="font-display font-black text-xs uppercase text-ink">
                  {t('profile.avatar_label', 'Imagen de Perfil')}
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                  <div 
                    onClick={triggerFileSelect}
                    className="w-24 h-24 border-4 border-ink shadow-hard overflow-hidden bg-accent-yellow rounded-none shrink-0 relative cursor-pointer hover:scale-105 active:scale-95 transition-all group"
                  >
                    <img src={avatarPreviewUrl || user.avatar_url} alt="Avatar Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-ink/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                      <Plus size={20} strokeWidth={3} />
                      <span className="font-mono text-[9px] uppercase tracking-wider">{t('profile.change_avatar_hover', 'Cambiar')}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="font-mono text-xs text-ink-soft">
                      {t('profile.avatar_instructions', 'Haz clic en la imagen para subir una foto personalizada, o sincroniza tu avatar desde GitHub.')}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <Button onClick={triggerFileSelect} size="sm" variant="secondary">
                        {t('profile.upload_custom_btn', 'Subir Imagen')}
                      </Button>
                      {githubUrl && (
                        <Button onClick={handleGithubSync} size="sm" variant="accent">
                          {t('profile.sync_github_btn', 'Sincronizar GitHub')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Hidden File Input */}
                <input
                  type="file"
                  id="avatar-file-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {/* Username */}
              <div className="space-y-2">
                <label className="font-display font-black text-xs uppercase text-ink block">
                  {t('profile.username_label')}
                </label>
                <input
                  type="text"
                  placeholder="ej. tux_hacker"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10"
                />
                <p className="font-mono text-[10px] text-ink-soft">
                  {t('profile.username_desc', { username: username || 'username' })}
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="font-display font-black text-xs uppercase text-ink block">
                  {t('settings.bio_label')}
                </label>
                <textarea
                  placeholder={t('profile.bio_edit_placeholder')}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10 resize-none"
                />
              </div>

              {/* Stack Selector (Interactive Badges) */}
              <div className="space-y-3">
                <label className="font-display font-black text-xs uppercase text-ink block">
                  {t('profile.curation_stack')}
                </label>

                {/* Selected Tags list */}
                <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                  {stackTags.length > 0 ? (
                    stackTags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => handleRemoveTag(tag)}
                        className="border-2 border-ink bg-accent-lavender text-xs font-mono font-bold px-2 py-0.5 flex items-center gap-1.5 cursor-pointer hover:bg-accent-pink hover:text-white transition-colors"
                        title={t('profile.click_to_remove')}
                      >
                        {tag} <X size={10} strokeWidth={4} />
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[10px] text-ink-soft italic">{t('profile.no_tech_added')}</span>
                  )}
                </div>

                {/* Popular badges to click toggle */}
                <div className="space-y-1.5 pt-2 border-t border-dashed border-ink/20">
                  <p className="font-display font-bold text-[9px] uppercase tracking-wide text-ink-soft">
                    {t('profile.suggested_tags')}
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
                    placeholder={t('profile.other_placeholder')}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 border-3 border-ink px-3 py-1.5 font-mono text-xs focus:outline-none"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    {t('profile.add_button')}
                  </Button>
                </form>
              </div>

              {/* Website / Github / Location row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-display font-black text-xs uppercase text-ink block flex items-center gap-1.5">
                    <Globe size={14} className="text-accent-cyan" /> {t('profile.website_label')}
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
                    <Github size={14} className="text-accent-pink" /> {t('profile.github_label')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://github.com/tux"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="flex-1 border-3 border-ink px-3 py-1.5 font-mono text-xs focus:outline-none"
                    />
                    <Button onClick={handleGithubSync} size="sm" variant="accent">
                      {t('profile.sync_avatar_btn_small', 'Sincronizar')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="font-display font-black text-xs uppercase text-ink block flex items-center gap-1.5">
                    <MapPin size={14} className="text-accent-lime" /> {t('profile.location_label')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('profile.location_placeholder')}
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
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveProfile} disabled={updateMe.isPending} variant="primary">
                {updateMe.isPending ? t('common.loading') : t('profile.save_changes')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CROP MODAL */}
      {cropImageSrc && (
        <CropModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCrop={handleCropSave}
          isSubmitting={uploadAvatar.isPending}
        />
      )}
      </div>
    </AppShell>
  )
}

interface CropModalProps {
  imageSrc: string
  onClose: () => void
  onCrop: (blob: Blob) => void
  isSubmitting: boolean
}

export function CropModal({ imageSrc, onClose, onCrop, isSubmitting }: CropModalProps) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const imageRef = React.useRef<HTMLImageElement | null>(null)

  // Load image
  React.useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      imageRef.current = img
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      draw()
    }
  }, [imageSrc])

  // Draw on canvas whenever zoom, offset, or image changes
  const draw = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Brutalist styling light gray bg
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(offset.x, offset.y)

    const imgRatio = img.width / img.height
    let drawWidth = canvas.width
    let drawHeight = canvas.height

    if (imgRatio > 1) {
      drawHeight = canvas.height
      drawWidth = canvas.height * imgRatio
    } else {
      drawWidth = canvas.width
      drawHeight = canvas.width / imgRatio
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    ctx.restore()

    // Draw solid brutalist crop border
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, canvas.width, canvas.height)
  }

  React.useEffect(() => {
    draw()
  }, [zoom, offset])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x * zoom, y: e.clientY - offset.y * zoom })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom
    setOffset({ x: dx, y: dy })
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const zoomFactor = 0.05
    const nextZoom = e.deltaY < 0 ? Math.min(zoom + zoomFactor, 4) : Math.max(zoom - zoomFactor, 0.5)
    setZoom(nextZoom)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob)
      }
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />

      <div className="bg-bg-card border-4 border-ink p-6 max-w-md w-full shadow-hard relative z-10 flex flex-col items-center">
        <h3 className="font-display font-black text-xl uppercase mb-4 w-full text-left border-b-3 border-ink pb-2">
          ✂️ Recortar Imagen
        </h3>

        <div className="border-3 border-ink shadow-hard overflow-hidden bg-bg-primary relative cursor-move">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheel}
            className="block select-none touch-none"
          />
        </div>

        <p className="font-mono text-[10px] text-ink-soft mt-3 text-center">
          Arrastra para mover la foto · Usa la rueda o el control para hacer zoom
        </p>

        <div className="w-full mt-4 flex items-center gap-3">
          <span className="font-mono text-xs uppercase font-bold">Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-ink h-2 bg-bg-primary border-2 border-ink rounded-none cursor-pointer"
          />
          <span className="font-mono text-xs font-bold w-8 text-right">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex justify-end gap-3 w-full border-t-3 border-ink pt-4 mt-6">
          <button
            onClick={onClose}
            className="border-3 border-ink px-4 py-2 font-display font-bold uppercase bg-white text-ink hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0 active:shadow-none transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="border-3 border-ink px-4 py-2 font-display font-bold uppercase bg-accent-pink text-white hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? 'Subiendo...' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  )
}
