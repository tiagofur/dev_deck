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
import { AskResults } from './AskResults'

interface Props {
  open: boolean
  onClose: () => void
}

export function UnifiedCommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [mode, setMode] = React.useState<'command' | 'ask'>('command')
  
  const { data: searchResults = [], isLoading: searchLoading } = useGlobalSearch(query)
  const ask = useAsk()
  const [askResult, setAskResult] = React.useState<AskResponse | null>(null)

  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setMode('command')
      setAskResult(null)
    }
  }, [open])

  const handleAsk = async () => {
    if (!query) return
    setMode('ask')
    try {
      const res = await ask.mutateAsync({ question: query })
      setAskResult(res)
    } catch (e) {
      showToast((e as Error).message, 'error')
      setMode('command')
    }
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
    subtitle: r.subtitle,
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
      isLoading={searchLoading || ask.isPending}
      renderCustom={mode === 'ask' && askResult ? (
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-black text-sm uppercase flex items-center gap-2">
              <Brain size={16} strokeWidth={3} className="text-accent-orange" />
              Respuesta de DevDeck
            </h3>
            <button 
              onClick={() => { setMode('command'); setAskResult(null); }}
              className="text-xs font-mono text-ink-soft hover:text-ink"
            >
              [volver]
            </button>
          </div>
          <AskResults response={askResult} />
        </div>
      ) : null}
    />
  )
}
