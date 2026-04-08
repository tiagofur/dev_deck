import {
  BookOpen,
  Box,
  FileText,
  Github,
  Keyboard,
  Link as LinkIcon,
  Play,
  Puzzle,
  Sparkles,
  StickyNote,
  Terminal,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Item, ItemType } from '@devdeck/api-client'
import { formatCount } from '@devdeck/api-client'
import { TagChip, hashIndex } from '@devdeck/ui'

// Ola 5 Fase 17 — card adaptado por tipo para el nuevo modelo de Items.
// Keeps the neo-brutalist personality of <RepoCard> but swaps the
// accent color, icon, and hero line based on item_type so the grid is
// scannable when the user has 400 mixed items.

interface Props {
  item: Item
  onClick?: () => void
}

// ─── Per-type styling ───
//
// The `hue` drives the top ribbon. It's one of the existing Tailwind
// tokens so we don't grow the design system palette.
interface TypeStyle {
  hue: string // background class for the top ribbon
  icon: LucideIcon
  label: string
}

const typeStyles: Record<ItemType, TypeStyle> = {
  repo: { hue: 'bg-accent-lavender', icon: Github, label: 'REPO' },
  cli: { hue: 'bg-accent-lime', icon: Terminal, label: 'CLI' },
  plugin: { hue: 'bg-accent-pink', icon: Puzzle, label: 'PLUGIN' },
  shortcut: { hue: 'bg-accent-yellow', icon: Keyboard, label: 'SHORTCUT' },
  snippet: { hue: 'bg-accent-cyan', icon: FileText, label: 'SNIPPET' },
  agent: { hue: 'bg-accent-orange', icon: Sparkles, label: 'AGENT' },
  prompt: { hue: 'bg-accent-orange', icon: Sparkles, label: 'PROMPT' },
  article: { hue: 'bg-accent-cyan', icon: BookOpen, label: 'ARTICLE' },
  tool: { hue: 'bg-accent-lavender', icon: Wrench, label: 'TOOL' },
  workflow: { hue: 'bg-accent-lime', icon: Play, label: 'WORKFLOW' },
  note: { hue: 'bg-bg-elevated', icon: StickyNote, label: 'NOTE' },
}

function styleFor(type: ItemType): TypeStyle {
  return typeStyles[type] ?? { hue: 'bg-bg-elevated', icon: Box, label: String(type).toUpperCase() }
}

export function ItemCard({ item, onClick }: Props) {
  const { hue, icon: Icon, label } = styleFor(item.item_type)

  // Tiny deterministic rotation for personality (-1°, 0°, +1°).
  const rotation = (item.id.charCodeAt(0) % 3) - 1

  const stars = typeof item.meta?.stars === 'number' ? (item.meta.stars as number) : 0
  const language = typeof item.meta?.language === 'string' ? (item.meta.language as string) : null
  const languageColor =
    typeof item.meta?.language_color === 'string' ? (item.meta.language_color as string) : null

  return (
    <article
      onClick={onClick}
      className="group bg-bg-card border-3 border-ink shadow-hard cursor-pointer
                 transition-all duration-150 ease-out
                 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                 overflow-hidden"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Type ribbon */}
      <header className={`${hue} border-b-3 border-ink px-3 py-1.5 flex items-center gap-2`}>
        <Icon size={14} strokeWidth={3} />
        <span className="text-[10px] font-display font-black tracking-wider">{label}</span>
      </header>

      <div className="p-4">
        <h3 className="font-display font-bold text-lg leading-tight line-clamp-2 mb-1">
          {item.title || '(sin título)'}
        </h3>

        {item.description && (
          <p className="text-sm text-ink-soft line-clamp-2 mb-3">{item.description}</p>
        )}

        {item.why_saved && (
          <p className="text-xs font-mono text-ink-soft italic mb-3 border-l-2 border-ink pl-2">
            {truncate(item.why_saved, 90)}
          </p>
        )}

        {/* Type-specific metadata row */}
        {item.item_type === 'repo' && (language || stars > 0) && (
          <div className="flex items-center gap-3 text-xs font-mono mb-3">
            {language && (
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 border border-ink"
                  style={{ backgroundColor: languageColor || '#888' }}
                />
                {language}
              </span>
            )}
            {stars > 0 && (
              <span>★ {formatCount(stars)}</span>
            )}
          </div>
        )}

        {item.url && (
          <p className="text-xs font-mono text-ink-soft truncate mb-3 flex items-center gap-1">
            <LinkIcon size={10} strokeWidth={3} />
            {prettyURL(item.url)}
          </p>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 5).map((t) => (
              <TagChip key={t} label={t} colorIndex={hashIndex(t)} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

function prettyURL(url: string): string {
  try {
    const u = new URL(url)
    return (u.hostname + u.pathname).replace(/^www\./, '').replace(/\/+$/, '')
  } catch {
    return url
  }
}
