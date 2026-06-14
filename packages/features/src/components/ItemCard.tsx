import { useState } from 'react'
import {
  BookOpen,
  Box,
  FileText,
  Github,
  Keyboard,
  Link as LinkIcon,
  Play,
  Puzzle,
  RefreshCw,
  Check,
  X,
  Sparkles,
  StickyNote,
  Star,
  Terminal,
  Users,
  Wrench,
  Share2,
  type LucideIcon,
} from 'lucide-react'
import type { Item, ItemType } from '@devdeck/api-client'
import {
  formatCount,
  EnrichmentStatus,
  useUpdateItem,
  useAIEnrichItem,
  useReviewItemAITags,
  useCircles,
  useShareToCircle,
} from '@devdeck/api-client'
import { TagChip, hashIndex, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { ShareToCirclePanel } from './ShareToCirclePanel'

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
  const { t } = useTranslation()
  const updateItem = useUpdateItem()
  const aiEnrich = useAIEnrichItem()
  const reviewAITags = useReviewItemAITags()
  const { hue, icon: Icon, label } = styleFor(item.item_type)

  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const { data: circles = [] } = useCircles()
  const shareToCircle = useShareToCircle()

  async function handleShare({ circleId, circleName, context }: { circleId: string; circleName: string; context: string }) {
    try {
      await shareToCircle.mutateAsync({ circleId, itemId: item.id, shareContext: context })
      showToast(t('card.shared_success', { name: circleName }))
      setShareMenuOpen(false)
    } catch (err) {
      showToast((err as Error).message || t('card.shared_error'), 'error')
    }
  }

  async function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    await updateItem.mutateAsync({
      id: item.id,
      input: { is_favorite: !item.is_favorite },
    })
  }

  async function handleAIEnrich(e: React.MouseEvent) {
    e.stopPropagation()
    await aiEnrich.mutateAsync(item.id)
  }

  async function acceptAITags(e: React.MouseEvent) {
    e.stopPropagation()
    await reviewAITags.mutateAsync({
      id: item.id,
      input: { ai_tags: item.ai_tags, apply: true },
    })
  }

  async function discardAITags(e: React.MouseEvent) {
    e.stopPropagation()
    await reviewAITags.mutateAsync({
      id: item.id,
      input: { ai_tags: [], apply: false },
    })
  }

  const rotation = (item.id.charCodeAt(0) % 3) - 1
  const stars = typeof item.meta?.stars === 'number' ? (item.meta.stars as number) : 0
  const language = typeof item.meta?.language === 'string' ? (item.meta.language as string) : null
  const languageColor = typeof item.meta?.language_color === 'string' ? (item.meta.language_color as string) : null
  const heroText = item.ai_summary || item.description
  const needsTeamReview = item.tags.includes('team-review')
  const hasManualTags = item.tags.length > 0
  const hasAITags = item.ai_tags.length > 0
  const showAIReview = !hasManualTags && hasAITags && item.enrichment_status === EnrichmentStatus.Ok

  const visibleTags = (hasManualTags ? item.tags : item.ai_tags)
    .filter((tag) => tag !== 'team-review')
  const statusLabel = item.enrichment_status === EnrichmentStatus.Queued
    ? t('card.analyzing')
    : item.enrichment_status === EnrichmentStatus.Error
      ? t('card.analysis_pending')
      : null

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={item.title || t('common.untitled')}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.()
        }
      }}
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
        <div className={`flex items-center gap-2 transition-opacity relative ${shareMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShareMenuOpen(!shareMenuOpen)
            }}
            title={t('card.share_tooltip')}
            aria-label={t('card.share_tooltip')}
          >
            <Share2
              size={14}
              strokeWidth={3}
              className={shareMenuOpen ? 'text-accent-pink' : 'text-ink'}
            />
          </button>

          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={item.is_favorite ? t('card.favorite_remove') : t('card.favorite_add')}
          >
            <Star
              size={14}
              strokeWidth={3}
              className={item.is_favorite ? 'fill-accent-yellow text-accent-yellow' : 'text-ink'}
            />
          </button>

          {shareMenuOpen && (
            <div
              role="presentation"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-6 z-30 w-72 font-mono text-[11px]"
            >
              {circles.length === 0 ? (
                <div className="bg-bg-card border-3 border-ink shadow-hard p-3 py-2 text-ink-soft text-center text-[10px]">
                  {t('card.no_circles')}
                </div>
              ) : (
                <ShareToCirclePanel
                  circles={circles}
                  isSharing={shareToCircle.isPending}
                  title={t('card.share_in')}
                  description="Add context so the Circle knows why this item is useful."
                  submitLabel="Share item"
                  onClose={() => setShareMenuOpen(false)}
                  onShare={handleShare}
                />
              )}
            </div>
          )}
        </div>
      </header>

      <div className="p-4">
        <h3 className="font-display font-bold text-lg leading-tight line-clamp-2 mb-1">
          {item.title || t('common.untitled')}
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
          <p className="text-[11px] font-mono uppercase tracking-wide mb-3 text-ink-soft flex items-center gap-2">
            <Sparkles size={12} className="text-accent-pink animate-pulse" />
            {statusLabel}
          </p>
        )}

        {item.enrichment_status === EnrichmentStatus.Error && (
          <button
            onClick={handleAIEnrich}
            className="text-[10px] font-mono uppercase border-2 border-ink px-2 py-0.5 mb-3
                       bg-accent-yellow hover:bg-accent-yellow-dark flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={10} strokeWidth={3} className={aiEnrich.isPending ? 'animate-spin' : ''} />
            {t('card.retry_analysis')}
          </button>
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
          <div className={`space-y-2 ${showAIReview ? 'mt-4 pt-4 border-t-2 border-ink border-dashed' : ''}`}>
            {showAIReview && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase font-bold text-ink-soft flex items-center gap-1.5">
                  <Sparkles size={10} /> {t('card.ai_suggestions')}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={discardAITags}
                    title={t('card.discard_suggestions')}
                    className="p-1 hover:bg-accent-pink border-2 border-transparent hover:border-ink transition-all"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                  <button
                    onClick={acceptAITags}
                    title={t('card.accept_all')}
                    className="p-1 hover:bg-accent-lime border-2 border-transparent hover:border-ink transition-all"
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.slice(0, 6).map((t) => (
                <TagChip 
                  key={t} 
                  label={t} 
                  colorIndex={hashIndex(t)} 
                  variant={showAIReview ? 'outline' : 'solid'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
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
