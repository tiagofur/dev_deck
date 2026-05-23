import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Users, Copy, Check, LogOut, ArrowRight, Share2 } from 'lucide-react'
import { Button, showToast } from '@devdeck/ui'
import { useCircleDetail, useCircleItems, useCircleMembers, useLeaveCircle } from '@devdeck/api-client'
import { useTranslation } from '@devdeck/i18n'
import { ItemGrid } from '../components/ItemGrid'
import { detailPathForItem } from '../utils/itemRoutes'
import { AppShell } from '../components/AppShell'

export function CircleDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const circleId = id || ''
  const { data: circle, isLoading: loadingCircle, error: errorCircle } = useCircleDetail(circleId)
  const { data: items = [], isLoading: loadingItems } = useCircleItems(circleId)
  const { data: members = [], isLoading: loadingMembers } = useCircleMembers(circleId)
  const leaveCircle = useLeaveCircle()

  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyLink = () => {
    if (!circle) return
    const inviteLink = `${window.location.origin}/circles/join/${circle.invite_code}`
    navigator.clipboard.writeText(inviteLink)
    setCopiedLink(true)
    showToast(t('circles.invite_link_success'))
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function handleLeave() {
    if (!circle) return
    if (!confirm(t('circles.leave_confirm', { name: circle.name }))) return

    try {
      await leaveCircle.mutateAsync(circle.id)
      showToast(t('circles.leave_success', { name: circle.name }))
      navigate('/circles')
    } catch (err) {
      showToast((err as Error).message || t('circles.join_error'), 'error')
    }
  }

  const isLoading = loadingCircle || loadingItems || loadingMembers

  if (isLoading) {
    return (
      <AppShell contentClassName="flex-1 flex items-center justify-center font-mono text-ink-soft bg-bg-primary">
        {t('common.loading')}
      </AppShell>
    )
  }

  if (errorCircle || !circle) {
    return (
      <AppShell contentClassName="flex-1 p-8">
        <div className="bg-bg-card border-3 border-ink shadow-hard p-6 max-w-xl mx-auto mt-20 text-center">
          <p className="font-display font-black uppercase text-xl text-danger mb-2">{t('circles.not_found_title')}</p>
          <p className="font-mono text-sm text-ink-soft mb-6">
            {t('circles.not_found_desc')}
          </p>
          <Button onClick={() => navigate('/circles')}>
            {t('circles.all_circles')}
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell contentClassName="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left panel / Feed Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <button
            onClick={() => navigate('/circles')}
            className="flex items-center gap-2 text-sm font-mono text-ink-soft
                       hover:text-ink mb-6 transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={3} />
            {t('circles.all_circles')}
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="font-display font-black text-4xl uppercase tracking-tight flex items-center gap-3">
                {circle.name}
              </h1>
              {circle.description ? (
                <p className="font-mono text-sm text-ink-soft mt-3 max-w-2xl">
                  {circle.description}
                </p>
              ) : (
                <p className="font-mono text-sm text-ink-soft/40 italic mt-3">
                  {t('common.no_description')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Button onClick={handleCopyLink} variant="accent" className="flex items-center gap-2">
                {copiedLink ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
                <span>{t('circles.join_label')}</span>
              </Button>
              <Button onClick={handleLeave} variant="secondary" className="flex items-center gap-2">
                <LogOut size={14} strokeWidth={3} />
                <span>{t('circles.leave_button')}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content feed */}
        <section className="border-t-3 border-ink pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
              <Share2 size={22} strokeWidth={3} />
              {t('circles.shared_vault')}
            </h2>
            <span className="font-mono text-xs text-ink-soft">
              {t('circles.shared_items_count', { count: items.length })}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="bg-bg-card border-3 border-ink shadow-hard p-12 text-center max-w-xl mx-auto">
              <Share2 size={36} strokeWidth={2} className="mx-auto mb-4 text-ink-soft" />
              <p className="font-display font-bold text-lg uppercase mb-2">{t('circles.empty_shared_vault_title')}</p>
              <p className="font-mono text-sm text-ink-soft mb-6">
                {t('circles.empty_shared_vault_desc')}
              </p>
              <Button onClick={() => navigate('/items')}>
                {t('circles.go_to_my_items')}
                <ArrowRight size={14} strokeWidth={3} className="ml-2 inline" />
              </Button>
            </div>
          ) : (
            <div className="grid gap-5">
              {items.map((item) => {
                const shareContext = typeof item.meta?.circle_share_context === 'string'
                  ? item.meta.circle_share_context
                  : ''

                return (
                  <div key={item.id} className="grid gap-3">
                    {shareContext ? (
                      <div className="border-3 border-ink bg-accent-yellow/30 p-4 shadow-hard-sm">
                        <p className="font-display text-xs font-black uppercase tracking-widest">
                          {t('circles.why_shared')}
                        </p>
                        <p className="mt-2 font-mono text-sm text-ink">
                          {shareContext}
                        </p>
                      </div>
                    ) : null}
                    <ItemGrid
                      items={[item]}
                      onSelect={(it) => navigate(detailPathForItem(it))}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Right panel / Members Panel */}
      <aside className="w-full lg:w-80 shrink-0 border-t-3 lg:border-t-0 lg:border-l-3 border-ink bg-bg-elevated p-8">
        <h2 className="font-display font-black text-xl uppercase tracking-tight mb-6 flex items-center gap-2">
          <Users size={20} strokeWidth={3} />
          {t('circles.members')} ({members.length})
        </h2>

        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="bg-bg-card border-2 border-ink p-3 flex items-center gap-3 shadow-hard-sm"
            >
              <div className="w-10 h-10 border-2 border-ink bg-bg-card overflow-hidden shrink-0 flex items-center justify-center">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.display_name || member.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display font-black uppercase text-sm">
                    {(member.display_name || member.username).substring(0, 2)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-sm truncate leading-tight">
                  {member.display_name || member.username}
                </p>
                <p className="font-mono text-[10px] text-ink-soft truncate">
                  @{member.username}
                </p>
              </div>
              <span className="px-1.5 py-0.5 border-2 border-ink text-[9px] font-mono font-bold uppercase bg-bg-elevated shrink-0">
                {member.role}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-accent-yellow border-2 border-ink p-4 mt-8 font-mono text-xs leading-relaxed">
          <p className="font-bold mb-1">{t('circles.how_to_share_title')}</p>
          {t('circles.how_to_share_desc')}
        </div>
      </aside>
    </AppShell>
  )
}
