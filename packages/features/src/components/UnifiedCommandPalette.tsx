import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandPalette,
  showToast,
} from '@devdeck/ui'
import {
  useGlobalSearch,
  useCapture,
  useSystemConfig,
  type SearchResult,
} from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import {
  Search,
  Plus,
  Box,
  Brain,
  BookOpen,
  MessageSquare,
  Wrench,
} from 'lucide-react'
import { AgentChat } from './AgentChat'

interface Props {
  open: boolean
  onClose: () => void
}

type ResultFilter = 'all' | SearchResult['type']

const resultFilters: { id: ResultFilter; label: string; subtitle: string }[] = [
  { id: 'all', label: 'Filter all results', subtitle: 'Show every matching vault result.' },
  { id: 'item', label: 'Filter items', subtitle: 'Show saved notes, snippets, prompts, requests, and workflows.' },
  { id: 'repo', label: 'Filter repos', subtitle: 'Show repository results only.' },
  { id: 'cheatsheet', label: 'Filter cheatsheets', subtitle: 'Show cheatsheet results only.' },
  { id: 'entry', label: 'Filter commands', subtitle: 'Show copyable cheatsheet commands only.' },
]

const workbenchToolShortcuts = [
  {
    id: 'json',
    title: 'Open JSON formatter',
    subtitle: 'Format and validate JSON locally.',
    keywords: ['json', 'format', 'formatter', 'validate', 'payload'],
  },
  {
    id: 'jwt',
    title: 'Open JWT decoder',
    subtitle: 'Decode JWT header and payload locally.',
    keywords: ['jwt', 'token', 'decode', 'auth'],
  },
  {
    id: 'base64',
    title: 'Open Base64 tool',
    subtitle: 'Encode or decode UTF-8 text.',
    keywords: ['base64', 'encode', 'decode'],
  },
  {
    id: 'url',
    title: 'Open URL encoder',
    subtitle: 'Encode or decode URL components.',
    keywords: ['url', 'uri', 'encode', 'decode'],
  },
  {
    id: 'uuid',
    title: 'Open UUID generator',
    subtitle: 'Generate UUID v4 values.',
    keywords: ['uuid', 'guid', 'id', 'generate'],
  },
  {
    id: 'timestamp',
    title: 'Open timestamp converter',
    subtitle: 'Convert UNIX timestamps and ISO dates.',
    keywords: ['time', 'timestamp', 'unix', 'date'],
  },
  {
    id: 'hash',
    title: 'Open hash generator',
    subtitle: 'Generate SHA-1 and SHA-256 digests locally.',
    keywords: ['hash', 'sha', 'sha256', 'digest'],
  },
  {
    id: 'regex',
    title: 'Open regex tester',
    subtitle: 'Test expressions against sample text.',
    keywords: ['regex', 'regexp', 'pattern', 'match'],
  },
  {
    id: 'secrets',
    title: 'Open secret scanner',
    subtitle: 'Find leaked tokens before saving or sharing.',
    keywords: ['secret', 'secrets', 'token', 'password', 'key', 'env'],
  },
  {
    id: 'api',
    title: 'Open API tester',
    subtitle: 'Send HTTP requests, import cURL, and save configs.',
    keywords: ['api', 'http', 'request', 'curl', 'fetch'],
  },
  {
    id: 'project',
    title: 'Open project context',
    subtitle: 'Find related vault context for a repo.',
    keywords: ['project', 'repo', 'context', 'git'],
  },
  {
    id: 'expander',
    title: 'Open snippet aliases',
    subtitle: 'Preview explicit local snippet expansions.',
    keywords: ['alias', 'aliases', 'snippet', 'expander', 'expand'],
  },
]

export function UnifiedCommandPalette({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [mode, setMode] = React.useState<'command' | 'ask'>('command')
  const [resultFilter, setResultFilter] = React.useState<ResultFilter>('all')
  const capture = useCapture()
  const { data: systemConfig } = useSystemConfig()
  const isAiDisabled = !systemConfig?.ai_provider || ['disabled', 'heuristic', 'local'].includes(systemConfig.ai_provider)
  
  const { data: searchResults = [], isLoading: searchLoading } = useGlobalSearch(query)

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setMode('command')
      setResultFilter('all')
    }
  }, [open])

  const handleAsk = () => {
    if (!query) return
    setMode('ask')
  }

  const saveQueryAsNote = async () => {
    const text = query.trim()
    if (!text || capture.isPending) return

    try {
      await capture.mutateAsync({
        source: 'manual',
        text,
        title_hint: text.length > 48 ? `${text.slice(0, 48)}...` : text,
        type_hint: 'note',
        tags: ['palette'],
        why_saved: 'Quick-created from the DevDeck command palette.',
      })
      showToast('Saved to your vault', 'success')
      onClose()
    } catch {
      showToast('Could not save note', 'error')
    }
  }

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value)
    showToast('Copied to clipboard', 'success')
    onClose()
  }

  const actions = [
    ...(!isAiDisabled ? [{
      id: 'ask',
      title: t('palette.ask_ai_title'),
      subtitle: t('palette.ask_ai_subtitle'),
      icon: <Brain size={16} strokeWidth={3} className="text-accent-orange" />,
      onSelect: handleAsk,
    }] : []),
    {
      id: 'capture',
      title: t('palette.capture_title'),
      subtitle: t('palette.capture_subtitle'),
      icon: <Plus size={16} strokeWidth={3} className="text-accent-lime" />,
      onSelect: () => {
        onClose()
        // Parent will open capture modal or we can trigger it here
        window.dispatchEvent(new CustomEvent('devdeck:open-capture'))
      },
    },
    {
      id: 'save-query-note',
      title: query.trim() ? 'Save current input as note' : 'Save text as note',
      subtitle: query.trim() ? query.trim() : 'Type something, then save it into your vault.',
      icon: <Plus size={16} strokeWidth={3} className="text-accent-pink" />,
      onSelect: saveQueryAsNote,
    },
    ...resultFilters.map((filter) => ({
      id: `filter-${filter.id}`,
      title: resultFilter === filter.id ? `${filter.label} (active)` : filter.label,
      subtitle: filter.subtitle,
      icon: <Search size={16} strokeWidth={3} className="text-accent-cyan" />,
      onSelect: () => setResultFilter(filter.id),
    })),
    {
      id: 'go-items',
      title: t('palette.go_items_title'),
      subtitle: t('palette.go_items_subtitle'),
      icon: <Box size={16} strokeWidth={3} className="text-accent-lavender" />,
      onSelect: () => {
        onClose()
        navigate('/items')
      },
    },
    {
      id: 'go-cheatsheets',
      title: t('palette.go_cheats_title'),
      subtitle: t('palette.go_cheats_subtitle'),
      icon: <BookOpen size={16} strokeWidth={3} className="text-accent-cyan" />,
      onSelect: () => {
        onClose()
        navigate('/cheatsheets')
      },
    },
    {
      id: 'go-workbench',
      title: 'Open Developer Workbench',
      subtitle: 'JSON, JWT, encoding, UUID, timestamps, and hashes.',
      icon: <Wrench size={16} strokeWidth={3} className="text-accent-lime" />,
      onSelect: () => {
        onClose()
        navigate('/workbench')
      },
    },
  ]

  const toolResults = workbenchToolShortcuts
    .filter((tool) => {
      const normalized = query.trim().toLowerCase()
      if (!normalized) return false
      return [tool.title, tool.subtitle, ...tool.keywords].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    })
    .slice(0, 4)
    .map((tool) => ({
      id: `workbench-${tool.id}`,
      type: 'tool',
      title: tool.title,
      subtitle: tool.subtitle,
      actionLabel: 'Open',
      icon: <Wrench size={14} />,
      onSelect: () => {
        onClose()
        navigate(`/workbench?tool=${tool.id}`)
      },
    }))

  const filteredSearchResults = resultFilter === 'all'
    ? searchResults
    : searchResults.filter((result) => result.type === resultFilter)

  const results = [
    ...toolResults,
    ...filteredSearchResults.map((r) => ({
    id: `${r.type}-${r.id}`,
    type: r.type,
    title: r.title,
    subtitle: r.curator_name ? `@${r.curator_name} · ${r.subtitle}` : r.subtitle,
    extra: r.extra,
    actionLabel: r.type === 'entry' ? 'Copy' : undefined,
    icon: r.type === 'entry' ? <MessageSquare size={14} /> : r.type === 'item' ? <Box size={14} /> : <BookOpen size={14} />,
    onSelect: () => {
      onClose()
      if (r.type === 'entry' && r.extra) void copyToClipboard(r.extra)
      else if (r.type === 'item') navigate(`/items/${r.id}`)
      else if (r.type === 'repo') navigate(`/repo/${r.id}`)
      else if (r.type === 'cheatsheet') navigate(`/cheatsheets/${r.id}`)
    },
    })),
  ]

  return (
    <CommandPalette
      open={open}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      actions={actions}
      results={results}
      isLoading={searchLoading}
      placeholder={t('palette.placeholder')}
      emptyMessage={t('palette.empty_message')}
      startWritingMessage={t('palette.start_writing')}
      actionsLabel={t('palette.actions_label')}
      resultsLabel={t('palette.results_label')}
      navigateLabel={t('palette.navigate_label')}
      selectLabel={t('palette.select_label')}
      renderCustom={mode === 'ask' ? (
        <div className="overflow-hidden bg-bg-card">
          <div className="flex items-center justify-between p-4 border-b-3 border-ink">
            <h3 className="font-display font-black text-sm uppercase flex items-center gap-2">
              <Brain size={16} strokeWidth={3} className="text-accent-orange" />
              {t('palette.knowledge_agent')}
            </h3>
            <button 
              onClick={() => { setMode('command'); }}
              className="text-xs font-mono text-ink-soft hover:text-ink"
            >
              [{t('common.back')}]
            </button>
          </div>
          <AgentChat initialQuery={query} />
        </div>
      ) : null}
      />

  )
}
