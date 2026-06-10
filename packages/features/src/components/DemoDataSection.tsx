import { Sparkles, Trash2 } from 'lucide-react'
import { useInstallStarterKit, useRemoveDemoData } from '@devdeck/api-client'
import { Button, confirm, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

const DEMO_KIT_ID = 'devdeck-demo'

/**
 * Load/remove the demo vault. Every demo item carries the 'demo' tag,
 * so removal is surgical: keep an item by deleting its tag first.
 */
export function DemoDataSection() {
  const { t } = useTranslation()
  const installKit = useInstallStarterKit()
  const removeDemo = useRemoveDemoData()

  async function handleLoad() {
    try {
      await installKit.mutateAsync(DEMO_KIT_ID)
      showToast(t('settings.demo_loaded'), 'success')
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }

  async function handleRemove() {
    const ok = await confirm({
      title: t('settings.demo_remove_confirm_title'),
      message: t('settings.demo_remove_confirm_msg'),
    })
    if (!ok) return
    try {
      const result = await removeDemo.mutateAsync()
      showToast(t('settings.demo_removed', { count: result.removed }), 'success')
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-[10px] text-ink-soft italic">{t('settings.demo_desc')}</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleLoad} disabled={installKit.isPending}>
          <span className="flex items-center gap-2">
            <Sparkles size={15} strokeWidth={3} />
            {installKit.isPending ? t('common.loading') : t('settings.demo_load')}
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleRemove}
          disabled={removeDemo.isPending}
        >
          <span className="flex items-center gap-2">
            <Trash2 size={15} strokeWidth={3} />
            {removeDemo.isPending ? t('common.loading') : t('settings.demo_remove')}
          </span>
        </Button>
      </div>
    </div>
  )
}
