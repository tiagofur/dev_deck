import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandPalette,
  hashIndex,
  showToast,
} from '@devdeck/ui'
import {
  useGlobalSearch,
  useAsk,
  useCapture,
  type SearchResult,
  type AskResponse,
} from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import {
  Search,
  Plus,
  Box,
  Brain,
  Sparkles,
  BookOpen,
  Settings,
  History,
  MessageSquare,
  Wrench,
} from 'lucide-react'
import { AgentChat } from './AgentChat'

interface Props {
  open: boolean
  onClose: () => void
}

export function UnifiedCommandPalette({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [mode, setMode] = React.useState<'command' | 'ask'>('command')
  const capture = useCapture()
  
  const { data: searchResults = [], isLoading: searchLoading } = useGlobalSearch(query)

  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setMode('command')
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
    {
      id: 'ask',
      title: t('palette.ask_ai_title'),
      subtitle: t('palette.ask_ai_subtitle'),
      icon: <Brain size={16} strokeWidth={3} className="text-accent-orange" />,
      onSelect: handleAsk,
    },
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

  const results = searchResults.map((r) => ({
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
  }))

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
