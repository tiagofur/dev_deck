import React, { useState, useEffect } from 'react'
import { Edit3, Plus, X, Globe, MapPin } from 'lucide-react'
import { GithubIcon as Github } from '../icons/GithubIcon'
import { Button, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { useUpdateMe, useUploadAvatar, User } from '@devdeck/api-client'
import { CropModal } from './CropModal'
import { UserAvatar } from '../UserAvatar'

export interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
}

const POPULAR_TAGS = [
  'React', 'Next.js', 'TypeScript', 'Go', 'Rust', 'Python', 'Node.js',
  'TailwindCSS', 'Docker', 'PostgreSQL', 'SQLite', 'MongoDB', 'AWS',
  'Linux', 'Bash', 'Neovim', 'VSCode', 'Zsh', 'Git', 'Kubernetes'
]

export function EditProfileModal({ isOpen, onClose, user }: EditProfileModalProps) {
  const { t } = useTranslation()
  const updateMe = useUpdateMe()
  const uploadAvatar = useUploadAvatar()

  // Form states
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [stackTags, setStackTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  // Avatar states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)

  // Pre-populate fields on open or when user details change
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '')
      setBio(user.bio || '')
      setWebsite(user.website || '')
      setLocation(user.location || '')
      setGithubUrl(user.github_url || '')
      setStackTags(user.stack_tags || [])
      setAvatarPreviewUrl(user.avatar_url || '')
    }
  }, [isOpen, user])

  const triggerFileSelect = () => {
    document.getElementById('avatar-file-input-modal')?.click()
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
      onClose()
    } catch (err) {
      showToast((err as Error).message || t('profile.save_error'), 'error')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Glassmorphic Backdrop */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- backdrop click-to-close overlay; closing is also reachable via the Close button and Escape */}
        <div
          className="absolute inset-0 bg-ink/75 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
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
              onClick={onClose}
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
                  role="button"
                  tabIndex={0}
                  aria-label={t('profile.avatar_label', 'Imagen de Perfil')}
                  onClick={triggerFileSelect}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      triggerFileSelect()
                    }
                  }}
                  className="w-24 h-24 border-4 border-ink shadow-hard overflow-hidden bg-accent-yellow rounded-none shrink-0 relative cursor-pointer hover:scale-105 active:scale-95 transition-all group"
                >
                  <UserAvatar
                    src={avatarPreviewUrl || user.avatar_url}
                    alt="Avatar Preview"
                    imageClassName="w-full h-full object-cover"
                    fallbackClassName="w-full h-full flex items-center justify-center bg-accent-yellow text-ink"
                    iconSize={36}
                  />
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
                id="avatar-file-input-modal"
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
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRemoveTag(tag)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRemoveTag(tag)
                        }
                      }}
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
            <Button onClick={onClose} variant="secondary">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateMe.isPending} variant="primary">
              {updateMe.isPending ? t('common.loading') : t('profile.save_changes')}
            </Button>
          </div>
        </div>
      </div>

      {/* CROP MODAL */}
      {cropImageSrc && (
        <CropModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCrop={handleCropSave}
          isSubmitting={uploadAvatar.isPending}
        />
      )}
    </>
  )
}
