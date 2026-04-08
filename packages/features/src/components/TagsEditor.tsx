import { KeyboardEvent, useState } from 'react'
import { Plus, X } from 'lucide-react'
import clsx from 'clsx'
import { hashIndex } from '@devdeck/ui'

const tagColors = [
  'bg-accent-yellow',
  'bg-accent-cyan',
  'bg-accent-lime',
  'bg-accent-lavender',
  'bg-accent-orange',
] as const

interface Props {
  value: string[]
  onChange: (next: string[]) => Promise<void> | void
  saving?: boolean
}

/**
 * Inline tag editor. Tags as removable chips, plus an input below
 * that commits on Enter or comma. Calls onChange with the full new array.
 */
export function TagsEditor({ value, onChange, saving }: Props) {
  const [draft, setDraft] = useState('')

  async function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || value.includes(t)) {
      setDraft('')
      return
    }
    await onChange([...value, t])
    setDraft('')
  }

  async function removeTag(tag: string) {
    await onChange(value.filter((t) => t !== tag))
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      void addTag(draft)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      void removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
      <h3 className="font-display font-black uppercase text-sm tracking-widest mb-3">
        Tags
      </h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {value.length === 0 && (
          <p className="font-mono text-sm text-ink-soft italic">— sin tags —</p>
        )}
        {value.map((tag) => {
          const color = tagColors[Math.abs(hashIndex(tag)) % tagColors.length]
          return (
            <span
              key={tag}
              className={clsx(
                'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-mono font-semibold',
                'border-2 border-ink shadow-hard-sm',
                color,
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={saving}
                aria-label={`Quitar ${tag}`}
                className="border-l-2 border-ink/40 ml-1 pl-1 hover:text-danger"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <Plus size={16} strokeWidth={3} className="shrink-0" />
        <input
          type="text"
          placeholder="agregar tag (Enter)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          disabled={saving}
          className="flex-1 border-2 border-ink px-2 py-1 font-mono text-sm
                     focus:outline-none focus:bg-accent-yellow/10"
        />
      </div>
    </div>
  )
}
