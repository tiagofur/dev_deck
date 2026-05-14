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
  Star,
  Terminal,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Item, ItemType } from '@devdeck/api-client'
import { formatCount, EnrichmentStatus, useUpdateItem } from '@devdeck/api-client'
import { TagChip, hashIndex } from '@devdeck/ui'

interface TypeStyle {
  hue: string
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

interface Props {
  item: Item
  onClick?: () => void
}

export function ItemCard({ item, onClick }: Props) {
  const updateItem = useUpdateItem()
  const { hue, icon: Icon, label } = styleFor(item.item_type)

  async function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    await updateItem.mutateAsync({
      id: item.id,
      input: { is_favorite: !item.is_favorite },
    })
  }

  const rotation = (item.id.charCodeAt(0) % 3) - 1
  const stars = typeof item.meta?.stars === 'number' ? (item.meta.stars as number) : 0
  const language = typeof item.meta?.language === 'string' ? (item.meta.language as string) : null
  const languageColor = typeof item.meta?.language_color === 'string' ? (item.meta.language_color as string) : null
  const heroText = item.ai_summary || item.description
  const needsTeamReview = item.tags.includes('team-review')
  const visibleTags = (item.tags.length > 0 ? item.tags : item.ai_tags)
    .filter((tag) => tag !== 'team-review')
  const statusLabel = item.enrichment_status === EnrichmentStatus.Queued
    ? 'Analizando…'
    : item.enrichment_status === EnrichmentStatus.Error
      ? 'Análisis pendiente'
      : null

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
      <header className={`${hue} border-b-3 border-ink px-3 py-1.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon size={14} strokeWidth={3} />
          <span className="text-[10px] font-display font-black tracking-wider">{label}</span>
        </div>
        <button
          type="button"
          onClick={toggleFavorite}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={item.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Star
            size={14}
            strokeWidth={3}
            className={item.is_favorite ? 'fill-accent-yellow text-accent-yellow' : 'text-ink'}
          />
        </button>
      </header>

      <div className="p-4">
        <h3 className="font-display font-bold text-lg leading-tight line-clamp-2 mb-1">
          {item.title || '(sin título)'}
        </h3>

        {heroText && (
          <p className="text-sm text-ink-soft line-clamp-2 mb-3">{heroText}</p>
        )}

        {needsTeamReview && (
          <p className="inline-flex items-center gap-1.5 border-2 border-ink bg-accent-yellow px-2 py-0.5
                        text-[11px] font-mono font-bold uppercase mb-3">
            <Users size={12} strokeWidth={3} />
            Team review
          </p>
        )}

        {statusLabel && (
          <p className="text-[11px] font-mono uppercase tracking-wide mb-3 text-ink-soft">
            ✦ {statusLabel}
          </p>
        )}

        {item.why_saved && (
          <p className="text-xs font-mono text-ink-soft italic mb-3 border-l-2 border-ink pl-2">
            {truncate(item.why_saved, 90)}
          </p>
        )}

        {item.item_type === 'repo' && (language || stars > 0) && (
          <div className="flex items-center gap-3 text-xs font-mono mb-3">
            {language && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-ink" style={{ backgroundColor: languageColor || '#888' }} />
                {language}
              </span>
            )}
            {stars > 0 && <span>★ {formatCount(stars)}</span>}
          </div>
        )}

        {item.url && (
          <p className="text-xs font-mono text-ink-soft truncate mb-3 flex items-center gap-1">
            <LinkIcon size={10} strokeWidth={3} />
            {prettyURL(item.url)}
          </p>
        )}

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.slice(0, 5).map((t) => (
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
