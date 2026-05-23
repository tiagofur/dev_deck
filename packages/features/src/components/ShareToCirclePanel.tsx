import { useState } from 'react'
import { Share2, X } from 'lucide-react'
import { Button } from '@devdeck/ui'
import type { Circle } from '@devdeck/api-client'

interface ShareToCirclePanelProps {
  circles: Circle[]
  isSharing?: boolean
  title?: string
  description?: string
  submitLabel?: string
  requireContext?: boolean
  onClose: () => void
  onShare: (input: { circleId: string; circleName: string; context: string }) => Promise<void> | void
}

export function ShareToCirclePanel({
  circles,
  isSharing = false,
  title = 'Share to Circle',
  description = 'Add context so the group knows why this is useful.',
  submitLabel = 'Share',
  requireContext = true,
  onClose,
  onShare,
}: ShareToCirclePanelProps) {
  const [circleId, setCircleId] = useState('')
  const [context, setContext] = useState('')

  const selectedCircle = circles.find((circle) => circle.id === circleId)
  const canSubmit = !!selectedCircle && (!requireContext || context.trim().length > 0) && !isSharing

  async function submit() {
    if (!selectedCircle || !canSubmit) return
    await onShare({
      circleId: selectedCircle.id,
      circleName: selectedCircle.name,
      context: context.trim(),
    })
  }

  return (
    <div className="grid gap-3 border-3 border-ink bg-bg-elevated p-4 shadow-hard-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-black uppercase">{title}</h3>
          <p className="mt-1 font-mono text-xs text-ink-soft">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border-2 border-ink bg-bg-card p-1 hover:bg-accent-pink"
          aria-label="Close Circle share"
        >
          <X size={14} strokeWidth={3} />
        </button>
      </div>

      <label className="grid gap-2">
        <span className="font-display text-xs font-black uppercase tracking-widest">Circle</span>
        <select
          value={circleId}
          onChange={(event) => setCircleId(event.target.value)}
          className="border-3 border-ink bg-bg-primary p-2 font-mono text-sm outline-none focus:bg-accent-yellow/10"
        >
          <option value="">Choose a Circle</option>
          {circles.map((circle) => (
            <option key={circle.id} value={circle.id}>
              {circle.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="font-display text-xs font-black uppercase tracking-widest">Why this matters</span>
        <textarea
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="Example: useful for debugging JWT auth in our API workshop."
          className="min-h-32 w-full resize-y border-3 border-ink bg-bg-primary p-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
        />
      </label>

      <Button type="button" size="sm" onClick={submit} disabled={!canSubmit}>
        <span className="flex items-center gap-2">
          <Share2 size={15} strokeWidth={3} />
          {submitLabel}
        </span>
      </Button>
    </div>
  )
}
