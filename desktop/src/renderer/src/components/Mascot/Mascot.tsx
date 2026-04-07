import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useStats } from '../../features/stats/api'
import type { MascotMood } from '../../features/stats/types'
import { usePreferences } from '../../lib/preferences'
import { MascotSVG } from './MascotSVG'
import { pickMessage } from './messages'

/**
 * Per-mood Framer Motion animation. Idle and sleeping loop forever;
 * the others play once when the mood changes.
 */
const moodAnimations: Record<MascotMood, Variants['animate']> = {
  idle: {
    scale: [1, 1.03, 1],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  sleeping: {
    rotate: [-3, 3, -3],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
  happy: {
    y: [0, -12, 0, -6, 0],
    transition: { duration: 0.8 },
  },
  judging: {
    x: [0, 4, -4, 3, -3, 0],
    transition: { duration: 0.5 },
  },
  celebrating: {
    scale: [1, 1.25, 0.95, 1.15, 1],
    rotate: [0, 10, -10, 5, 0],
    transition: { duration: 1 },
  },
}

export function Mascot() {
  const prefs = usePreferences()
  const { data: stats } = useStats()
  const mood: MascotMood = stats?.mascot_mood ?? 'idle'
  const topLang = stats?.top_language ?? null

  const [bubble, setBubble] = useState<string | null>(null)

  // Allow opting out from Settings
  if (!prefs.mascotEnabled) return null

  // Auto-show a bubble briefly when mood changes to a "noisy" state.
  useEffect(() => {
    if (mood === 'celebrating' || mood === 'sleeping') {
      setBubble(pickMessage(mood, topLang))
      const t = setTimeout(() => setBubble(null), 4000)
      return () => clearTimeout(t)
    }
  }, [mood, topLang])

  function speak() {
    setBubble(pickMessage(mood, topLang))
    setTimeout(() => setBubble(null), 4000)
  }

  return (
    <div className="fixed bottom-6 right-6 z-30 flex items-end gap-3 pointer-events-none select-none">
      <AnimatePresence>
        {bubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative mb-4 max-w-[200px] bg-accent-yellow border-3 border-ink shadow-hard px-4 py-2
                       font-display font-bold text-sm uppercase tracking-wide pointer-events-none"
          >
            {bubble}
            {/* Tail */}
            <div
              className="absolute -bottom-3 right-6 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '12px solid #0A0A0A',
              }}
            />
            <div
              className="absolute -bottom-[9px] right-[27px] w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '9px solid #FFD23F',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={speak}
        aria-label="Snarkel"
        className="w-24 h-24 pointer-events-auto cursor-pointer focus:outline-none"
        animate={moodAnimations[mood]}
        // Re-trigger animation whenever mood changes by using mood as key.
        key={mood}
      >
        <MascotSVG mood={mood} />
      </motion.button>
    </div>
  )
}
