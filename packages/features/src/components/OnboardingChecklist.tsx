import { Check, Chrome, Monitor, MessageSquare } from 'lucide-react'
import { Button } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

export function OnboardingChecklist() {
  const { t } = useTranslation()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- window.electronAPI is an untyped external bridge injected by the desktop preload script
  const isDesktop = typeof (window as any).electronAPI !== 'undefined'

  return (
    <div className="max-w-md w-full bg-bg-card border-3 border-ink shadow-hard p-6 text-left">
      <h3 className="font-display font-black uppercase text-sm tracking-widest mb-4">
        {t('onboarding.title')}
      </h3>

      <div className="space-y-4">
        <CheckItem
          done={true}
          label={t('onboarding.create_account')}
          desc={t('onboarding.create_account_desc')}
        />
        <CheckItem
          done={false}
          label={t('onboarding.install_extension')}
          desc={t('onboarding.install_extension_desc')}
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
            >
              <Chrome size={12} className="mr-1" /> {t('settings.enable_button')}
            </Button>
          }
        />
        {!isDesktop && (
          <CheckItem
            done={false}
            label={t('onboarding.download_desktop')}
            desc={t('onboarding.download_desktop_desc')}
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open('/download', '_blank')}
              >
                <Monitor size={12} className="mr-1" /> {t('common.download')}
              </Button>
            }
          />
        )}
        <CheckItem
          done={false}
          label={t('onboarding.first_capture')}
          desc={t('onboarding.first_capture_desc')}
        />
        <CheckItem
          done={false}
          label={t('onboarding.ask_ai')}
          desc={t('onboarding.ask_ai_desc')}
          icon={<MessageSquare size={14} />}
        />
      </div>
    </div>
  )
}

function CheckItem({
  done,
  label,
  desc,
  action,
  icon,
}: {
  done: boolean
  label: string
  desc: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className={`flex gap-3 ${done ? 'opacity-40' : ''}`}>
      <div
        className={`w-6 h-6 border-2 border-ink flex items-center justify-center shrink-0 mt-0.5
                ${done ? 'bg-accent-lime' : 'bg-bg-primary'}
            `}
      >
        {done && <Check size={14} strokeWidth={4} />}
        {!done && icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-display font-black uppercase text-[10px] tracking-tight ${
            done ? 'line-through' : ''
          }`}
        >
          {label}
        </p>
        <p className="text-[10px] font-mono text-ink-soft leading-tight mt-0.5">{desc}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}
