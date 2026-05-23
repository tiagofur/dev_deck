import * as React from 'react'
import { Clipboard, Save, Share2 } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useCapture, useCircles, useShareToCircle } from '@devdeck/api-client'
import { ShareToCirclePanel } from '../ShareToCirclePanel'

export function ToolFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="border-b-3 border-ink bg-bg-elevated px-5 py-4">
        <h2 className="font-display text-2xl font-black uppercase">{title}</h2>
      </div>
      <div className="grid gap-5 p-5">{children}</div>
    </div>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <label className="grid gap-2">
      <span className="font-display text-xs font-black uppercase tracking-widest">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        className="min-h-48 w-full resize-y border-3 border-ink bg-bg-primary p-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
      />
    </label>
  )
}

export function ResultActions({
  output,
  title,
  itemType = 'snippet',
}: {
  output: string
  title: string
  itemType?: 'snippet' | 'note'
}) {
  const capture = useCapture()
  const { data: circles = [] } = useCircles()
  const shareToCircle = useShareToCircle()
  const [shareOpen, setShareOpen] = React.useState(false)

  async function copy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    showToast('Copied to clipboard', 'success')
  }

  async function save() {
    if (!output.trim()) return
    try {
      await capture.mutateAsync({
        source: 'manual',
        text: output,
        title_hint: title,
        type_hint: itemType,
        tags: ['workbench'],
        why_saved: 'Generated from DevDeck Workbench.',
      })
      showToast('Saved to your vault', 'success')
    } catch {
      showToast('Could not save output', 'error')
    }
  }

  async function share({ circleId, context }: { circleId: string; context: string }) {
    if (!output.trim()) return
    try {
      const captured = await capture.mutateAsync({
        source: 'manual',
        text: output,
        title_hint: title,
        type_hint: itemType,
        tags: ['workbench', 'circle-share'],
        why_saved: context,
      })
      const itemId = captured.item?.id || captured.duplicate_of
      if (!itemId) throw new Error('Could not capture output before sharing.')

      await shareToCircle.mutateAsync({ circleId, itemId })
      showToast('Shared to Circle', 'success')
      setShareOpen(false)
    } catch (err) {
      showToast((err as Error).message || 'Could not share output', 'error')
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <Button type="button" size="sm" variant="secondary" onClick={copy} disabled={!output}>
          <span className="flex items-center gap-2">
            <Clipboard size={15} strokeWidth={3} />
            Copy
          </span>
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!output || capture.isPending}>
          <span className="flex items-center gap-2">
            <Save size={15} strokeWidth={3} />
            Save output
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setShareOpen((open) => !open)}
          disabled={!output || circles.length === 0}
        >
          <span className="flex items-center gap-2">
            <Share2 size={15} strokeWidth={3} />
            Share to Circle
          </span>
        </Button>
      </div>

      {shareOpen && (
        <ShareToCirclePanel
          circles={circles}
          isSharing={capture.isPending || shareToCircle.isPending}
          title="Share output to Circle"
          submitLabel="Save and share"
          onClose={() => setShareOpen(false)}
          onShare={share}
        />
      )}
    </div>
  )
}
