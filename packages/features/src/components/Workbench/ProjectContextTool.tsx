import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderGit2 } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import {
  useCapture,
  useGlobalSearch,
  useItem,
  useUpdateItem,
  type SearchResult,
} from '@devdeck/api-client'
import { ToolFrame, TextArea } from './shared'

const PROJECT_STORAGE_KEY = 'devdeck.workbench.project.v1'

interface DesktopProjectAPI {
  detectCurrent: () => Promise<{
    name: string
    path: string
    gitRemote: string
    gitSlug: string
  }>
}

function readProjectDraft(): { name: string; remote: string; notes: string } {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY)
    if (!raw) return { name: '', remote: '', notes: '' }
    return { name: '', remote: '', notes: '', ...JSON.parse(raw) }
  } catch {
    return { name: '', remote: '', notes: '' }
  }
}

function remoteToSlug(remote: string): string {
  const trimmed = remote.trim().replace(/\.git$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('git@')) return trimmed.split(':').slice(1).join(':')
  try {
    const url = new URL(trimmed)
    return url.pathname.replace(/^\/+/, '')
  } catch {
    return trimmed
  }
}

function projectContextTag(name: string, remote: string): string {
  const source = remoteToSlug(remote) || name.trim()
  const normalized = source
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized ? `project:${normalized}` : ''
}

export function ProjectContextTool() {
  const navigate = useNavigate()
  const capture = useCapture()
  const [name, setName] = useState(() => readProjectDraft().name)
  const [remote, setRemote] = useState(() => readProjectDraft().remote)
  const [notes, setNotes] = useState(() => readProjectDraft().notes)
  const [detecting, setDetecting] = useState(false)
  const query = [name.trim(), remoteToSlug(remote)].filter(Boolean).join(' ')
  const projectTag = projectContextTag(name, remote)
  const { data: results = [], isLoading } = useGlobalSearch(query, 'text')
  const desktopProject = typeof window !== 'undefined'
    ? (window as unknown as { electronAPI?: { project?: DesktopProjectAPI } }).electronAPI?.project
    : undefined

  function persist() {
    const next = { name, remote, notes }
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(next))
    showToast('Project context saved locally', 'success')
  }

  async function saveProjectNote() {
    const payload = JSON.stringify({ name, remote, notes }, null, 2)
    try {
      await capture.mutateAsync({
        source: 'manual',
        text: payload,
        title_hint: `${name || 'Project'} context`,
        type_hint: 'note',
        tags: ['project-context', name].filter(Boolean),
        why_saved: 'Project context saved from DevDeck Workbench.',
      })
      showToast('Project context saved to your vault', 'success')
    } catch {
      showToast('Could not save project context', 'error')
    }
  }

  async function detectFromDesktop() {
    if (!desktopProject) return
    setDetecting(true)
    try {
      const detected = await desktopProject.detectCurrent()
      setName(detected.name)
      setRemote(detected.gitRemote)
      showToast('Detected current desktop project', 'success')
    } catch {
      showToast('Could not detect project context', 'error')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <ToolFrame title="Project context">
      {desktopProject && (
        <div>
          <Button type="button" variant="secondary" onClick={detectFromDesktop} disabled={detecting}>
            <span className="flex items-center gap-2">
              <FolderGit2 size={15} strokeWidth={3} />
              {detecting ? 'Detecting...' : 'Detect current Desktop project'}
            </span>
          </Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="font-display text-xs font-black uppercase tracking-widest">Project name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="dev_deck"
            className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          />
        </label>
        <label className="grid gap-2">
          <span className="font-display text-xs font-black uppercase tracking-widest">Git remote</span>
          <input
            value={remote}
            onChange={(event) => setRemote(event.target.value)}
            placeholder="https://github.com/org/repo.git"
            className="h-11 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          />
        </label>
      </div>
      <TextArea label="Project notes" value={notes} onChange={setNotes} placeholder="Runbooks, local gotchas, useful links..." />
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={persist} disabled={!name && !remote}>
          Save locally
        </Button>
        <Button type="button" onClick={saveProjectNote} disabled={(!name && !remote && !notes) || capture.isPending}>
          Save to vault
        </Button>
      </div>

      <div className="border-3 border-ink bg-bg-elevated p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-black uppercase">Related vault context</h3>
          {isLoading && <span className="font-mono text-xs text-ink-soft">Searching...</span>}
        </div>
        {!query && <ProjectContextEmptyState state="missing-project" />}
        {query && !isLoading && results.length === 0 && (
          <ProjectContextEmptyState state="no-related-context" projectTag={projectTag} />
        )}
        <div className="grid gap-2">
          {results.slice(0, 8).map((result) => (
            <ProjectContextResultRow
              key={`${result.type}-${result.id}`}
              result={result}
              projectTag={projectTag}
              onOpen={(target) => {
                if (target.type === 'item') navigate(`/items/${target.id}`)
                else if (target.type === 'repo') navigate(`/repo/${target.id}`)
                else if (target.type === 'cheatsheet') navigate(`/cheatsheets/${target.id}`)
              }}
            />
          ))}
        </div>
      </div>
    </ToolFrame>
  )
}

function ProjectContextEmptyState({
  state,
  projectTag,
}: {
  state: 'missing-project' | 'no-related-context'
  projectTag?: string
}) {
  if (state === 'missing-project') {
    return (
      <div className="grid gap-4 border-2 border-ink bg-bg-card p-4 shadow-hard-sm">
        <div>
          <p className="font-display text-base font-black uppercase">Start with one real project</p>
          <p className="mt-1 font-mono text-sm text-ink-soft">
            Add a project name or Git remote so Workbench can pull matching commands, notes, requests,
            and runbooks from your vault.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <EmptyStep title="1. Name it" body="Use the repo or folder name you actually work in." />
          <EmptyStep title="2. Add notes" body="Capture local gotchas, scripts, services, and setup hints." />
          <EmptyStep title="3. Link context" body="Tag useful vault items so the project becomes reusable." />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 border-2 border-ink bg-accent-yellow/25 p-4 shadow-hard-sm">
      <div>
        <p className="font-display text-base font-black uppercase">Build this project memory</p>
        <p className="mt-1 font-mono text-sm text-ink-soft">
          No related items yet. Save one command, API request, note, or workflow with this project in mind.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <EmptyStep title="Save a command" body="Example: pnpm test, make migrate, docker compose up." />
        <EmptyStep title="Save a gotcha" body="Write the setup detail future you would forget." />
        <EmptyStep
          title="Use the project tag"
          body={projectTag ? `Tag related items with ${projectTag}.` : 'Add a project name to generate a project tag.'}
        />
      </div>
    </div>
  )
}

function EmptyStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-2 border-ink bg-bg-elevated p-3">
      <p className="font-display text-xs font-black uppercase">{title}</p>
      <p className="mt-1 font-mono text-xs text-ink-soft">{body}</p>
    </div>
  )
}

function ProjectContextResultRow({
  result,
  projectTag,
  onOpen,
}: {
  result: SearchResult
  projectTag: string
  onOpen: (result: SearchResult) => void
}) {
  const { data: item } = useItem(result.type === 'item' ? result.id : undefined)
  const updateItem = useUpdateItem()
  const tags = item?.tags ?? []
  const linked = !!projectTag && tags.includes(projectTag)

  async function copyProjectResult() {
    const value = result.extra || result.title
    await navigator.clipboard.writeText(value)
    showToast('Copied project context item', 'success')
  }

  function openProjectResult() {
    if (result.type === 'entry') {
      void copyProjectResult()
      return
    }
    onOpen(result)
  }

  async function toggleProjectLink() {
    if (!projectTag || result.type !== 'item') return
    const nextTags = linked
      ? tags.filter((tag) => tag !== projectTag)
      : Array.from(new Set([...tags, projectTag]))
    await updateItem.mutateAsync({ id: result.id, input: { tags: nextTags } })
    showToast(linked ? 'Item unlinked from project' : 'Item linked to project', 'success')
  }

  return (
    <div className="border-2 border-ink bg-bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border-2 border-ink bg-accent-yellow px-2 py-0.5 font-mono text-[10px] uppercase">
          {result.type}
        </span>
        {linked && (
          <span className="border-2 border-ink bg-accent-lime px-2 py-0.5 font-mono text-[10px] uppercase">
            linked
          </span>
        )}
        <p className="font-display text-sm font-black uppercase">{result.title}</p>
      </div>
      {result.subtitle && <p className="mt-1 font-mono text-xs text-ink-soft">{result.subtitle}</p>}
      {result.extra && (
        <code className="mt-2 block truncate bg-ink px-2 py-1 font-mono text-[10px] text-bg-primary">
          {result.extra}
        </code>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={openProjectResult}>
          {result.type === 'entry' ? 'Copy command' : 'Open'}
        </Button>
        {result.extra && result.type !== 'entry' && (
          <Button type="button" size="sm" variant="secondary" onClick={copyProjectResult}>
            Copy
          </Button>
        )}
        {result.type === 'item' && (
          <Button
            type="button"
            size="sm"
            variant={linked ? 'secondary' : 'accent'}
            onClick={toggleProjectLink}
            disabled={!projectTag || updateItem.isPending}
          >
            {linked ? 'Unlink project' : 'Link project'}
          </Button>
        )}
      </div>
    </div>
  )
}
