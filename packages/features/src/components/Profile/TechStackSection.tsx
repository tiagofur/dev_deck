import React from 'react'
import { Terminal } from 'lucide-react'
import { Button } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

export interface TechStackSectionProps {
  stackTags?: string[]
  onOpenEdit: () => void
}

export function TechStackSection({ stackTags = [], onOpenEdit }: TechStackSectionProps) {
  const { t } = useTranslation()

  return (
    <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-4">
      <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
        <Terminal size={20} strokeWidth={3} className="text-accent-cyan" />
        {t('profile.tech_stack_title')}
      </h3>
      {stackTags.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-2">
          {stackTags.map((tag) => (
            <span
              key={tag}
              className="border-2 border-ink bg-bg-primary px-3 py-1 font-mono text-xs font-bold shadow-hard-sm"
            >
              🚀 {tag}
            </span>
          ))}
        </div>
      ) : (
        <div className="border-2 border-ink border-dashed p-6 text-center">
          <p className="font-mono text-xs text-ink-soft">{t('profile.no_tech_selected')}</p>
          <Button onClick={onOpenEdit} size="sm" variant="secondary" className="mt-3">
            {t('profile.add_my_stack')}
          </Button>
        </div>
      )}
    </section>
  )
}
