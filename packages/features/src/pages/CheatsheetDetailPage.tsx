import { ArrowLeft, Copy, Filter, Plus, Search, Share2, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@devdeck/ui'
import { AppShell } from '../components/AppShell'
import {
  useCheatsheet,
  useCreateEntry,
  useDeleteCheatsheet,
  useDeleteEntry,
  useUpdateEntry,
  useCapture,
  useCircles,
  useShareToCircle,
} from '@devdeck/api-client'
import type { CheatsheetDetail, Entry } from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { ShareToCirclePanel } from '../components/ShareToCirclePanel'

export function CheatsheetDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: detail, isLoading, error } = useCheatsheet(id)

  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const createEntry = useCreateEntry(id ?? '')
  const updateEntry = useUpdateEntry(id ?? '')
  const deleteEntry = useDeleteEntry(id ?? '')
  const deleteCheatsheet = useDeleteCheatsheet()
  const capture = useCapture()
  const { data: circles = [] } = useCircles()
  const shareToCircle = useShareToCircle()

  async function handleDeleteCheatsheet() {
    if (!id || !detail) return
    if (!window.confirm(t('cheatsheets.delete_confirm'))) return
    try {
      await deleteCheatsheet.mutateAsync(id)
      showToast(t('cheatsheets.delete_success'))
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
      <AppShell contentClassName="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center font-mono text-ink-soft">
          {t('common.loading')}
        </div>
      </AppShell>
    )
  }

  if (error || !detail) {
    return (
      <AppShell contentClassName="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
          <p className="font-display font-black text-3xl uppercase">{t('common.cheatsheet_not_found')}</p>
          <Button variant="primary" onClick={() => navigate('/cheatsheets')}>
            {t('common.back')}
          </Button>
        </div>
      </AppShell>
    )
  }

  const color = detail.color ?? '#888'

  async function handleCopy(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd)
      showToast(t('common.copy_success'))
    } catch {
      showToast(t('common.error'), 'error')
    }
  }

  async function handleDelete(e: Entry) {
    try {
      await deleteEntry.mutateAsync(e.id)
      showToast(t('item_detail.entry_deleted_toast'))
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  async function handleSubmitEntry(input: { label: string; command: string; description: string; tags: string[] }) {
    try {
      if (editingEntry) {
        await updateEntry.mutateAsync({ entryId: editingEntry.id, input })
        showToast(t('item_detail.entry_updated_toast'))
      } else {
        await createEntry.mutateAsync(input)
        showToast(t('item_detail.entry_created_toast'))
      }
      setEditingEntry(null)
      setAddingNew(false)
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  async function handleShareCheatsheet({ circleId, context }: { circleId: string; context: string }) {
    if (!detail) return
    try {
      const captured = await capture.mutateAsync({
        source: 'manual',
        text: formatCheatsheetForSharing(detail),
        title_hint: `Cheatsheet: ${detail.title}`,
        type_hint: 'snippet',
        tags: ['cheatsheet', detail.category, 'circle-share'].filter(Boolean),
        why_saved: context,
      })
      const itemId = captured.item?.id || captured.duplicate_of
      if (!itemId) throw new Error('Could not capture cheatsheet before sharing.')

      await shareToCircle.mutateAsync({ circleId, itemId })
      showToast('Cheatsheet shared to Circle', 'success')
      setShareOpen(false)
    } catch (err) {
      showToast((err as Error).message || 'Could not share cheatsheet', 'error')
    }
  }

  return (
    <AppShell contentClassName="flex-1 overflow-y-auto">
      <div className="min-h-full bg-bg-primary">
      {/* Header */}
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/cheatsheets')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label={t('common.back')}
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
        <button
          type="button"
          onClick={() => setShareOpen((open) => !open)}
          disabled={circles.length === 0}
          aria-label="Share cheatsheet to Circle"
          className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:bg-accent-yellow
                     disabled:opacity-50 transition-colors ml-auto lg:ml-0"
        >
          <Share2 size={18} strokeWidth={3} />
        </button>
        {!detail.is_seed && (
          <button
            type="button"
            onClick={handleDeleteCheatsheet}
            disabled={deleteCheatsheet.isPending}
            aria-label={t('common.delete')}
            className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:bg-danger hover:text-white
                       disabled:opacity-50 transition-colors ml-auto lg:ml-0"
          >
            <Trash2 size={18} strokeWidth={3} />
          </button>
        )}
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {shareOpen && (
          <div className="mb-6">
            <ShareToCirclePanel
              circles={circles}
              isSharing={capture.isPending || shareToCircle.isPending}
              title="Share cheatsheet to Circle"
              description="Add context so the Circle knows when to use this cheatsheet."
              submitLabel="Save and share cheatsheet"
              onClose={() => setShareOpen(false)}
              onShare={handleShareCheatsheet}
            />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} strokeWidth={2.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder={t('cheatsheets.search_entries')}
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
                  label={t('cheatsheets.categories.all')}
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
                {t('cheatsheets.add_entry')}
              </span>
            </Button>
          </div>
        </div>

        {/* Entries list */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-mono text-xs text-ink-soft italic">
              {searchFilter || tagFilter ? t('cheatsheets.no_entries_found') : t('cheatsheets.no_entries_yet')}
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
    </AppShell>
  )
}

function formatCheatsheetForSharing(detail: CheatsheetDetail): string {
  const lines = [`# ${detail.title}`, '', `Category: ${detail.category}`]
  if (detail.description) {
    lines.push('', detail.description)
  }
  if (detail.entries.length > 0) {
    lines.push('', '## Entries')
    detail.entries.forEach((entry) => {
      lines.push('', `### ${entry.label}`, '', '```bash', entry.command, '```')
      if (entry.description) {
        lines.push('', entry.description)
      }
      if (entry.tags.length > 0) {
        lines.push('', `Tags: ${entry.tags.join(', ')}`)
      }
    })
  }
  return lines.join('\n')
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
  const { t } = useTranslation()
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
            aria-label={t('common.copy_code')}
            className="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-lime
                       active:translate-x-[1px] active:translate-y-[1px] transition-transform"
          >
            <Copy size={14} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('item_detail.edit_button')}
            className="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-yellow
                       active:translate-x-[1px] active:translate-y-[1px] transition-transform"
          >
            <Filter size={14} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('common.delete')}
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
  const { t } = useTranslation()
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
            {entry ? t('cheatsheets.edit_entry') : t('cheatsheets.add_entry')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="border-3 border-ink p-1 hover:bg-accent-pink">
            <X size={18} strokeWidth={3} />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">{t('cheatsheets.entry_label')}</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Stage & Commit"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">{t('cheatsheets.entry_command')}</label>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="git add -A && git commit -m 'msg'"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">{t('cheatsheets.entry_description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Stage all changes and commit"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none"
            />
          </div>
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">{t('cheatsheets.entry_tags')}</label>
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
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving || !label.trim() || !command.trim()}>
            {saving ? t('common.loading') : entry ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </div>
  )
}
