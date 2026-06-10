import { useState } from 'react'
import { Star, Download } from 'lucide-react'
import { useImportGithubStars, useMe } from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

/**
 * One-time import of public GitHub stars into the vault. Uses the
 * server-side GitHub token; no user OAuth token is stored. Lives in
 * Settings on purpose: no permanent navigation surface.
 */
export function ImportStarsSection() {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const importStars = useImportGithubStars()
  const [username, setUsername] = useState('')
  const [lastResult, setLastResult] = useState<string | null>(null)

  const effectiveUsername = username.trim() || user?.login || ''

  async function handleImport() {
    try {
      const result = await importStars.mutateAsync(
        username.trim() ? { username: username.trim() } : {},
      )
      const summary = t('settings.import_stars_result', {
        imported: result.imported,
        skipped: result.skipped,
        username: result.username,
      })
      setLastResult(summary)
      showToast(summary, 'success')
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-[10px] text-ink-soft italic">{t('settings.import_stars_desc')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={user?.login || t('settings.import_stars_placeholder')}
          className="h-10 border-3 border-ink bg-bg-primary px-3 font-mono text-sm outline-none focus:bg-accent-yellow/10"
          aria-label={t('settings.import_stars_username_label')}
        />
        <Button
          type="button"
          onClick={handleImport}
          disabled={importStars.isPending || !effectiveUsername}
        >
          <span className="flex items-center gap-2">
            {importStars.isPending ? (
              <Download size={15} strokeWidth={3} className="animate-pulse" />
            ) : (
              <Star size={15} strokeWidth={3} />
            )}
            {importStars.isPending
              ? t('settings.import_stars_running')
              : t('settings.import_stars_button')}
          </span>
        </Button>
      </div>
      {lastResult && <p className="font-mono text-xs text-ink-soft">{lastResult}</p>}
    </div>
  )
}
