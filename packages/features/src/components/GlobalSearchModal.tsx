import { BookOpen, Boxes, Code2, Plus, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch, useSystemConfig } from '@devdeck/api-client'
import type { SearchResult } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'

interface Props {
  open: boolean
  onClose: () => void
}

export function GlobalSearchModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'text' | 'semantic' | 'hybrid'>('text')
  const { data: systemConfig } = useSystemConfig()
  const isAiDisabled = !systemConfig?.ai_provider || ['disabled', 'heuristic', 'local'].includes(systemConfig.ai_provider)
  const { data: results = [], isLoading } = useGlobalSearch(query, isAiDisabled ? 'text' : mode)
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

  function openCaptureInstead() {
    onClose()
    window.dispatchEvent(new CustomEvent('devdeck:open-capture'))
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
            placeholder={t('search.placeholder')}
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
        {!isAiDisabled && (
          <div className="flex items-center gap-2 p-3 bg-bg-elevated border-b-3 border-ink overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-mono uppercase font-bold text-ink-soft ml-1 mr-2">{t('items.type_filter')}:</span>
            <ModeButton 
              active={mode === 'text'} 
              onClick={() => setMode('text')} 
              label="Text" 
              title={t('search.classic_desc')}
            />
            <ModeButton 
              active={mode === 'semantic'} 
              onClick={() => setMode('semantic')} 
              label={t('search.ai_semantic')} 
              title="Search by meaning using embeddings"
            />
            <ModeButton 
              active={mode === 'hybrid'} 
              onClick={() => setMode('hybrid')} 
              label={t('search.hybrid')} 
              title="Combines text + AI for better results"
            />
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {query.length < 2 ? (
            <div className="p-8 text-center font-mono text-sm text-ink-soft">
              {t('search.min_chars')}
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="p-8 text-center">
              <p className="font-display text-lg font-black uppercase">{t('search.no_results_title')}</p>
              <p className="mx-auto mt-2 max-w-md font-mono text-sm text-ink-soft">
                {t('search.no_results_desc', { query })}
              </p>
              <button
                type="button"
                onClick={openCaptureInstead}
                className="mt-5 border-3 border-ink bg-accent-lime px-4 py-2 font-display font-bold uppercase shadow-hard"
              >
                <Plus size={16} strokeWidth={3} className="mr-2 inline-block" />
                {t('search.capture_instead')}
              </button>
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
