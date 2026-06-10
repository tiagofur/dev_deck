import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { Button } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { AppShell } from './AppShell'

export interface FeatureDisabledStateProps {
  /** Human name of the gated surface, already translated. */
  featureName: string
}

/**
 * Shown when a route exists but its feature flag is off on this server.
 * Honest by design: explains the state instead of rendering a dead page.
 */
export function FeatureDisabledState({ featureName }: FeatureDisabledStateProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AppShell contentClassName="flex-1 p-12 text-center flex flex-col items-center justify-center gap-4 bg-bg-primary">
      <FlaskConical size={48} strokeWidth={3} className="text-accent-lavender" />
      <h2 className="font-display font-black text-2xl uppercase">
        {t('features.disabled_title', { feature: featureName })}
      </h2>
      <p className="text-ink-soft font-mono text-sm max-w-md">{t('features.disabled_desc')}</p>
      <Button onClick={() => navigate('/items')} variant="secondary">
        {t('features.back_to_vault')}
      </Button>
    </AppShell>
  )
}
