import { ExternalLink, Link as LinkIcon, MessageSquare } from 'lucide-react'
import type { AskCitation, AskResponse } from '@devdeck/api-client'
import { useNavigate } from 'react-router-dom'

interface Props {
  response: AskResponse
  onCitationClick?: (citation: AskCitation) => void
}

export function AskResults({ response, onCitationClick }: Props) {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="bg-accent-yellow/10 border-3 border-ink p-5 shadow-hard relative">
        <div className="absolute -top-3 -left-3 bg-accent-yellow border-3 border-ink p-1.5 shadow-hard-sm">
          <MessageSquare size={16} strokeWidth={3} />
        </div>
        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {response.answer}
        </p>
      </div>

      {response.citations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-display font-black text-xs uppercase tracking-widest text-ink-soft">
            Fuentes citadas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {response.citations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (onCitationClick) onCitationClick(c)
                  else navigate(`/items/${c.id}`)
                }}
                className="group flex items-start gap-3 p-3 bg-bg-card border-3 border-ink shadow-hard-sm
                           hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard
                           active:translate-x-0 active:translate-y-0 active:shadow-none
                           transition-all text-left"
              >
                <div className="shrink-0 mt-0.5">
                  {c.url ? (
                    <LinkIcon size={14} strokeWidth={3} className="text-accent-lavender" />
                  ) : (
                    <div className="w-3.5 h-3.5 border-2 border-ink rounded-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-xs uppercase truncate group-hover:text-accent-orange">
                    {c.title}
                  </p>
                  {c.url && (
                    <p className="font-mono text-[10px] text-ink-soft truncate flex items-center gap-1">
                      {new URL(c.url).hostname}
                      <ExternalLink size={10} strokeWidth={2} />
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
