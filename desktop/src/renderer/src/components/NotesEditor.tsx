import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Edit3, Eye, Save, X } from 'lucide-react'
import { Button } from './Button'

interface Props {
  value: string
  onSave: (next: string) => Promise<void> | void
  saving?: boolean
}

/**
 * Markdown editor with view/edit toggle.
 * - View mode renders the markdown with react-markdown.
 * - Edit mode shows a textarea + Save/Cancel.
 */
export function NotesEditor({ value, onSave, saving }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draft, setDraft] = useState(value)

  // Sync draft when external value changes (e.g., refetch)
  useEffect(() => {
    if (mode === 'view') setDraft(value)
  }, [value, mode])

  async function save() {
    await onSave(draft)
    setMode('view')
  }

  function cancel() {
    setDraft(value)
    setMode('view')
  }

  if (mode === 'edit') {
    return (
      <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-black uppercase text-sm tracking-widest">
            Editando notas
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={cancel}
              disabled={saving}
            >
              <span className="flex items-center gap-1.5">
                <X size={14} strokeWidth={3} />
                Cancelar
              </span>
            </Button>
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={save}
              disabled={saving}
            >
              <span className="flex items-center gap-1.5">
                <Save size={14} strokeWidth={3} />
                {saving ? 'Guardando…' : 'Guardar'}
              </span>
            </Button>
          </div>
        </div>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          placeholder="Escribí tus notas en markdown…&#10;&#10;Tip: # heading, **bold**, `code`, - lista"
          className="w-full border-2 border-ink p-3 font-mono text-sm
                     focus:outline-none focus:bg-accent-yellow/10 resize-y"
        />
      </div>
    )
  }

  // View mode
  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-black uppercase text-sm tracking-widest">
          Notas
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setMode('edit')}
        >
          <span className="flex items-center gap-1.5">
            <Edit3 size={14} strokeWidth={3} />
            Editar
          </span>
        </Button>
      </div>
      {value.trim() ? (
        <div className="markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        </div>
      ) : (
        <button
          onClick={() => setMode('edit')}
          className="w-full text-left font-mono text-sm text-ink-soft italic
                     border-2 border-dashed border-ink/30 p-4 hover:bg-accent-yellow/10"
        >
          <Eye size={14} className="inline mr-2" strokeWidth={2.5} />
          Sin notas. Click para empezar a escribir.
        </button>
      )}
    </div>
  )
}
