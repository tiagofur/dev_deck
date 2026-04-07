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
import { Button } from '../components/Button'
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
} from '../features/commands/api'
import type {
  CommandCategory,
  CreateCommandInput,
  PackageScript,
  RepoCommand,
} from '../features/commands/types'
import {
  useDeleteRepo,
  useRefreshRepo,
  useRepo,
  useUpdateRepo,
} from '../features/repos/api'
import { confirm } from '../lib/confirm'
import { formatCount } from '../lib/format'
import { showToast } from '../lib/toast'

type Tab = 'overview' | 'readme' | 'commands'

export function RepoDetailPage() {
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
      <div className="min-h-screen flex items-center justify-center font-mono text-ink-soft">
        Cargando…
      </div>
    )
  }

  if (error || !repo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="font-display font-black text-3xl uppercase">Repo no encontrado</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </div>
    )
  }

  const title = repo.owner ? `${repo.owner}/${repo.name}` : repo.name

  // ───── handlers ─────

  async function saveNotes(next: string) {
    try {
      await updateRepo.mutateAsync({ id: repo!.id, input: { notes: next } })
      showToast('Notas guardadas')
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
      showToast(repo!.archived ? 'Desarchivado' : 'Archivado')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Borrar repo',
      message: `Esto va a eliminar "${title}" para siempre. No se puede deshacer.`,
      confirmLabel: 'Borrar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteRepo.mutateAsync(repo!.id)
      showToast('Repo borrado')
      navigate('/')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function onRefresh() {
    try {
      await refreshRepo.mutateAsync(repo!.id)
      showToast('Metadata actualizada')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  // Commands handlers
  async function handleSubmitCommand(input: CreateCommandInput) {
    try {
      if (editingCmd) {
        await updateCommand.mutateAsync({ cmdId: editingCmd.id, input })
        showToast('Comando actualizado')
      } else {
        await addCommand.mutateAsync(input)
        showToast('Comando agregado')
      }
      setCmdModalOpen(false)
      setEditingCmd(null)
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleDeleteCommand(cmd: RepoCommand) {
    const ok = await confirm({
      title: 'Borrar comando',
      message: `Esto va a borrar "${cmd.label}". No se puede deshacer.`,
      confirmLabel: 'Borrar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await deleteCommand.mutateAsync(cmd.id)
      showToast('Comando borrado')
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
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <h1 className="font-display font-black text-2xl uppercase tracking-tight truncate">
          {title}
        </h1>
        {repo.archived && (
          <span className="px-2 py-0.5 text-xs font-mono font-bold border-2 border-ink bg-accent-orange">
            ARCHIVADO
          </span>
        )}
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <section className="bg-bg-card border-3 border-ink shadow-hard p-6">
            <div className="flex items-start gap-4">
              {repo.avatar_url && !heroImgError ? (
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
                añadido {new Date(repo.added_at).toLocaleDateString()}
              </span>
            </div>

            {repo.topics.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-ink/10">
                <p className="text-xs font-display font-black uppercase tracking-widest mb-2 text-ink-soft">
                  Topics de GitHub
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
              Overview
            </TabButton>
            <TabButton active={tab === 'readme'} onClick={() => setTab('readme')}>
              <FileText size={14} strokeWidth={3} />
              README
            </TabButton>
            <TabButton active={tab === 'commands'} onClick={() => setTab('commands')}>
              <Terminal size={14} strokeWidth={3} />
              Commands
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
                    ? 'Sin comandos. Agregá los `pnpm dev`, `make migrate`, etc. de este repo.'
                    : `${commands.length} ${commands.length === 1 ? 'comando' : 'comandos'} — arrastrá para reordenar.`}
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
                        Importar scripts
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
                      Nuevo
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
                    Empty. Pegá tu primer comando.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingCmd(null)
                      setCmdModalOpen(true)
                    }}
                  >
                    Crear comando
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
