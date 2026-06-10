import { useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { setPreferences, useCreateOrg } from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { AppShell } from './AppShell'

export interface OrgRequiredEmptyStateProps {
  /** Page-specific explanation of what this team surface does. */
  description: string
}

/**
 * Guided empty state for team/org-only pages reached without an active org.
 * Explains the surface and offers the real path in: create a team or switch
 * to one from the workspace switcher.
 */
export function OrgRequiredEmptyState({ description }: OrgRequiredEmptyStateProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createOrg = useCreateOrg()
  const qc = useQueryClient()

  const handleCreate = async () => {
    const name = window.prompt(t('workspace.team_name_prompt'))
    if (!name) return
    try {
      const newOrg = await createOrg.mutateAsync(name)
      setPreferences({ activeOrgId: newOrg.id })
      qc.invalidateQueries()
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }

  return (
    <AppShell contentClassName="flex-1 p-12 text-center flex flex-col items-center justify-center gap-4 bg-bg-primary">
      <Users size={48} strokeWidth={3} className="text-accent-pink" />
      <h2 className="font-display font-black text-2xl uppercase">{t('feed.org_required_title')}</h2>
      <p className="text-ink-soft font-mono text-sm max-w-md">{description}</p>
      <p className="text-ink-soft font-mono text-xs max-w-md">{t('feed.org_required_hint')}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <Button
          onClick={handleCreate}
          variant="accent"
          className="flex items-center gap-2"
          disabled={createOrg.isPending}
        >
          <Plus size={16} strokeWidth={3} />
          {t('feed.create_team')}
        </Button>
        <Button onClick={() => navigate('/')} variant="secondary">
          {t('feed.back_to_personal')}
        </Button>
      </div>
    </AppShell>
  )
}
