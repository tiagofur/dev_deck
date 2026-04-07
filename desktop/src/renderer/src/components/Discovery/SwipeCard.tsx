import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { ExternalLink, GitFork, Star } from 'lucide-react'
import type { Repo } from '../../features/repos/types'
import { formatCount } from '../../lib/format'

export type SwipeDirection = 'left' | 'right' | 'up'

interface Props {
  repo: Repo
  onSwipe: (dir: SwipeDirection) => void
}

const SWIPE_THRESHOLD = 120

/**
 * Big swipeable card for discovery mode. Drag in any direction;
 * past the threshold the parent gets `onSwipe(dir)` and animates
 * itself out (we don't manage exit animation here — the parent
 * unmounts on action and a new card replaces this one).
 */
export function SwipeCard({ repo, onSwipe }: Props) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Rotate based on horizontal drag for that "playing card" feel
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15])

  // Edge tints — show what action will fire
  const leftHint = useTransform(x, [-200, -50], [1, 0])
  const rightHint = useTransform(x, [50, 200], [0, 1])
  const upHint = useTransform(y, [-200, -50], [1, 0])

  function handleDragEnd(_: unknown, info: PanInfo) {
    const ax = Math.abs(info.offset.x)
    const ay = Math.abs(info.offset.y)
    if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return

    if (ax > ay) {
      onSwipe(info.offset.x > 0 ? 'right' : 'left')
    } else if (info.offset.y < 0) {
      onSwipe('up')
    }
  }

  const title = repo.owner ? `${repo.owner}/${repo.name}` : repo.name

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotate }}
      whileTap={{ cursor: 'grabbing' }}
      className="relative w-full max-w-2xl bg-bg-card border-5 border-ink shadow-hard-xl p-8 cursor-grab"
    >
      {/* Edge action hints */}
      <motion.div
        style={{ opacity: leftHint }}
        className="absolute top-4 left-4 px-3 py-1 bg-danger text-white border-3 border-ink shadow-hard
                   font-display font-black text-lg uppercase rotate-[-12deg]"
      >
        ARCHIVAR
      </motion.div>
      <motion.div
        style={{ opacity: rightHint }}
        className="absolute top-4 right-4 px-3 py-1 bg-accent-lime border-3 border-ink shadow-hard
                   font-display font-black text-lg uppercase rotate-[12deg]"
      >
        SIRVE
      </motion.div>
      <motion.div
        style={{ opacity: upHint }}
        className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-cyan border-3 border-ink shadow-hard
                   font-display font-black text-lg uppercase"
      >
        ABRIR
      </motion.div>

      <header className="flex items-start gap-4 mb-6">
        {repo.avatar_url ? (
          <img
            src={repo.avatar_url}
            alt=""
            className="w-20 h-20 border-3 border-ink shrink-0"
            draggable={false}
          />
        ) : (
          <div className="w-20 h-20 border-3 border-ink bg-accent-yellow flex items-center justify-center font-display font-black text-3xl shrink-0">
            {(repo.name[0] ?? '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-ink-soft uppercase mb-1">{repo.source}</p>
          <h2 className="font-display font-black text-3xl break-words">{title}</h2>
        </div>
      </header>

      {repo.description && (
        <p className="text-base text-ink mb-5 leading-relaxed">{repo.description}</p>
      )}

      <div className="flex items-center gap-5 font-mono text-sm">
        {repo.language && (
          <span className="flex items-center gap-2">
            <span
              className="w-3 h-3 border border-ink"
              style={{ backgroundColor: repo.language_color || '#888' }}
            />
            {repo.language}
          </span>
        )}
        {repo.stars > 0 && (
          <span className="flex items-center gap-1.5">
            <Star size={14} strokeWidth={2.5} />
            {formatCount(repo.stars)}
          </span>
        )}
        {repo.forks > 0 && (
          <span className="flex items-center gap-1.5">
            <GitFork size={14} strokeWidth={2.5} />
            {formatCount(repo.forks)}
          </span>
        )}
      </div>

      {repo.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t-2 border-ink/10">
          {repo.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 text-xs font-mono font-semibold border-2 border-ink bg-bg-elevated"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs font-mono text-ink-soft text-center">
        ← archivar &nbsp;·&nbsp; ↑ abrir &nbsp;·&nbsp; sirve →
      </p>

      <ExternalLink size={14} className="absolute bottom-4 right-4 opacity-30" strokeWidth={2.5} />
    </motion.div>
  )
}
