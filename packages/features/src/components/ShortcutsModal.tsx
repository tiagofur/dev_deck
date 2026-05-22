import { AnimatePresence, motion } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from '@devdeck/i18n'

interface Props {
  open: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
}

export function ShortcutsModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const [desktopStatus, setDesktopStatus] = useState<Record<string, { accelerator: string; registered: boolean }> | null>(null)
  const [desktopConfig, setDesktopConfig] = useState<{ enabled: boolean; search: string; add: string } | null>(null)
  const [savingDesktopConfig, setSavingDesktopConfig] = useState(false)

  const shortcuts: Shortcut[] = [
    { keys: ['Cmd', 'K'], description: t('shortcuts.global_search') },
    { keys: ['Cmd', 'N'], description: t('shortcuts.new_item') },
    { keys: ['Cmd', 'L'], description: t('shortcuts.go_items') },
    { keys: ['Cmd', '/'], description: t('shortcuts.show_shortcuts') },
    { keys: ['Cmd', 'D'], description: t('shortcuts.toggle_favorite') },
    { keys: ['Esc'], description: t('shortcuts.close_modals') },
    { keys: ['Enter'], description: t('shortcuts.confirm') },
  ]

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const api = (window as unknown as {
      electronAPI?: {
        shortcuts?: {
          getStatus: () => Promise<Record<string, { accelerator: string; registered: boolean }>>
          getConfig: () => Promise<{ enabled: boolean; search: string; add: string }>
          setConfig: (config: { enabled: boolean; search: string; add: string }) => Promise<{ enabled: boolean; search: string; add: string }>
          onStatus: (
            callback: (status: Record<string, { accelerator: string; registered: boolean }>) => void,
          ) => () => void
        }
      }
    }).electronAPI?.shortcuts
    if (!api) {
      setDesktopStatus(null)
      return
    }

    let cancelled = false
    api.getStatus().then((status) => {
      if (!cancelled) setDesktopStatus(status)
    })
    api.getConfig().then((config) => {
      if (!cancelled) setDesktopConfig(config)
    })
    const unsubscribe = api.onStatus((status) => setDesktopStatus(status))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [open])

  async function saveDesktopConfig(nextConfig: { enabled: boolean; search: string; add: string }) {
    const api = (window as unknown as {
      electronAPI?: {
        shortcuts?: {
          setConfig: (config: { enabled: boolean; search: string; add: string }) => Promise<{ enabled: boolean; search: string; add: string }>
        }
      }
    }).electronAPI?.shortcuts
    if (!api) return
    setSavingDesktopConfig(true)
    try {
      const saved = await api.setConfig(nextConfig)
      setDesktopConfig(saved)
    } finally {
      setSavingDesktopConfig(false)
    }
  }

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
                {t('shortcuts.title')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="border-3 border-ink p-1 hover:bg-accent-pink transition-colors"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </header>

            <ul className="space-y-3">
              {shortcuts.map((s, idx) => (
                <li
                  key={idx}
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
              {t('shortcuts.mac_hint')}
            </p>

            {desktopStatus && (
              <div className="mt-5 border-3 border-ink bg-bg-elevated p-3">
                <p className="mb-2 font-display text-xs font-black uppercase">
                  Desktop global shortcuts
                </p>
                {desktopConfig && (
                  <div className="mb-3 grid gap-2 border-b-2 border-ink pb-3">
                    <label className="flex items-center justify-between gap-3 font-mono text-xs">
                      <span>Enabled</span>
                      <input
                        type="checkbox"
                        checked={desktopConfig.enabled}
                        onChange={(event) => {
                          const next = { ...desktopConfig, enabled: event.target.checked }
                          setDesktopConfig(next)
                          void saveDesktopConfig(next)
                        }}
                      />
                    </label>
                    <label className="grid gap-1 font-mono text-xs">
                      <span>Palette shortcut</span>
                      <input
                        value={desktopConfig.search}
                        onChange={(event) => setDesktopConfig({ ...desktopConfig, search: event.target.value })}
                        onBlur={() => void saveDesktopConfig(desktopConfig)}
                        className="border-2 border-ink bg-bg-primary px-2 py-1 outline-none"
                      />
                    </label>
                    <label className="grid gap-1 font-mono text-xs">
                      <span>Capture shortcut</span>
                      <input
                        value={desktopConfig.add}
                        onChange={(event) => setDesktopConfig({ ...desktopConfig, add: event.target.value })}
                        onBlur={() => void saveDesktopConfig(desktopConfig)}
                        className="border-2 border-ink bg-bg-primary px-2 py-1 outline-none"
                      />
                    </label>
                    {savingDesktopConfig && (
                      <span className="font-mono text-[10px] text-ink-soft">Saving...</span>
                    )}
                  </div>
                )}
                <div className="grid gap-2">
                  {Object.entries(desktopStatus).map(([name, status]) => (
                    <div key={name} className="flex items-center justify-between gap-3 font-mono text-xs">
                      <span>{status.accelerator}</span>
                      <span className={status.registered ? 'text-accent-lime' : 'text-danger'}>
                        {status.registered ? 'registered' : 'conflict'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
