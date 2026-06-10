import { useNavigate } from 'react-router-dom'
import { Library, ListChecks, Terminal } from 'lucide-react'
import { useRunbooks, type RunbookWithItem } from '@devdeck/api-client'
import { Button } from '@devdeck/ui'
import { useTranslation } from '@devdeck/i18n'
import { AppShell } from '../components/AppShell'

export function RunbooksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: runbooks = [], isLoading, error } = useRunbooks()

  return (
    <AppShell contentClassName="flex-1 flex flex-col overflow-hidden">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-soft uppercase">/ runbooks</p>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
            <Library size={22} strokeWidth={3} className="text-accent-orange" />
            {t('runbooks.title')}
          </h1>
        </div>
        <div className="flex-1" />
        <Button type="button" variant="secondary" onClick={() => navigate('/items')}>
          {t('runbooks.go_to_items')}
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <p className="font-mono text-xs text-ink-soft mb-6 max-w-2xl">{t('runbooks.subtitle')}</p>

        {isLoading && (
          <p className="font-mono text-sm text-ink-soft animate-pulse">{t('runbooks.loading')}</p>
        )}

        {error != null && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl">
            <p className="font-display font-bold text-lg mb-1">{t('runbooks.error_loading')}</p>
            <p className="text-sm font-mono">{(error as Error).message}</p>
          </div>
        )}

        {!isLoading && error == null && runbooks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Library size={64} strokeWidth={2} className="mb-4 opacity-50" />
            <p className="font-display font-bold text-xl mb-2">{t('runbooks.empty_title')}</p>
            <p className="font-mono text-sm text-ink-soft max-w-sm mb-6">{t('runbooks.empty_desc')}</p>
            <Button type="button" variant="accent" onClick={() => navigate('/items')}>
              {t('runbooks.go_to_items')}
            </Button>
          </div>
        )}

        {runbooks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl">
            {runbooks.map((rb) => (
              <RunbookCard key={rb.id} runbook={rb} onOpen={() => navigate(`/items/${rb.item_id}`)} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}

function RunbookCard({ runbook, onOpen }: { runbook: RunbookWithItem; onOpen: () => void }) {
  const { t } = useTranslation()
  const stepCount = runbook.steps?.length ?? 0
  const commandCount = runbook.steps?.filter((s) => s.command).length ?? 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-bg-card border-3 border-ink p-4 shadow-hard text-left group hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg transition-all"
    >
      <h2 className="font-display font-black text-lg uppercase group-hover:text-accent-pink transition-colors truncate">
        {runbook.title}
      </h2>
      {runbook.description && (
        <p className="text-xs text-ink-soft mt-1 line-clamp-2">{runbook.description}</p>
      )}

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <span className="text-[9px] font-mono font-bold uppercase bg-accent-cyan border border-ink px-1.5 py-0.5 flex items-center gap-1">
          <ListChecks size={10} strokeWidth={3} />
          {t('runbooks.steps_count', { count: stepCount })}
        </span>
        {commandCount > 0 && (
          <span className="text-[9px] font-mono font-bold uppercase bg-accent-lime border border-ink px-1.5 py-0.5 flex items-center gap-1">
            <Terminal size={10} strokeWidth={3} />
            {t('runbooks.commands_count', { count: commandCount })}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-2 border-t border-ink/10 gap-2">
        <span className="text-[10px] font-mono text-ink-soft truncate">
          {t('runbooks.from_item', { title: runbook.item_title })}
        </span>
        <span className="text-[10px] font-mono font-bold group-hover:underline shrink-0">
          {t('runbooks.open_arrow')}
        </span>
      </div>
    </button>
  )
}
