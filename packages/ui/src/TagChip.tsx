import clsx from 'clsx'

const tagColors = [
  'bg-accent-yellow',
  'bg-accent-cyan',
  'bg-accent-lime',
  'bg-accent-lavender',
  'bg-accent-orange',
] as const

interface Props {
  label: string
  /** Hash-stable index so the same tag always gets the same color */
  colorIndex?: number
  variant?: 'solid' | 'outline'
}

export function TagChip({ label, colorIndex = 0, variant = 'solid' }: Props) {
  const color = tagColors[Math.abs(colorIndex) % tagColors.length]
  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 text-xs font-mono font-semibold',
        'border-2 border-ink shadow-hard-sm',
        variant === 'solid' ? color : 'bg-transparent border-dashed',
      )}
    >
      {label}
    </span>
  )
}

/** Compute a stable color index from a string label so the palette is consistent. */
export function hashIndex(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
