import { useQueryClient } from '@tanstack/react-query'
import { Check, Crown, ExternalLink, X } from 'lucide-react'
import { APIError, useAIUsage, useCheckout, useMe, usePortal, useSystemConfig } from '@heapdeck/api-client'
import { Button, showToast } from '@heapdeck/ui'
import { useTranslation } from '@heapdeck/i18n'

function centsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Plan + usage panel. Three shapes depending on state:
 * self-hosted (billing off), Pro (usage meter + manage), Free (compare + upgrade).
 * Embedded by SettingsPage and BillingPage.
 */
export function BillingPanel() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const { data: systemConfig } = useSystemConfig()
  const isPro = me?.plan === 'pro'
  const billingEnabled = systemConfig?.billing_enabled === true

  const usage = useAIUsage()
  const checkout = useCheckout()
  const portal = usePortal()

  if (!billingEnabled) {
    return (
      <div className="border-3 border-ink border-dashed bg-bg-card p-4">
        <p className="font-display font-black uppercase text-sm tracking-widest mb-2">
          {t('billing.selfhost_title')}
        </p>
        <p className="font-mono text-xs text-ink-soft leading-relaxed">
          {t('billing.selfhost_desc')}
        </p>
      </div>
    )
  }

  async function handleCheckout() {
    try {
      const { checkout_url: url } = await checkout.mutateAsync()
      window.location.href = url
    } catch (err) {
      if (err instanceof APIError && err.status === 409) {
        await qc.invalidateQueries({ queryKey: ['users', 'me'] })
        showToast(t('billing.already_pro'), 'info')
        return
      }
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }

  async function handlePortal() {
    try {
      const { portal_url: url } = await portal.mutateAsync()
      window.location.href = url
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }

  if (isPro) {
    const used = usage.data?.used_cents ?? 0
    const cap = usage.data?.cap_cents ?? 0
    const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0
    const resetsAt = usage.data?.resets_at
      ? new Date(usage.data.resets_at).toLocaleDateString()
      : ''
    const byAction = usage.data?.by_action ?? []

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-3 border-ink bg-bg-card p-4 shadow-hard">
          <div className="flex items-center gap-3">
            <div className="bg-accent-lavender border-2 border-ink p-1.5 shadow-hard-sm">
              <Crown size={16} strokeWidth={3} />
            </div>
            <div>
              <p className="font-display font-black uppercase text-sm">{t('billing.current_plan')}</p>
              <p className="font-mono text-xs text-ink-soft">HeapDeck Pro · $5/mo</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handlePortal} disabled={portal.isPending}>
            <ExternalLink size={12} strokeWidth={3} className="mr-1 inline-block" />
            {t('billing.manage')}
          </Button>
        </div>

        <div className="border-3 border-ink bg-bg-card p-4 shadow-hard space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold uppercase text-xs tracking-widest">
              {t('billing.usage_title')}
            </p>
            <p className="font-mono text-xs text-ink-soft">
              {centsToUsd(used)} / {centsToUsd(cap)}
              {resetsAt && ` · ${t('billing.usage_resets')} ${resetsAt}`}
            </p>
          </div>
          <div className="h-4 border-2 border-ink bg-bg-primary overflow-hidden">
            <div
              className={`h-full transition-all ${
                pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-accent-yellow' : 'bg-accent-lime'
              }`}
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {byAction.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {byAction.map((a) => (
                <div key={a.action} className="border-2 border-ink bg-bg-elevated px-2 py-1.5">
                  <p className="font-mono text-[10px] uppercase font-bold truncate">{a.action}</p>
                  <p className="font-mono text-[10px] text-ink-soft">
                    {a.events}× · {centsToUsd(a.cents)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <p className="font-mono text-[10px] text-ink-soft">{t('billing.usage_note')}</p>
        </div>
      </div>
    )
  }

  // Free plan: compare + upgrade.
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border-3 border-ink bg-bg-card p-4 shadow-hard">
          <p className="font-display font-black uppercase text-sm mb-1">{t('billing.plan_free')}</p>
          <p className="font-display font-black text-3xl mb-3">$0</p>
          <ul className="space-y-1.5">
            {['billing.free_vault', 'billing.free_capture', 'billing.free_search'].map((key) => (
              <li key={key} className="flex items-start gap-2 font-mono text-xs text-ink-soft">
                <Check size={12} strokeWidth={3} className="text-accent-lime shrink-0 mt-0.5" />
                {t(key)}
              </li>
            ))}
            <li className="flex items-start gap-2 font-mono text-xs text-ink-soft">
              <X size={12} strokeWidth={3} className="text-danger shrink-0 mt-0.5" />
              {t('billing.free_no_ai')}
            </li>
          </ul>
        </div>
        <div className="border-3 border-ink bg-ink text-bg-primary p-4 shadow-hard relative">
          <div className="absolute -top-3 right-3 bg-accent-lavender text-ink border-2 border-ink px-2 py-0.5 font-mono text-[10px] font-black uppercase shadow-hard-sm">
            {t('billing.pro_tag')}
          </div>
          <p className="font-display font-black uppercase text-sm mb-1">{t('billing.plan_pro')}</p>
          <p className="font-display font-black text-3xl mb-3 text-accent-yellow">
            $5<span className="text-sm text-bg-primary/70 font-bold">/mo</span>
          </p>
          <ul className="space-y-1.5">
            {['billing.pro_summary', 'billing.pro_semantic', 'billing.pro_discovery', 'billing.pro_knowledge'].map(
              (key) => (
                <li key={key} className="flex items-start gap-2 font-mono text-xs text-bg-primary/90">
                  <Check size={12} strokeWidth={3} className="text-accent-lime shrink-0 mt-0.5" />
                  {t(key)}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button variant="accent" onClick={handleCheckout} disabled={checkout.isPending} className="w-full sm:w-auto">
          <Crown size={14} strokeWidth={3} className="mr-1 inline-block" />
          {checkout.isPending ? t('billing.checkout_loading') : t('billing.upgrade_cta')}
        </Button>
        <p className="font-mono text-[10px] text-ink-soft">{t('billing.upsell_fine_print')}</p>
      </div>
    </div>
  )
}
