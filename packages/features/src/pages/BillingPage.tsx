import { CreditCard } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { BillingPanel } from '../components/Billing/BillingPanel'
import { useTranslation } from '@heapdeck/i18n'

/** /billing — plan, usage, upgrade and manage (Stripe redirects back here). */
export function BillingPage() {
  const { t } = useTranslation()
  return (
    <AppShell contentClassName="flex-1 overflow-y-auto bg-bg-primary">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard size={22} strokeWidth={3} className="text-accent-pink" />
          <h1 className="font-display font-black text-2xl uppercase tracking-tight">
            {t('billing.title')}
          </h1>
        </div>
        <BillingPanel />
      </div>
    </AppShell>
  )
}
