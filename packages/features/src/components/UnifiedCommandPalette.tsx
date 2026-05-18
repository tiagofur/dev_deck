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
} from 'lucide-react'
import { AgentChat } from './AgentChat'

interface Props {
  open: boolean
  onClose: () => void
}

export function UnifiedCommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [mode, setMode] = React.useState<'command' | 'ask'>('command')
  
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

  const actions = [
    {
      id: 'ask',
      title: 'Preguntar a la IA (RAG)',
      subtitle: 'Busca en tu vault y responde con citas',
      icon: <Brain size={16} strokeWidth={3} className="text-accent-orange" />,
      onSelect: handleAsk,
    },
    {
      id: 'capture',
      title: 'Capturar nuevo item',
      subtitle: 'URL, comando, nota o snippet',
      icon: <Plus size={16} strokeWidth={3} className="text-accent-lime" />,
      onSelect: () => {
        onClose()
        // Parent will open capture modal or we can trigger it here
        window.dispatchEvent(new CustomEvent('devdeck:open-capture'))
      },
    },
    {
      id: 'go-items',
      title: 'Ir a mis Items',
      subtitle: 'Ver todo el vault polimórfico',
      icon: <Box size={16} strokeWidth={3} className="text-accent-lavender" />,
      onSelect: () => {
        onClose()
        navigate('/items')
      },
    },
    {
      id: 'go-cheatsheets',
      title: 'Ver Cheatsheets',
      subtitle: 'Tus chuletas y guías rápidas',
      icon: <BookOpen size={16} strokeWidth={3} className="text-accent-cyan" />,
      onSelect: () => {
        onClose()
        navigate('/cheatsheets')
      },
    },
  ]

  const results = searchResults.map((r) => ({
    id: `${r.type}-${r.id}`,
    type: r.type,
    title: r.title,
    subtitle: r.curator_name ? `@${r.curator_name} · ${r.subtitle}` : r.subtitle,
    icon: r.type === 'item' ? <Box size={14} /> : <BookOpen size={14} />,
    onSelect: () => {
      onClose()
      if (r.type === 'item') navigate(`/items/${r.id}`)
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
      renderCustom={mode === 'ask' ? (
        <div className="overflow-hidden bg-bg-card">
          <div className="flex items-center justify-between p-4 border-b-3 border-ink">
            <h3 className="font-display font-black text-sm uppercase flex items-center gap-2">
              <Brain size={16} strokeWidth={3} className="text-accent-orange" />
              Agente de Conocimiento
            </h3>
            <button 
              onClick={() => { setMode('command'); }}
              className="text-xs font-mono text-ink-soft hover:text-ink"
            >
              [volver]
            </button>
          </div>
          <AgentChat initialQuery={query} />
        </div>
      ) : null}
      />

  )
}
