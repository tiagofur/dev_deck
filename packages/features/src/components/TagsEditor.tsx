import { KeyboardEvent, useMemo, useState } from 'react'
import { Plus, X, Sparkles, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useUserTags } from '@devdeck/api-client'
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
  /** If true, shows AI tag badge (✨) instead of edit mode */
  isAITags?: boolean
  /** Callback when user wants to review AI suggestions (for AI tags mode) */
  onReview?: () => void
}

/**
 * Inline tag editor with autocomplete. Supports:
 * - Manual tags: editable chips with remove button
 * - AI tags: read-only chips with ✨ badge and review action
 */
export function TagsEditor({ value, onChange, saving, isAITags, onReview }: Props) {
  const [draft, setDraft] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const { data: userTags = [] } = useUserTags()

  // Filter suggestions: exclude tags already in value, match prefix
  const suggestions = useMemo(() => {
    if (!draft) return userTags.slice(0, 10)
    const lower = draft.toLowerCase()
    return userTags
      .filter((t) => !value.includes(t) && t.includes(lower))
      .slice(0, 8)
  }, [userTags, draft, value])

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
      if (showDropdown && suggestions.length > 0) {
        // Select first suggestion
        void addTag(suggestions[0])
      } else {
        void addTag(draft)
      }
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0 && !isAITags) {
      void removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    } else if (e.key === 'ArrowDown') {
      setShowDropdown(true)
    }
  }

  // AI tags mode: read-only display with review button
  if (isAITags) {
    return (
      <div className="bg-bg-card border-3 border-ink shadow-hard p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-accent-yellow" />
          <h3 className="font-display font-black uppercase text-sm tracking-widest">
            Sugerencias IA
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {value.length === 0 && (
            <p className="font-mono text-sm text-ink-soft italic">
              — sin sugerencias —
            </p>
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
                <Sparkles size={10} className="text-accent-yellow" />
                {tag}
              </span>
            )
          })}
        </div>

        {onReview && (
          <button
            type="button"
            onClick={onReview}
            disabled={saving || value.length === 0}
            className="text-xs font-mono text-accent-pink hover:underline"
          >
            Revisar sugerencias →
          </button>
        )}
      </div>
    )
  }

  // Manual tags mode with autocomplete
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

      <div className="relative">
        <div className="flex items-center gap-2">
          <Plus size={16} strokeWidth={3} className="shrink-0" />
          <input
            type="text"
            placeholder="agregar tag (Enter)"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setShowDropdown(true)
            }}
            onKeyDown={onKey}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            disabled={saving}
            className="flex-1 border-2 border-ink px-2 py-1 font-mono text-sm
                       focus:outline-none focus:bg-accent-yellow/10"
          />
          <ChevronDown
            size={14}
            className={clsx(
              'shrink-0 transition-transform',
              showDropdown && 'rotate-180',
            )}
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-bg-card border-2 border-ink shadow-hard max-h-40 overflow-y-auto">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="w-full px-2 py-1.5 text-left font-mono text-sm hover:bg-accent-yellow/40 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}