import * as React from 'react'
import { Command } from 'cmdk'
import {
  Search,
  Plus,
  Box,
  Brain,
  X,
  Sparkles,
  BookOpen,
  Settings,
  History,
  ArrowRight,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface Action {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  shortcut?: string[]
  onSelect: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  query: string
  onQueryChange: (q: string) => void
  actions: Action[]
  results?: Array<{
    id: string
    type: string
    title: string
    subtitle?: string
    icon: React.ReactNode
    onSelect: () => void
  }>
  isLoading?: boolean
  renderCustom?: React.ReactNode
}

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  actions,
  results = [],
  isLoading,
  renderCustom,
}: Props) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        // Toggle is handled by parent, but Esc should work
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative bg-bg-card border-5 border-ink shadow-hard-xl w-full max-w-2xl overflow-hidden flex flex-col"
          >
            <Command
              className="flex flex-col h-full"
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
              }}
            >
              <div className="flex items-center gap-3 p-4 border-b-3 border-ink shrink-0">
                <Search size={20} strokeWidth={3} className="text-ink-soft shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={onQueryChange}
                  placeholder="Buscá o tirá un comando… (Cmd+K)"
                  className="flex-1 font-mono text-sm bg-transparent focus:outline-none"
                  autoFocus
                />
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-ink border-t-accent-yellow animate-spin" />
                )}
                <div className="flex items-center gap-1.5 px-2 py-0.5 border-2 border-ink bg-bg-elevated font-mono text-[10px] text-ink-soft">
                  ESC
                </div>
              </div>

              <Command.List className="flex-1 overflow-y-auto max-h-[50vh] p-2 scrollbar-thin">
                <Command.Empty className="p-8 text-center font-mono text-sm text-ink-soft">
                  {query.length > 0 ? `No hay resultados para "${query}"` : 'Empezá a escribir…'}
                </Command.Empty>

                {renderCustom}

                {!renderCustom && (
                  <>
                    <Command.Group heading="Acciones" className="p-2">
                      <div className="flex flex-col gap-1">
                        {actions.map((action) => (
                          <Item key={action.id} onSelect={action.onSelect}>
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 border-2 border-ink bg-bg-elevated">
                                {action.icon}
                              </div>
                              <div className="flex-1">
                                <p className="font-display font-bold text-xs uppercase tracking-tight">
                                  {action.title}
                                </p>
                                {action.subtitle && (
                                  <p className="font-mono text-[10px] text-ink-soft">
                                    {action.subtitle}
                                  </p>
                                )}
                              </div>
                              {action.shortcut && (
                                <div className="flex gap-1">
                                  {action.shortcut.map((s) => (
                                    <kbd
                                      key={s}
                                      className="px-1.5 py-0.5 border-2 border-ink bg-bg-elevated font-mono text-[9px] uppercase"
                                    >
                                      {s}
                                    </kbd>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Item>
                        ))}
                      </div>
                    </Command.Group>

                    {results.length > 0 && (
                      <Command.Group heading="Resultados" className="p-2 border-t-2 border-ink/10 mt-2">
                        <div className="flex flex-col gap-1">
                          {results.map((result) => (
                            <Item key={result.id} onSelect={result.onSelect}>
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-accent-yellow/10">
                                  {result.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-display font-bold text-xs uppercase truncate">
                                    {result.title}
                                  </p>
                                  {result.subtitle && (
                                    <p className="font-mono text-[10px] text-ink-soft truncate">
                                      {result.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="opacity-0 group-aria-selected:opacity-100 transition-opacity">
                                  <ArrowRight size={12} strokeWidth={3} />
                                </div>
                              </div>
                            </Item>
                          ))}
                        </div>
                      </Command.Group>
                    )}
                  </>
                )}
              </Command.List>

              <div className="flex items-center justify-between p-3 border-t-3 border-ink bg-bg-elevated shrink-0">
                <div className="flex gap-4">
                  <Kbd label="↑↓" desc="Navegar" />
                  <Kbd label="Enter" desc="Seleccionar" />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-ink-soft">
                  <Brain size={12} />
                  DevDeck Brain v1.0
                </div>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="group w-full text-left px-3 py-2 cursor-pointer
                 aria-selected:bg-accent-yellow/20 transition-colors"
    >
      {children}
    </Command.Item>
  )
}

function Kbd({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 border-2 border-ink bg-bg-card shadow-hard-sm font-mono text-[9px]">
        {label}
      </kbd>
      <span className="text-[10px] font-mono text-ink-soft uppercase">{desc}</span>
    </div>
  )
}
