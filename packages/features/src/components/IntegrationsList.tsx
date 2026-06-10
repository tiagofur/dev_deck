import { Check, Download, Plug } from 'lucide-react'
import {
  useFeaturedPlugins,
  useCreateCustomEnricher,
  useCreateWebhook,
  useCustomEnrichers,
  useWebhooks,
  type PluginTemplate,
} from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

/**
 * Compact list of available enricher/webhook integrations.
 * Replaces PluginGallery in Settings while the catalog is small
 * (a "gallery" of three entries reads as inflated product surface);
 * the gallery component stays in the codebase for when it grows.
 */
export function IntegrationsList() {
  const { t } = useTranslation()
  const { data: featuredRes, isLoading } = useFeaturedPlugins()
  const { data: myEnrichersRes } = useCustomEnrichers()
  const { data: myWebhooksRes } = useWebhooks()

  const createEnricher = useCreateCustomEnricher()
  const createWebhook = useCreateWebhook()

  const featured = featuredRes?.plugins || []
  const myEnrichers = myEnrichersRes?.enrichers || []
  const myWebhooks = myWebhooksRes?.webhooks || []

  async function handleInstall(p: PluginTemplate) {
    try {
      if (p.type === 'enricher') {
        await createEnricher.mutateAsync({
          name: p.name,
          url_pattern: p.url_pattern!,
          endpoint_url: p.endpoint_url!,
        })
      } else {
        const url = window.prompt(t('plugins.enter_webhook_url', { name: p.name }))
        if (!url) return
        await createWebhook.mutateAsync({
          name: p.name,
          url,
          events: p.events!,
        })
      }
      showToast(t('plugins.install_success', { name: p.name }))
    } catch (err) {
      showToast((err as Error).message, 'error')
    }
  }

  function isInstalled(p: PluginTemplate) {
    if (p.type === 'enricher') {
      return myEnrichers.some((e) => e.url_pattern === p.url_pattern)
    }
    return myWebhooks.some((w) => w.name === p.name)
  }

  if (isLoading) {
    return (
      <p className="p-6 text-center animate-pulse font-mono text-xs text-ink-soft">
        {t('plugins.exploring')}
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      {featured.map((p) => {
        const installed = isInstalled(p)
        return (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 border-2 border-ink bg-bg-primary px-3 py-2"
          >
            <Plug size={16} strokeWidth={3} className="shrink-0 text-ink-soft" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-black uppercase tracking-tight truncate">
                  {p.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 border-2 border-ink text-[8px] font-black uppercase ${
                    p.type === 'enricher' ? 'bg-accent-lavender' : 'bg-accent-cyan'
                  }`}
                >
                  {p.type}
                </span>
              </div>
              <p className="font-mono text-[10px] text-ink-soft truncate">{p.description}</p>
            </div>
            <Button
              onClick={() => handleInstall(p)}
              disabled={installed || createEnricher.isPending || createWebhook.isPending}
              variant={installed ? 'secondary' : 'primary'}
              size="sm"
            >
              {installed ? (
                <span className="flex items-center gap-1.5">
                  <Check size={12} strokeWidth={4} /> {t('plugins.installed')}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Download size={12} strokeWidth={3} /> {t('plugins.install')}
                </span>
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
