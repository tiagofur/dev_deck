import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Hourglass, XCircle } from 'lucide-react'
import { useMe } from '@heapdeck/api-client'
import { Button } from '@heapdeck/ui'
import { useTranslation } from '@heapdeck/i18n'
import { AppShell } from '../components/AppShell'

/**
 * /billing/success and /billing/cancel — Stripe redirects here.
 * Success polls /auth/me because the webhook activates Pro asynchronously
 * (usually seconds); after a grace window it tells the user to refresh.
 */
export function BillingResultPage({ variant }: { variant: 'success' | 'cancel' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: me, refetch } = useMe()
  const isPro = me?.plan === 'pro'

  useEffect(() => {
    if (variant !== 'success' || isPro) return
    const started = Date.now()
    const id = window.setInterval(() => {
      if (Date.now() - started > 30_000) {
        window.clearInterval(id)
        return
      }
      void refetch()
    }, 2000)
    return () => window.clearInterval(id)
  }, [variant, isPro, refetch])

  return (
    <AppShell contentClassName="flex-1 flex items-center justify-center bg-bg-primary p-6">
      <div className="max-w-md w-full text-center border-5 border-ink bg-bg-card shadow-hard-xl p-8 space-y-4">
        {variant === 'cancel' ? (
          <>
            <div className="inline-block bg-bg-elevated border-2 border-ink p-3 shadow-hard-sm">
              <XCircle size={28} strokeWidth={3} className="text-ink-soft" />
            </div>
            <h1 className="font-display font-black text-2xl uppercase">
              {t('billing.cancel_title')}
            </h1>
            <p className="font-mono text-sm text-ink-soft">{t('billing.cancel_desc')}</p>
            <Button variant="secondary" onClick={() => navigate('/billing')}>
              {t('billing.cancel_retry')}
            </Button>
          </>
        ) : isPro ? (
          <>
            <div className="inline-block bg-accent-lime border-2 border-ink p-3 shadow-hard-sm">
              <CheckCircle2 size={28} strokeWidth={3} />
            </div>
            <h1 className="font-display font-black text-2xl uppercase">
              {t('billing.success_title')}
            </h1>
            <p className="font-mono text-sm text-ink-soft">{t('billing.success_desc')}</p>
            <Button variant="accent" onClick={() => navigate('/discovery')}>
              {t('billing.success_cta')}
            </Button>
          </>
        ) : (
          <>
            <div className="inline-block bg-accent-yellow border-2 border-ink p-3 shadow-hard-sm">
              <Hourglass size={28} strokeWidth={3} />
            </div>
            <h1 className="font-display font-black text-2xl uppercase">
              {t('billing.success_pending_title')}
            </h1>
            <p className="font-mono text-sm text-ink-soft">{t('billing.success_pending_desc')}</p>
            <Button variant="secondary" onClick={() => refetch()}>
              {t('billing.success_refresh')}
            </Button>
          </>
        )}
      </div>
    </AppShell>
  )
}
