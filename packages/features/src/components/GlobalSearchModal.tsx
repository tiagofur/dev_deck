import { BookOpen, Boxes, Code2, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '@devdeck/api-client'
import type { SearchResult } from '@devdeck/api-client'

interface Props {
  open: boolean
  onClose: () => void
}

export function GlobalSearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'text' | 'semantic' | 'hybrid'>('text')
  const { data: results = [], isLoading } = useGlobalSearch(query, mode)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function selectResult(r: SearchResult) {
    onClose()
    if (r.type === 'item') navigate(`/items/${r.id}`)
    else if (r.type === 'repo') navigate(`/repo/${r.id}`)
    else if (r.type === 'cheatsheet') navigate(`/cheatsheets/${r.id}`)
    // entries navigate to their parent cheatsheet (we don't have cheatsheet id in SearchResult)
  }

  // Group results by type.
  const items = results.filter((r) => r.type === 'item')
  const repos = results.filter((r) => r.type === 'repo')
  const cheats = results.filter((r) => r.type === 'cheatsheet')
  const entries = results.filter((r) => r.type === 'entry')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-6
                    bg-ink/40 backdrop-blur-sm"
         onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl w-full max-w-2xl
                   max-h-[60vh] flex flex-col"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b-3 border-ink shrink-0">
          <Search size={20} strokeWidth={3} className="text-ink-soft shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar items, repos, cheatsheets, comandos…"
            className="flex-1 font-mono text-sm bg-transparent focus:outline-none"
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-ink border-t-accent-yellow animate-spin" />
          )}
          <button onClick={onClose} className="border-2 border-ink p-1 hover:bg-accent-pink">
            <X size={14} strokeWidth={3} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-2 p-3 bg-bg-elevated border-b-3 border-ink overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-mono uppercase font-bold text-ink-soft ml-1 mr-2">Modo:</span>
          <ModeButton 
            active={mode === 'text'} 
            onClick={() => setMode('text')} 
            label="Texto" 
            title="Búsqueda clásica por palabras clave"
          />
          <ModeButton 
            active={mode === 'semantic'} 
            onClick={() => setMode('semantic')} 
            label="IA (Semántica)" 
            title="Busca por significado usando embeddings"
          />
          <ModeButton 
            active={mode === 'hybrid'} 
            onClick={() => setMode('hybrid')} 
            label="Híbrida" 
            title="Combina texto + IA para mejores resultados"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {query.length < 2 ? (
            <div className="p-8 text-center font-mono text-sm text-ink-soft">
              Escribí al menos 2 caracteres para buscar…
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="p-8 text-center font-mono text-sm text-ink-soft">
              No hay resultados para "{query}"
            </div>
          ) : (
            <div className="py-2">
              {items.length > 0 && (
                <ResultGroup icon={<Boxes size={14} strokeWidth={3} />} label="Items" items={items} onSelect={selectResult} />
              )}
              {repos.length > 0 && (
                <ResultGroup icon={<Code2 size={14} strokeWidth={3} />} label="Repos" items={repos} onSelect={selectResult} />
              )}
              {cheats.length > 0 && (
                <ResultGroup icon={<BookOpen size={14} strokeWidth={3} />} label="Cheatsheets" items={cheats} onSelect={selectResult} />
              )}
              {entries.length > 0 && (
                <ResultGroup icon={<Code2 size={14} strokeWidth={3} />} label="Commands" items={entries} onSelect={selectResult} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultGroup({
  icon,
  label,
  items,
  onSelect,
}: {
  icon: React.ReactNode
  label: string
  items: SearchResult[]
  onSelect: (r: SearchResult) => void
}) {
  return (
    <div className="mb-2">
      <div className="px-4 py-1.5 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-ink-soft bg-bg-elevated">
        {icon}
        {label}
      </div>
      {items.map((r) => (
        <button
          key={`${r.type}-${r.id}`}
          onClick={() => onSelect(r)}
          className="w-full text-left px-4 py-3 flex items-start gap-3
                     hover:bg-accent-yellow/20 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm uppercase truncate">{r.title}</p>
            <p className="font-mono text-xs text-ink-soft truncate">{r.subtitle}</p>
          </div>
          {r.extra && (
            <code className="text-[10px] font-mono bg-ink text-bg-primary px-2 py-0.5 truncate max-w-[200px]">
              {r.extra}
            </code>
          )}
        </button>
      ))}
    </div>
  )
}

function ModeButton({ 
  active, 
  onClick, 
  label, 
  title 
}: { 
  active: boolean
  onClick: () => void
  label: string
  title?: string 
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-1 text-[10px] font-mono uppercase font-bold border-2 border-ink transition-all
        ${active 
          ? 'bg-accent-yellow shadow-hard-sm translate-x-[-1px] translate-y-[-1px]' 
          : 'bg-bg-card hover:bg-bg-elevated'
        }`}
    >
      {label}
    </button>
  )
}
