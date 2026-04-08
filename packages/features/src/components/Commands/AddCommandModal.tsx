import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import type {
  CommandCategory,
  CreateCommandInput,
  RepoCommand,
} from '@devdeck/api-client'

interface Props {
  open: boolean
  /** When set, the modal opens in "edit" mode pre-filled with this command. */
  editing?: RepoCommand | null
  saving?: boolean
  errorMessage?: string | null
  onClose: () => void
  onSubmit: (input: CreateCommandInput) => void
}

const categories: { value: CommandCategory; label: string }[] = [
  { value: 'install', label: 'install' },
  { value: 'dev', label: 'dev' },
  { value: 'test', label: 'test' },
  { value: 'build', label: 'build' },
  { value: 'deploy', label: 'deploy' },
  { value: 'lint', label: 'lint' },
  { value: 'db', label: 'db' },
  { value: 'other', label: 'other' },
]

export function AddCommandModal({
  open,
  editing,
  saving,
  errorMessage,
  onClose,
  onSubmit,
}: Props) {
  const [label, setLabel] = useState('')
  const [command, setCommand] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CommandCategory | ''>('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setLabel(editing.label)
      setCommand(editing.command)
      setDescription(editing.description)
      setCategory(editing.category ?? '')
    } else {
      setLabel('')
      setCommand('')
      setDescription('')
      setCategory('')
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, editing, onClose])

  if (!open) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!label.trim() || !command.trim()) return
    onSubmit({
      label: label.trim(),
      command: command.trim(),
      description: description.trim(),
      category: category || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6
                 bg-accent-cyan/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-xl"
      >
        <header className="flex items-center justify-between mb-5">
          <h2 className="font-display font-black text-2xl uppercase">
            {editing ? 'Editar comando' : 'Nuevo comando'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="border-3 border-ink p-1 hover:bg-accent-pink"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </header>

        <div className="space-y-4">
          <Field label="Label" hint="Cómo lo vas a recordar (ej: Dev server)">
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              placeholder="Dev server"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </Field>

          <Field label="Command" hint="El string que copiamos al clipboard">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              maxLength={500}
              placeholder="pnpm dev"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
            />
          </Field>

          <Field label="Descripción" hint="Opcional">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Levanta el server con HMR"
              className="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none"
            />
          </Field>

          <Field label="Categoría" hint="Opcional, ayuda a colorear">
            <div className="flex flex-wrap gap-2">
              <CategoryButton
                active={category === ''}
                onClick={() => setCategory('')}
                label="—"
              />
              {categories.map((c) => (
                <CategoryButton
                  key={c.value}
                  active={category === c.value}
                  onClick={() => setCategory(c.value)}
                  label={c.label}
                />
              ))}
            </div>
          </Field>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !label.trim() || !command.trim()}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block font-display font-bold text-xs uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-ink-soft font-mono mt-1">{hint}</p>
      )}
    </div>
  )
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs font-mono font-bold uppercase border-2 border-ink transition-colors ${
        active ? 'bg-accent-yellow shadow-hard-sm' : 'bg-bg-card hover:bg-bg-elevated'
      }`}
    >
      {label}
    </button>
  )
}
