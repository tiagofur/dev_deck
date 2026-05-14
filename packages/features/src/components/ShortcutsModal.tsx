import { AnimatePresence, motion } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
}

const shortcuts: Shortcut[] = [
  { keys: ['Cmd', 'K'], description: 'Búsqueda global' },
  { keys: ['Cmd', 'N'], description: 'Nuevo item' },
  { keys: ['Cmd', 'L'], description: 'Ir a items (buscar)' },
  { keys: ['Cmd', '/'], description: 'Mostrar atajos' },
  { keys: ['Cmd', 'D'], description: 'Toggle favorito (detail)' },
  { keys: ['Esc'], description: 'Cerrar modales' },
  { keys: ['Enter'], description: 'Confirmar' },
]

export function ShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6
                     bg-accent-cyan/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-card border-5 border-ink shadow-hard-xl p-7 max-w-md w-full"
          >
            <header className="flex items-center justify-between mb-5">
              <h2 className="font-display font-black text-2xl uppercase flex items-center gap-2">
                <Keyboard size={22} strokeWidth={3} />
                Atajos
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="border-3 border-ink p-1 hover:bg-accent-pink transition-colors"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </header>

            <ul className="space-y-3">
              {shortcuts.map((s) => (
                <li
                  key={s.description}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="font-mono text-sm">{s.description}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="font-mono text-xs text-ink-soft">+</span>}
                        <kbd className="px-2 py-0.5 bg-bg-elevated border-2 border-ink shadow-hard-sm font-mono text-xs font-bold">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs font-mono text-ink-soft text-center italic">
              En Mac: Cmd en lugar de Ctrl
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
