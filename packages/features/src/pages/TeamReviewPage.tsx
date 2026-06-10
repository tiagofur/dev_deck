import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Box, CheckCircle2, Users } from 'lucide-react'
import { Button } from '@devdeck/ui'
import { useItems, usePreferences } from '@devdeck/api-client'
import { ItemCard } from '../components/ItemCard'
import { detailPathForItem } from '../utils/itemRoutes'
import { AppShell } from '../components/AppShell'
import { OrgRequiredEmptyState } from '../components/OrgRequiredEmptyState'
import { useTranslation } from '@devdeck/i18n'

export function TeamReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeOrgId } = usePreferences()
  const { data, isLoading, error } = useItems({
    tag: 'team-review',
    limit: 200,
    sort: 'updated_desc',
  })
  const items = data?.items ?? []

  if (!activeOrgId) {
    return <OrgRequiredEmptyState description={t('review.org_required_desc')} />
  }

  return (
    <AppShell contentClassName="flex-1 flex flex-col overflow-hidden">
      <header className="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/items')}
          className="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150"
          aria-label={t('item_detail.back_to_items')}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-soft uppercase">/ review</p>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
            <Users size={22} strokeWidth={3} />
            {t('review.title')}
          </h1>
        </div>
        <div className="flex-1" />
        <Button type="button" variant="secondary" onClick={() => navigate('/items')}>
          {t('review.view_all')}
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <section className="mb-6 border-3 border-ink bg-accent-yellow/30 p-4 shadow-hard max-w-4xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} strokeWidth={3} className="mt-0.5 shrink-0" />
            <div>
              <h2 className="font-display font-black uppercase text-lg">{t('review.curation_queue')}</h2>
              <p className="font-mono text-sm text-ink-soft mt-1">
                {t('review.queue_description')}
              </p>
            </div>
          </div>
        </section>

        {isLoading && <p className="font-mono text-ink-soft">{t('review.loading')}</p>}

        {error && (
          <div className="p-4 bg-danger text-white border-3 border-ink shadow-hard max-w-2xl">
            <p className="font-display font-bold text-lg mb-1">{t('review.error_loading')}</p>
            <p className="text-sm font-mono">{(error as Error).message}</p>
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Box size={64} strokeWidth={2} className="mb-4 opacity-50" />
            <p className="font-display font-bold text-xl mb-2">{t('review.empty_title')}</p>
            <p className="font-mono text-sm text-ink-soft max-w-sm mb-6">
              {t('review.empty_desc')}
            </p>
            <Button type="button" variant="accent" onClick={() => navigate('/items')}>
              {t('review.go_to_items')}
            </Button>
          </div>
        )}

        {items.length > 0 && (
          <>
            <p className="font-mono text-xs text-ink-soft mb-4">
              {t('review.waiting_count', { count: data?.total })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((it) => (
                <ItemCard key={it.id} item={it} onClick={() => navigate(detailPathForItem(it))} />
              ))}
            </div>
          </>
        )}
      </main>
    </AppShell>
  )
}
