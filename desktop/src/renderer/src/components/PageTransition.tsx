import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Wrap each routed page with this so route changes get a subtle slide+fade.
 * Used together with <AnimatePresence mode="wait"> in App.tsx.
 */
export function PageTransition({ children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}
