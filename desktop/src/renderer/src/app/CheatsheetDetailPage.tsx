import { ArrowLeft, Copy, Filter, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import {
  useCheatsheet,
  useCreateEntry,
  useDeleteCheatsheet,
  useDeleteEntry,
  useUpdateEntry,
} from '../features/cheatsheets/api'
import type { Entry } from '../features/cheatsheets/types'
import { showToast } from '../lib/toast'

export function CheatsheetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: detail, isLoading, error } = useCheatsheet(id)

  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [addingNew, setAddingNew] = useState(false)

  const createEntry = useCreateEntry(id ?? '')
  const updateEntry = useUpdateEntry(id ?? '')
  const deleteEntry = useDeleteEntry(id ?? '')
  const deleteCheatsheet = useDeleteCheatsheet()

  async function handleDeleteCheatsheet() {
    if (!id || !detail) return
    try {
      await deleteCheatsheet.mutateAsync(id)
      showToast('Cheatsheet borrada')
      navigate('/cheatsheets')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  // Collect all tags from entries.
  const allTags = useMemo(() => {
    if (!detail) return []
    const tags = new Set<string>()
    for (const e of detail.entries) {
      for (const t of e.tags) tags.add(t)
    }
    return [...tags].sort()
  }, [detail])

  // Filter entries by tag + search.
  const filteredEntries = useMemo(() => {
    if (!detail) return []
    return detail.entries.filter((e) => {
      if (tagFilter && !e.tags.includes(tagFilter)) return false
      if (searchFilter) {
        const q = searchFilter.toLowerCase()
        return (
          e.label.toLowerCase().includes(q) ||
          e.command.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [detail, tagFilter, searchFilter])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-soft">
        Cargando…
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="font-display font-black text-3xl uppercase">Cheatsheet no encontrada</p>
        <Button variant="primary" onClick={() => navigate('/cheatsheets')}>
          Volver a cheatsheets
        </Button>
      </div>
    )
  }

  const color = detail.color ?? '#888'

  async function handleCopy(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd)
      showToast('Copiado al clipboard')
    } catch {
      showToast('No se pudo copiar', 'error')
    }
  }

  async function handleDelete(e: Entry) {
    try {
      await deleteEntry.mutateAsync(e.id)
      showToast('Entry borrada')
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  async function handleSubmitEntry(input: { label: string; command: string; description: string; tags: string[] }) {
    try {
      if (editingEntry) {
        await updateEntry.mutateAsync({ entryId: editingEntry.id, input })
        showToast('Entry actualizada')
      } else {
        await createEntry.mutateAsync(input)
        showToast('Entry creada')
      }
      setEditingEntry(null)
      setAddingNew(false)
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/cheatsheets')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div
          className="w-10 h-10 border-3 border-ink flex items-center justify-center text-lg"
          style={{ backgroundColor: color + '30' }}
        >
          {detail.icon ?? '📄'}
        </div>
        <div>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight">
            {detail.title}
          </h1>
          <p className="font-mono text-xs text-ink-soft">{detail.category} · {detail.entries.length} entries</p>
        </div>
        {detail.description && (
          <p className="ml-auto font-mono text-xs text-ink-soft max-w-md text-right hidden lg:block">
            {detail.description}
          </p>
        )}
        {!detail.is_seed && (
          <button
            type="button"
            onClick={handleDeleteCheatsheet}
            disabled={deleteCheatsheet.isPending}
            aria-label="Borrar cheatsheet"
            className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:bg-danger hover:text-white
                       disabled:opacity-50 transition-colors ml-auto lg:ml-0"
          >
            <Trash2 size={18} strokeWidth={3} />
          </button>
        )}
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} strokeWidth={2.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder="Filtrar entries…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full border-2 border-ink pl-8 pr-3 py-1.5 font-mono text-xs
                         focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} strokeWidth={2.5} className="text-ink-soft" />
              <div className="flex flex-wrap gap-1.5">
                <TagButton
                  label="Todas"
                  active={tagFilter === null}
                  onClick={() => setTagFilter(null)}
                />
                {allTags.map((t) => (
                  <TagButton
                    key={t}
                    label={t}
                    active={tagFilter === t}
                    onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="ml-auto">
            <Button size="sm" onClick={() => { setEditingEntry(null); setAddingNew(true) }}>
              <span className="flex items-center gap-2">
                <Plus size={14} strokeWidth={3} />
                Nueva entry
              </span>
            </Button>
          </div>
        </div>

        {/* Entries list */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-mono text-ink-soft">
              {searchFilter || tagFilter ? 'No hay entries con ese filtro.' : 'Sin entries todavía.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                color={color}
                onCopy={() => handleCopy(entry.command)}
                onEdit={() => { setEditingEntry(entry); setAddingNew(true) }}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create modal */}
      {(addingNew || editingEntry) && (
        <EntryModal
          entry={editingEntry}
          saving={createEntry.isPending || updateEntry.isPending}
          errorMessage={(createEntry.error as Error | null)?.message ?? (updateEntry.error as Error | null)?.message ?? null}
          onSubmit={handleSubmitEntry}
          onClose={() => { setEditingEntry(null); setAddingNew(false) }}
        />
      )}
    </div>
  )
}

// ─── Entry Card ───

function EntryCard({
  entry,
  color,
  onCopy,
  onEdit,
  onDelete,
}: {
  entry: Entry
  color: string
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-display font-bold uppercase text-base truncate">
              {entry.label}
            </h4>
            {entry.tags.length > 0 && (
              <div className="flex gap-1 shrink-0">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border-2 border-ink"
                    style={{ backgroundColor: color + '30' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <code className="block bg-ink text-bg-primary font-mono text-xs px-3 py-2 border-2 border-ink overflow-x-auto whitespace-nowrap">
            {entry.command}
          </code>
          {entry.description && (
            <p className="text-xs text-ink-soft font-mono mt-2">{entry.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copiar"
            className="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-lime
                       active:translate-x-[1px] active:translate-y-[1px] transition-transform"
          >
            <Copy size={14} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar"
            className="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-yellow
                       active:translate-x-[1px] active:translate-y-[1px] transition-transform"
          >
            <Filter size={14} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Borrar"
            className="border-2 border-ink p-1.5 bg-bg-card hover:bg-danger hover:text-white
                       active:translate-x-[1px] active:translate-y-[1px] transition-transform"
          >
            <Trash2 size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tag Button ───

function TagButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border-2 transition-colors ${
        active ? 'bg-accent-yellow border-ink' : 'border-ink/30 hover:border-ink'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Entry Modal (create/edit) ───

function EntryModal({
  entry,
  saving,
  errorMessage,
  onSubmit,
  onClose,
}: {
  entry: Entry | null
  saving?: boolean
  errorMessage?: string | null
  onSubmit: (input: { label: string; command: string; description: string; tags: string[] }) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState(entry?.label ?? '')
  const [command, setCommand] = useState(entry?.command ?? '')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [tagsStr, setTagsStr] = useState(entry?.tags?.join(', ') ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !command.trim()) return
    onSubmit({
      label: label.trim(),
      command: command.trim(),
      description: description.trim(),
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-accent-cyan/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-xl"
      >
        <header className="flex items-center justify-between mb-5">
          <h2 className="font-display font-black text-2xl uppercase">
            {entry ? 'Editar entry' : 'Nueva entry'}
          </h2>
          <button type="button" onClick={onClose} className="border-3 border-ink p-1 hover:bg-accent-pink">
            <X size={18} strokeWidth={3} />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Label</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Stage & Commit"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Command</label>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="git add -A && git commit -m 'msg'"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Stage all changes and commit"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">Tags (comma separated)</label>
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="commit, staging, basic"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm">{errorMessage}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving || !label.trim() || !command.trim()}>
            {saving ? 'Guardando…' : entry ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </div>
  )
}
