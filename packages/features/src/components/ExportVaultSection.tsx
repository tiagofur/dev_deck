import { useState } from 'react'
import { FileDown, FileJson, FileText } from 'lucide-react'
import { api } from '@devdeck/api-client'
import { Button, showToast } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'

type ExportFormat = 'json' | 'markdown'

/**
 * Full vault export. Local-first trust: the vault always has an exit
 * door — JSON for full fidelity, Markdown for reading and grepping.
 */
export function ExportVaultSection() {
  const { t } = useTranslation()
  const [pending, setPending] = useState<ExportFormat | null>(null)

  async function download(format: ExportFormat) {
    setPending(format)
    try {
      const blob = await api.getBlob(`/api/export/vault?format=${format}`)
      const extension = format === 'json' ? 'json' : 'md'
      const date = new Date().toISOString().slice(0, 10)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `devdeck-vault-${date}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast(t('settings.export_vault_success'), 'success')
    } catch (err) {
      showToast((err as Error).message || t('common.error'), 'error')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-[10px] text-ink-soft italic">{t('settings.export_vault_desc')}</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => download('json')} disabled={pending !== null}>
          <span className="flex items-center gap-2">
            {pending === 'json' ? (
              <FileDown size={15} strokeWidth={3} className="animate-pulse" />
            ) : (
              <FileJson size={15} strokeWidth={3} />
            )}
            {t('settings.export_vault_json')}
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => download('markdown')}
          disabled={pending !== null}
        >
          <span className="flex items-center gap-2">
            {pending === 'markdown' ? (
              <FileDown size={15} strokeWidth={3} className="animate-pulse" />
            ) : (
              <FileText size={15} strokeWidth={3} />
            )}
            {t('settings.export_vault_markdown')}
          </span>
        </Button>
      </div>
    </div>
  )
}
