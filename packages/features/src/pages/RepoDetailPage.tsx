import clsx from 'clsx'
import {
  ArrowLeft,
  FileText,
  GitFork,
  LayoutGrid,
  Package,
  Plus,
  Star,
  Terminal,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionsBar } from '../components/ActionsBar'
import { AppShell } from '../components/AppShell'
import { Button } from '@devdeck/ui'
import { AddCommandModal } from '../components/Commands/AddCommandModal'
import { CommandsList } from '../components/Commands/CommandsList'
import { ImportScriptsModal } from '../components/Commands/ImportScriptsModal'
import { NotesEditor } from '../components/NotesEditor'
import { ReadmeViewer } from '../components/ReadmeViewer'
import { TagsEditor } from '../components/TagsEditor'
import {
  useAddCommand,
  useBatchCreateCommands,
  useCommands,
  useDeleteCommand,
  usePackageScripts,
  useReorderCommands,
  useUpdateCommand,
} from '@devdeck/api-client'
import type {
  CommandCategory,
  CreateCommandInput,
  PackageScript,
  RepoCommand,
} from '@devdeck/api-client'
import {
  useDeleteRepo,
  useRefreshRepo,
  useRepo,
  useUpdateRepo,
} from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import { confirm } from '@devdeck/ui'
import { formatCount } from '@devdeck/api-client'
import { showToast } from '@devdeck/ui'

type Tab = 'overview' | 'readme' | 'commands'

export function RepoDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [cmdModalOpen, setCmdModalOpen] = useState(false)
  const [editingCmd, setEditingCmd] = useState<RepoCommand | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [heroImgError, setHeroImgError] = useState(false)

  const { data: repo, isLoading, error } = useRepo(id)
  const updateRepo = useUpdateRepo()
  const deleteRepo = useDeleteRepo()
  const refreshRepo = useRefreshRepo()

  // Commands
  const { data: commands = [] } = useCommands(repo?.id)
  const addCommand = useAddCommand(repo?.id ?? '')
  const updateCommand = useUpdateCommand(repo?.id ?? '')
  const deleteCommand = useDeleteCommand(repo?.id ?? '')
  const reorderCommands = useReorderCommands(repo?.id ?? '')

  // Package scripts import (lazy — only fetches when modal opens)
  const {
    data: packageScripts = [],
    isLoading: scriptsLoading,
    error: scriptsError,
  } = usePackageScripts(importModalOpen ? repo?.id : undefined)
  const batchCreate = useBatchCreateCommands(repo?.id ?? '')

  if (isLoading) {
    return (
      <AppShell contentClassName="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center font-mono text-ink-soft">
          {t('common.loading')}
        </div>
      </AppShell>
    )
  }

  if (error || !repo) {
    return (
      <AppShell contentClassName="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="font-display font-black text-3xl uppercase">{t('repos.not_found_title')}</p>
          <p className="font-mono text-sm text-ink-soft max-w-md">
            {t('repos.not_found_desc')}
          </p>
          <Button variant="primary" onClick={() => navigate('/items', { replace: true })}>
            {t('repos.back_to_items')}
          </Button>
        </div>
      </AppShell>
    )
  }

  const title = repo.owner ? `${repo.owner}/${repo.name}` : repo.name

  // ───── handlers ─────

  async function saveNotes(next: string) {
    try {
      await updateRepo.mutateAsync({ id: repo!.id, input: { notes: next } })
      showToast(t('repos.notes_saved'))
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function saveTags(next: string[]) {
    try {
      await updateRepo.mutateAsync({ id: repo!.id, input: { tags: next } })
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function toggleArchive() {
    try {
      await updateRepo.mutateAsync({
        id: repo!.id,
        input: { archived: !repo!.archived },
      })
      showToast(repo!.archived ? t('repos.unarchived_msg') : t('repos.archived_msg'))
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: t('repos.delete_title'),
      message: t('repos.delete_confirm', { title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteRepo.mutateAsync(repo!.id)
      showToast(t('repos.delete_success'))
      navigate('/items', { replace: true })
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function onRefresh() {
    try {
      await refreshRepo.mutateAsync(repo!.id)
      showToast(t('repos.metadata_updated'))
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  // Commands handlers
  async function handleSubmitCommand(input: CreateCommandInput) {
    try {
      if (editingCmd) {
        await updateCommand.mutateAsync({ cmdId: editingCmd.id, input })
        showToast(t('repos.command_updated'))
      } else {
        await addCommand.mutateAsync(input)
        showToast(t('repos.command_added'))
      }
      setCmdModalOpen(false)
      setEditingCmd(null)
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleDeleteCommand(cmd: RepoCommand) {
    const ok = await confirm({
      title: t('repos.delete_title'),
      message: t('repos.delete_confirm', { title: cmd.label }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteCommand.mutateAsync(cmd.id)
      showToast(t('repos.command_deleted'))
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  function handleReorder(orderedIds: string[]) {
    reorderCommands.mutate(orderedIds)
  }

  async function handleImportScripts(scripts: PackageScript[]) {
    const inputs: CreateCommandInput[] = scripts.map((s) => {
      const lower = s.name.toLowerCase()
      let category: CommandCategory | null = null
      if (lower === 'install' || lower === 'postinstall' || lower === 'preinstall') category = 'install'
      else if (lower.startsWith('dev') || lower === 'start' || lower === 'serve') category = 'dev'
      else if (lower.includes('test') || lower.includes('spec')) category = 'test'
      else if (lower.includes('build') || lower.includes('compile')) category = 'build'
      else if (lower.includes('deploy') || lower.includes('release') || lower.includes('publish')) category = 'deploy'
      else if (lower.includes('lint') || lower.includes('format') || lower.includes('prettier') || lower.includes('eslint')) category = 'lint'
      else if (lower.includes('db') || lower.includes('migrate') || lower.includes('seed')) category = 'db'
      return {
        label: s.name,
        command: s.command,
        category,
      }
    })
    try {
      await batchCreate.mutateAsync(inputs)
      showToast(`${inputs.length} scripts importados`)
      setImportModalOpen(false)
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <AppShell contentClassName="flex-1 overflow-y-auto">
      <div className="min-h-full bg-bg-primary">
      {/* Header */}
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/items')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <h1 className="font-display font-black text-2xl uppercase tracking-tight truncate">
          {title}
        </h1>
        {repo.archived && (
          <span className="px-2 py-0.5 text-xs font-mono font-bold border-2 border-ink bg-accent-orange">
            {t('common.archived')}
          </span>
        )}
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <section className="bg-bg-card border-3 border-ink shadow-hard p-6">
            <div className="flex items-start gap-4">
              {repo.avatar_url && !heroImgError ? (
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onError is a media event, not a user interaction
                <img
                  src={repo.avatar_url}
                  alt=""
                  className="w-20 h-20 border-3 border-ink shrink-0"
                  onError={() => setHeroImgError(true)}
                />
              ) : (
                <div className="w-20 h-20 border-3 border-ink bg-accent-yellow flex items-center justify-center font-display font-black text-3xl shrink-0">
                  {(repo.name[0] ?? '?').toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-ink-soft mb-1">{repo.source}</p>
                <h2 className="font-display font-black text-3xl mb-2 break-words">
                  {repo.name}
                </h2>
                {repo.description && (
                  <p className="text-ink-soft">{repo.description}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 mt-5 pt-4 border-t-2 border-ink/10 font-mono text-sm">
              {repo.language && (
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 border border-ink"
                    style={{ backgroundColor: repo.language_color || '#888' }}
                  />
                  {repo.language}
                </span>
              )}
              {repo.stars > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star size={14} strokeWidth={2.5} />
                  {formatCount(repo.stars)}
                </span>
              )}
              {repo.forks > 0 && (
                <span className="flex items-center gap-1.5">
                  <GitFork size={14} strokeWidth={2.5} />
                  {formatCount(repo.forks)}
                </span>
              )}
              <span className="text-ink-soft">
                {t('common.added_at', { date: new Date(repo.added_at).toLocaleDateString() })}
              </span>
            </div>

            {repo.topics.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-ink/10">
                <p className="text-xs font-display font-black uppercase tracking-widest mb-2 text-ink-soft">
                  {t('repos.github_topics')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {repo.topics.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-xs font-mono border-2 border-ink bg-bg-elevated"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Tabs */}
          <div className="flex gap-0 border-b-3 border-ink">
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
              <LayoutGrid size={14} strokeWidth={3} />
              {t('repos.tabs.overview')}
            </TabButton>
            <TabButton active={tab === 'readme'} onClick={() => setTab('readme')}>
              <FileText size={14} strokeWidth={3} />
              {t('repos.tabs.readme')}
            </TabButton>
            <TabButton active={tab === 'commands'} onClick={() => setTab('commands')}>
              <Terminal size={14} strokeWidth={3} />
              {t('repos.tabs.commands')}
              {commands.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-ink text-bg-primary font-mono">
                  {commands.length}
                </span>
              )}
            </TabButton>
          </div>

          {/* Tab content */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <NotesEditor
                value={repo.notes}
                onSave={saveNotes}
                saving={updateRepo.isPending}
              />
              <TagsEditor
                value={repo.tags}
                onChange={saveTags}
                saving={updateRepo.isPending}
              />
            </div>
          )}

          {tab === 'readme' && <ReadmeViewer repoId={repo.id} source={repo.source} repoUrl={repo.url} />}

          {tab === 'commands' && (
            <div>
              <div className="flex items-center justify-between mb-4 gap-3">
                <p className="font-mono text-sm text-ink-soft">
                  {commands.length === 0
                    ? t('repos.commands_empty')
                    : t('repos.commands_count', { count: commands.length })}
                </p>
                <div className="flex gap-2 shrink-0">
                  {repo.source === 'github' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setImportModalOpen(true)}
                    >
                      <span className="flex items-center gap-2">
                        <Package size={14} strokeWidth={3} />
                        {t('repos.import_scripts')}
                      </span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCmd(null)
                      setCmdModalOpen(true)
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Plus size={14} strokeWidth={3} />
                      {t('repos.new_command')}
                    </span>
                  </Button>
                </div>
              </div>

              {commands.length === 0 ? (
                <div className="bg-bg-card border-3 border-dashed border-ink/40 p-12 text-center">
                  <Terminal
                    size={48}
                    strokeWidth={2.5}
                    className="mx-auto mb-4 text-ink-soft"
                  />
                  <p className="font-mono text-sm text-ink-soft mb-4">
                    {t('repos.commands_empty_hint')}
                  </p>
                  <Button
                    onClick={() => {
                      setEditingCmd(null)
                      setCmdModalOpen(true)
                    }}
                  >
                    {t('repos.create_command')}
                  </Button>
                </div>
              ) : (
                <CommandsList
                  commands={commands}
                  onReorder={handleReorder}
                  onEdit={(cmd) => {
                    setEditingCmd(cmd)
                    setCmdModalOpen(true)
                  }}
                  onDelete={handleDeleteCommand}
                />
              )}
            </div>
          )}
        </div>

        {/* Right column: actions */}
        <aside>
          <div className="lg:sticky lg:top-24">
            <ActionsBar
              repo={repo}
              onArchiveToggle={toggleArchive}
              onDelete={onDelete}
              onRefresh={onRefresh}
              archiving={updateRepo.isPending}
              refreshing={refreshRepo.isPending}
            />
          </div>
        </aside>
      </div>

      <AddCommandModal
        open={cmdModalOpen}
        editing={editingCmd}
        saving={addCommand.isPending || updateCommand.isPending}
        errorMessage={
          (addCommand.error as Error | null)?.message ??
          (updateCommand.error as Error | null)?.message ??
          null
        }
        onClose={() => {
          setCmdModalOpen(false)
          setEditingCmd(null)
        }}
        onSubmit={handleSubmitCommand}
      />

      <ImportScriptsModal
        open={importModalOpen}
        scripts={packageScripts}
        loading={scriptsLoading}
        saving={batchCreate.isPending}
        errorMessage={(scriptsError as Error | null)?.message ?? (batchCreate.error as Error | null)?.message ?? null}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportScripts}
      />
      </div>
    </AppShell>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 -mb-[3px] font-display font-bold uppercase text-sm tracking-wide',
        'border-3 border-b-0',
        active
          ? 'border-ink bg-bg-card'
          : 'border-transparent text-ink-soft hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
