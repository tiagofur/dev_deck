import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  resolveConfirm,
  subscribeConfirm,
  type ConfirmRequest,
} from '../lib/confirm'
import { Button } from './Button'

/**
 * Mounted once at the app root. Listens for confirm() calls and renders
 * a brutalist modal dialog. Replaces window.confirm.
 */
export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null)

  useEffect(() => subscribeConfirm(setReq), [])

  // ESC = cancel, Enter = confirm
  useEffect(() => {
    if (!req) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') resolveConfirm(false)
      if (e.key === 'Enter') resolveConfirm(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [req])

  return (
    <AnimatePresence>
      {req && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6
                     bg-ink/30 backdrop-blur-sm"
          onClick={() => resolveConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-card border-5 border-ink shadow-hard-xl p-7 max-w-md w-full"
          >
            <div className="flex items-start gap-4 mb-5">
              <div
                className={`w-12 h-12 border-3 border-ink shadow-hard-sm flex items-center justify-center shrink-0 ${
                  req.variant === 'danger' ? 'bg-danger text-white' : 'bg-accent-yellow'
                }`}
              >
                <AlertTriangle size={24} strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-black text-2xl uppercase mb-1">
                  {req.title}
                </h3>
                <p className="text-sm text-ink-soft font-mono">{req.message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => resolveConfirm(false)}
              >
                {req.cancelLabel}
              </Button>
              <Button
                type="button"
                variant={req.variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => resolveConfirm(true)}
                autoFocus
              >
                {req.confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
