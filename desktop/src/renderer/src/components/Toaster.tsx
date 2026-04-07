import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { subscribeToasts, type Toast } from '../lib/toast'

const variantStyles = {
  success: 'bg-accent-lime',
  error:   'bg-danger text-white',
  info:    'bg-accent-cyan',
} as const

const icons = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
} as const

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.variant]
        return (
          <div
            key={t.id}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 border-3 border-ink shadow-hard',
              'font-display font-bold uppercase text-sm tracking-wide',
              'pointer-events-auto animate-toast-in',
              variantStyles[t.variant],
            )}
          >
            <Icon size={18} strokeWidth={3} />
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
