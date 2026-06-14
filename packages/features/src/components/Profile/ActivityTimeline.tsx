import React from 'react'
import { History } from 'lucide-react'
import { useTranslation } from '@devdeck/i18n'
import type { Item } from '@devdeck/api-client'

export interface ActivityTimelineProps {
  items: Item[]
  onNavigate: (path: string) => void
}

export function ActivityTimeline({ items, onNavigate }: ActivityTimelineProps) {
  const { t } = useTranslation()

  return (
    <section className="bg-bg-card border-3 border-ink p-6 shadow-hard space-y-6">
      <h3 className="font-display font-black text-xl uppercase tracking-wider flex items-center gap-2">
        <History size={20} strokeWidth={3} className="text-accent-lime" />
        {t('profile.capture_history')}
      </h3>

      {items.length > 0 ? (
        <div className="relative border-l-3 border-ink pl-6 ml-2 space-y-6">
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="relative group">
              {/* Bullet marker */}
              <div className="absolute -left-[31px] top-1.5 border-2 border-ink w-4 h-4 bg-accent-yellow shadow-hard-sm rounded-none" />

              <div className="bg-bg-primary border-2 border-ink p-4 shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard transition-all">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[9px] font-mono uppercase font-black bg-accent-cyan border border-ink px-1.5 py-0.5">
                    {item.item_type || 'TIP'}
                  </span>
                  <span className="text-[9px] font-mono text-ink-soft">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- heading doubles as a navigation trigger; the entry below also links to the destination */}
                <h4
                  className="font-display font-bold text-sm uppercase mt-2 hover:text-accent-pink cursor-pointer"
                  onClick={() => onNavigate(item.item_type === 'repo' ? `/repo/${item.id}` : `/items/${item.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onNavigate(item.item_type === 'repo' ? `/repo/${item.id}` : `/items/${item.id}`)
                    }
                  }}
                >
                  {item.title}
                </h4>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] text-accent-pink hover:underline block mt-1 truncate"
                  >
                    {item.url}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-ink border-dashed p-10 text-center">
          <p className="font-mono text-xs text-ink-soft">{t('profile.no_history')}</p>
          <p className="font-mono text-[10px] text-ink-soft/60 mt-1">{t('profile.no_history_desc')}</p>
        </div>
      )}
    </section>
  )
}
