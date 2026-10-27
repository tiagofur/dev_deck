import { Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@heapdeck/ui'
import { useTranslation } from '@heapdeck/i18n'

interface ProUpsellProps {
  /** Short, feature-specific line explaining what Pro unlocks here. */
  feature: string
  /** Denser layout for embedding inside modals and tabs. */
  compact?: boolean
}

/**
 * Inline upsell shown where a surface hit the Pro gate (402 PRO_REQUIRED)
 * or degraded to non-AI results. Sends users to /billing to upgrade.
 */
export function ProUpsell({ feature, compact = false }: ProUpsellProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className={`border-3 border-ink bg-bg-card shadow-hard ${compact ? 'p-4' : 'p-6'} text-center flex flex-col items-center gap-3`}
    >
      <div className="bg-accent-lavender border-2 border-ink p-2 shadow-hard-sm">
        <Crown size={compact ? 18 : 24} strokeWidth={3} className="text-ink" />
      </div>
      <p className="font-display font-black uppercase tracking-wide text-sm">
        {t('billing.upsell_title')}
      </p>
      <p className="font-mono text-xs text-ink-soft max-w-md leading-relaxed">{feature}</p>
      <Button variant="accent" size={compact ? 'sm' : 'md'} onClick={() => navigate('/billing')}>
        {t('billing.upgrade_cta')}
      </Button>
      <p className="font-mono text-[10px] text-ink-soft">{t('billing.upsell_fine_print')}</p>
    </div>
  )
}
