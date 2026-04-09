import { useEffect, useMemo, useState } from 'react'
import { Check, Package, X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import type { PackageScript } from '@devdeck/api-client'

interface Props {
  open: boolean
  scripts: PackageScript[]
  loading?: boolean
  saving?: boolean
  errorMessage?: string | null
  onClose: () => void
  onImport: (scripts: PackageScript[]) => void
}

export function ImportScriptsModal({
  open,
  scripts,
  loading,
  saving,
  errorMessage,
  onClose,
  onImport,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  // Pre-select all scripts when they load.
  useEffect(() => {
    if (open && scripts.length > 0) {
      setSelected(new Set(scripts.map((s) => s.name)))
    }
  }, [open, scripts])

  // ESC to close.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Sort scripts alphabetically for easier scanning.
  // MUST be above the early return — React requires all hooks to run
  // in the same order on every render (Rules of Hooks).
  const sorted = useMemo(
    () => [...scripts].sort((a, b) => a.name.localeCompare(b.name)),
    [scripts],
  )

  if (!open) return null

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === scripts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(scripts.map((s) => s.name)))
    }
  }

  function handleImport() {
    const picked = scripts.filter((s) => selected.has(s.name))
    if (picked.length === 0) return
    onImport(picked)
  }

  // guessCategory is a pure function — no hooks involved, safe here.

  // Try to guess a category from the script name.
  function guessCategory(name: string): string | undefined {
    const lower = name.toLowerCase()
    if (lower === 'install' || lower === 'postinstall' || lower === 'preinstall') return 'install'
    if (lower.startsWith('dev') || lower === 'start' || lower === 'serve') return 'dev'
    if (lower.includes('test') || lower.includes('spec')) return 'test'
    if (lower.includes('build') || lower.includes('compile')) return 'build'
    if (lower.includes('deploy') || lower.includes('release') || lower.includes('publish')) return 'deploy'
    if (lower.includes('lint') || lower.includes('format') || lower.includes('prettier') || lower.includes('eslint')) return 'lint'
    if (lower.includes('db') || lower.includes('migrate') || lower.includes('seed')) return 'db'
    return undefined
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6
                 bg-accent-yellow/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-2xl
                   max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <header className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-3 border-ink bg-accent-lime flex items-center justify-center">
              <Package size={20} strokeWidth={3} />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl uppercase">
                Importar scripts
              </h2>
              <p className="font-mono text-xs text-ink-soft">
                {loading ? 'Buscando package.json...' : `${scripts.length} scripts encontrados`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="border-3 border-ink p-1 hover:bg-accent-pink"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-ink border-t-accent-yellow animate-spin" />
              <p className="font-mono text-sm text-ink-soft">
                Descargando package.json de GitHub...
              </p>
            </div>
          </div>
        ) : scripts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="w-14 h-14 border-3 border-ink bg-bg-elevated flex items-center justify-center">
                <Package size={28} strokeWidth={2.5} className="text-ink-soft" />
              </div>
              <p className="font-display font-bold text-lg uppercase">
                Sin scripts
              </p>
              <p className="font-mono text-sm text-ink-soft max-w-sm">
                {errorMessage
                  ? errorMessage
                  : 'Este repo no tiene un package.json o no contiene scripts.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Controls bar */}
            <div className="flex items-center justify-between mb-3 shrink-0 border-b-2 border-ink/10 pb-3">
              <button
                type="button"
                onClick={toggleAll}
                className="font-display font-bold text-sm uppercase tracking-wide
                           flex items-center gap-2 hover:text-accent-pink transition-colors"
              >
                <span
                  className={`w-5 h-5 border-3 border-ink flex items-center justify-center text-xs
                    ${selected.size === scripts.length ? 'bg-accent-pink' : 'bg-bg-card'}`}
                >
                  {selected.size === scripts.length && <Check size={12} strokeWidth={4} />}
                </span>
                {selected.size === scripts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              <span className="font-mono text-xs text-ink-soft">
                {selected.size} de {scripts.length} seleccionados
              </span>
            </div>

            {/* Scripts list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {sorted.map((script) => {
                const isSelected = selected.has(script.name)
                const cat = guessCategory(script.name)
                return (
                  <label
                    key={script.name}
                    className={`flex items-start gap-3 p-3 border-3 border-ink cursor-pointer
                               transition-all duration-100
                               ${isSelected
                                 ? 'bg-accent-lime/20 shadow-hard-sm'
                                 : 'bg-bg-card hover:bg-bg-elevated'
                               }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(script.name)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 w-5 h-5 shrink-0 border-3 border-ink flex items-center justify-center text-xs
                        ${isSelected ? 'bg-accent-pink' : 'bg-bg-card'}`}
                    >
                      {isSelected && <Check size={12} strokeWidth={4} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-bold text-sm uppercase truncate">
                          {script.name}
                        </span>
                        {cat && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border-2 border-ink bg-accent-yellow">
                            {cat}
                          </span>
                        )}
                      </div>
                      <code className="block bg-ink text-bg-primary font-mono text-xs px-2 py-1 overflow-x-auto whitespace-nowrap">
                        {script.command}
                      </code>
                    </div>
                  </label>
                )
              })}
            </div>
          </>
        )}

        {errorMessage && scripts.length > 0 && (
          <div className="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm shrink-0">
            {errorMessage}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between shrink-0 pt-4 border-t-3 border-ink">
          <p className="font-mono text-xs text-ink-soft">
            {scripts.length > 0
              ? 'Cada script se crea como un comando con categoría automática.'
              : ''}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {scripts.length === 0 ? 'Cerrar' : 'Cancelar'}
            </Button>
            {scripts.length > 0 && (
              <Button
                type="button"
                disabled={saving || selected.size === 0}
                onClick={handleImport}
              >
                {saving
                  ? 'Importando...'
                  : `Importar ${selected.size} ${selected.size === 1 ? 'script' : 'scripts'}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
