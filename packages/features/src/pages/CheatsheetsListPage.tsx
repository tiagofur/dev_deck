import clsx from 'clsx'
import { BookOpen, ChevronLeft, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@devdeck/ui'
import { useCheatsheets, useCreateCheatsheet, useDeleteCheatsheet } from '@devdeck/api-client'
import type { Cheatsheet, CreateCheatsheetInput } from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'

const categoryLabels: Record<string, string> = {
  vcs: 'Version Control',
  os: 'OS / CLI',
  language: 'Languages',
  framework: 'Frameworks',
  tool: 'Tools',
  'package-manager': 'Package Managers',
  editor: 'Editors',
  shell: 'Shell / Terminal',
  cloud: 'Cloud / DevOps',
  other: 'Other',
}

export function CheatsheetsListPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const { data: cheatsheets = [], isLoading } = useCheatsheets(selectedCategory ?? undefined)
  const createCheatsheet = useCreateCheatsheet()
  const deleteCheatsheet = useDeleteCheatsheet()

  async function handleCreate(input: CreateCheatsheetInput) {
    try {
      const created = await createCheatsheet.mutateAsync(input)
      showToast('Cheatsheet creada')
      setShowCreate(false)
      navigate(`/cheatsheets/${created.id}`)
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    try {
      await deleteCheatsheet.mutateAsync(id)
      showToast('Cheatsheet borrada')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  // Extract unique categories from data when no filter is active.
  const categories = useMemo(() => {
    if (selectedCategory) return [selectedCategory]
    const cats = new Set<string>()
    for (const c of cheatsheets) cats.add(c.category)
    return [...cats].sort()
  }, [cheatsheets, selectedCategory])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-soft">
        Cargando cheatsheets…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r-3 border-ink bg-bg-elevated p-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-mono text-ink-soft
                     hover:text-ink mb-6 transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={3} />
          Volver
        </button>

        <h2 className="font-display font-black text-xs uppercase tracking-widest mb-3 text-ink">
          Categorías
        </h2>
        <div className="space-y-1">
          <CategoryButton
            label="Todas"
            active={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          />
          {Object.entries(categoryLabels).map(([key, label]) => (
            <CategoryButton
              key={key}
              label={label}
              active={selectedCategory === key}
              onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
            />
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl uppercase tracking-tight flex items-center gap-3">
              <BookOpen size={36} strokeWidth={3} />
              Cheatsheets
            </h1>
            <p className="font-mono text-sm text-ink-soft mt-2">
              {cheatsheets.length} {cheatsheets.length === 1 ? 'cheatsheet' : 'cheatsheets'}
              {selectedCategory ? ` en ${categoryLabels[selectedCategory] ?? selectedCategory}` : ''}
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <span className="flex items-center gap-2">
              <Plus size={14} strokeWidth={3} />
              Nueva cheatsheet
            </span>
          </Button>
        </header>

        {cheatsheets.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={64} strokeWidth={2} className="mx-auto mb-4 text-ink-soft" />
            <p className="font-mono text-ink-soft">
              No hay cheatsheets {selectedCategory ? 'en esta categoría' : 'todavía'}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cheatsheets.map((c) => (
              <CheatsheetCard
                key={c.id}
                cheatsheet={c}
                onClick={() => navigate(`/cheatsheets/${c.id}`)}
                onDelete={(e) => handleDelete(e, c.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateCheatsheetModal
          saving={createCheatsheet.isPending}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-2 py-1 text-sm font-mono border-2 transition-colors',
        active
          ? 'bg-accent-yellow border-ink shadow-hard-sm'
          : 'border-transparent hover:border-ink',
      )}
    >
      {label}
    </button>
  )
}

function CheatsheetCard({
  cheatsheet,
  onClick,
  onDelete,
}: {
  cheatsheet: Cheatsheet
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const color = cheatsheet.color ?? '#888'
  return (
    <div
      onClick={onClick}
      className="bg-bg-card border-3 border-ink shadow-hard p-5 text-left cursor-pointer
                 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                 transition-all duration-150 group relative"
    >
      {!cheatsheet.is_seed && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Borrar cheatsheet"
          className="absolute top-3 right-3 border-2 border-ink p-1 bg-bg-card
                     hover:bg-danger hover:text-white opacity-0 group-hover:opacity-100
                     active:translate-x-[1px] active:translate-y-[1px] transition-all"
        >
          <Trash2 size={12} strokeWidth={3} />
        </button>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 border-2 border-ink flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: color + '30' }}
        >
          {cheatsheet.icon ?? '📄'}
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg uppercase truncate group-hover:text-accent-pink transition-colors">
            {cheatsheet.title}
          </h3>
          <span
            className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase
                        border-2 border-ink mt-1"
            style={{ backgroundColor: color + '40' }}
          >
            {cheatsheet.category}
          </span>
        </div>
      </div>
      {cheatsheet.description && (
        <p className="font-mono text-xs text-ink-soft line-clamp-2">
          {cheatsheet.description}
        </p>
      )}
    </div>
  )
}

// ─── Create Cheatsheet Modal ───

const CATEGORY_OPTIONS = [
  { value: 'vcs', label: 'Version Control' },
  { value: 'os', label: 'OS / CLI' },
  { value: 'language', label: 'Languages' },
  { value: 'framework', label: 'Frameworks' },
  { value: 'tool', label: 'Tools' },
  { value: 'package-manager', label: 'Package Managers' },
  { value: 'editor', label: 'Editors' },
  { value: 'shell', label: 'Shell / Terminal' },
  { value: 'cloud', label: 'Cloud / DevOps' },
  { value: 'other', label: 'Other' },
]

function CreateCheatsheetModal({
  saving,
  onSubmit,
  onClose,
}: {
  saving?: boolean
  onSubmit: (input: CreateCheatsheetInput) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('tool')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('')

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(v))
    }
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !slug.trim()) return
    onSubmit({
      title: title.trim(),
      slug: slug.trim(),
      category,
      description: description.trim(),
      icon: icon.trim() || null,
      color: color.trim() || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-lg"
      >
        <header className="flex items-center justify-between mb-5">
          <h2 className="font-display font-black text-2xl uppercase">Nueva cheatsheet</h2>
          <button type="button" onClick={onClose} className="border-3 border-ink p-1 hover:bg-accent-pink transition-colors">
            <X size={18} strokeWidth={3} />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Título *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Docker Commands"
              required
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Slug *</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="docker-commands"
              required
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Categoría *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 bg-bg-card"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Descripción</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quick reference for Docker commands"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Ícono</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🐳"
                className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
              />
            </div>
            <div className="flex-1">
              <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Color (hex)</label>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#2496ED"
                className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || !title.trim() || !slug.trim()}>
            {saving ? 'Creando…' : 'Crear cheatsheet'}
          </Button>
        </div>
      </form>
    </div>
  )
}
