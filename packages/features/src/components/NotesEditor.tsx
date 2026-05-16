import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Edit3, Eye, Save, Users, X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import { createRoom } from '@devdeck/realtime-client'

interface Props {
  value: string
  onSave: (next: string) => Promise<void> | void
  saving?: boolean
  roomID?: string
}

/**
 * Markdown editor with view/edit toggle.
 * - View mode renders the markdown with react-markdown.
 * - Edit mode shows a textarea + Save/Cancel.
 */
export function NotesEditor({ value, onSave, saving, roomID }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draft, setDraft] = useState(value)
  const [others, setOthers] = useState<number>(0)
  const yTextRef = useRef<any>(null)
  const roomRef = useRef<any>(null)

  // Sync draft when external value changes (e.g., refetch)
  useEffect(() => {
    if (mode === 'view') setDraft(value)
  }, [value, mode])

  // Real-time setup
  useEffect(() => {
    if (!roomID || mode !== 'edit') return

    const room = createRoom(roomID)
    roomRef.current = room
    const yText = room.getText('notes')
    yTextRef.current = yText

    // Initial load from Yjs if not empty, else use current draft
    if (yText.toString() === '' && draft !== '') {
      yText.insert(0, draft)
    } else if (yText.toString() !== '') {
      setDraft(yText.toString())
    }

    const observer = () => {
      setDraft(yText.toString())
    }
    yText.observe(observer)

    // Presence (Awareness)
    const awareness = room.provider.awareness
    const handleAwareness = () => {
      setOthers(awareness.getStates().size - 1)
    }
    awareness.on('change', handleAwareness)

    return () => {
      yText.unobserve(observer)
      awareness.off('change', handleAwareness)
      room.destroy()
    }
  }, [roomID, mode])

  function handleDraftChange(val: string) {
    setDraft(val)
    if (yTextRef.current) {
      const yText = yTextRef.current
      if (yText.toString() !== val) {
        yText.delete(0, yText.toString().length)
        yText.insert(0, val)
      }
    }
  }

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
          <div className="flex items-center gap-3">
            <h3 className="font-display font-black uppercase text-sm tracking-widest">
              Editando notas
            </h3>
            {others > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-accent-cyan border-2 border-ink font-mono text-[9px] uppercase font-bold animate-pulse">
                <Users size={10} strokeWidth={3} /> {others} {others === 1 ? 'otro' : 'otros'}
              </span>
            )}
          </div>
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
          onChange={(e) => handleDraftChange(e.target.value)}
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
