import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useAddRepo } from '../features/repos/api'

interface Props {
  open: boolean
  onClose: () => void
}

export function AddRepoModal({ open, onClose }: Props) {
  const [url, setUrl] = useState('')
  const addRepo = useAddRepo()

  // Reset state every time the modal opens, and listen for ESC to close.
  useEffect(() => {
    if (!open) {
      setUrl('')
      addRepo.reset()
      return
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    try {
      await addRepo.mutateAsync({ url: trimmed })
      onClose()
    } catch {
      /* Error is shown inline below */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6
                 bg-accent-yellow/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl p-8 w-full max-w-xl"
      >
        <header className="flex items-center justify-between mb-6">
          <h2 className="font-display font-black text-3xl uppercase">
            Pegá el link ↓
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="border-3 border-ink p-1 hover:bg-accent-pink transition-colors"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </header>

        <input
          autoFocus
          type="url"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border-3 border-ink p-3 font-mono text-base
                     focus:outline-none focus:bg-accent-yellow/20"
        />

        <p className="mt-2 text-xs font-mono text-ink-soft">
          Tip: cualquier URL sirve. Los repos de GitHub traen stars, lenguaje y avatar automágicamente.
        </p>

        {addRepo.error && (
          <div className="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm">
            {(addRepo.error as Error).message}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={addRepo.isPending || !url.trim()}>
            {addRepo.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
