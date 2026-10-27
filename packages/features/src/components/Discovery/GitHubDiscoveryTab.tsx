import { useState } from 'react'
import { GitBranch, Plus, Search, Star, ExternalLink, RefreshCw } from 'lucide-react'
import { isProRequired, useGitHubDiscovery } from '@heapdeck/api-client'
import { Button } from '@heapdeck/ui'
import { useTranslation } from '@heapdeck/i18n'
import { ProUpsell } from '../Billing/ProUpsell'

const LANGUAGES = ['', 'go', 'rust', 'python', 'typescript', 'javascript', 'java', 'c++', 'ruby', 'zig'] as const

/**
 * Need-based GitHub discovery (Pro). Describe what you need; the server
 * builds a qualifier-rich query, searches GitHub, and re-ranks by fit.
 * Free users hit the 402 paywall rendered as an inline upsell.
 */
export function GitHubDiscoveryTab() {
  const { t } = useTranslation()
  const [needInput, setNeedInput] = useState('')
  const [language, setLanguage] = useState<string>('')
  const [submitted, setSubmitted] = useState('')

  const { data, isLoading, error, refetch } = useGitHubDiscovery({
    need: submitted,
    language,
    limit: 10,
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = needInput.trim()
    if (trimmed.length >= 3) setSubmitted(trimmed)
  }

  function saveHit(url: string, title: string) {
    window.dispatchEvent(new CustomEvent('heapdeck:open-capture', { detail: { url, title } }))
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Need search form */}
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 border-3 border-ink bg-bg-card shadow-hard px-3">
            <Search size={16} strokeWidth={3} className="text-ink-soft shrink-0" />
            <input
              value={needInput}
              onChange={(e) => setNeedInput(e.target.value)}
              placeholder={t('discovery.github.placeholder')}
              className="flex-1 font-mono text-sm bg-transparent py-2.5 focus:outline-none"
              aria-label={t('discovery.github.placeholder')}
            />
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t('discovery.github.language_label')}
            className="border-3 border-ink bg-bg-card shadow-hard font-mono text-xs uppercase py-2 px-2 focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang || 'any'} value={lang}>
                {lang || t('discovery.github.language_any')}
              </option>
            ))}
          </select>
          <Button type="submit" variant="accent" disabled={needInput.trim().length < 3}>
            {t('discovery.github.search')}
          </Button>
        </div>
        <p className="font-mono text-[10px] text-ink-soft">{t('discovery.github.hint')}</p>
      </form>

      {/* Paywall */}
      {!isLoading && error && isProRequired(error) && (
        <ProUpsell compact feature={t('discovery.github.pro_feature')} />
      )}

      {/* Other errors */}
      {!isLoading && error && !isProRequired(error) && (
        <div className="border-3 border-ink border-dashed bg-bg-card p-6 text-center space-y-3">
          <p className="font-mono text-sm text-ink-soft">{t('discovery.github.error')}</p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            <RefreshCw size={12} strokeWidth={3} className="mr-1 inline-block" />
            {t('discovery.github.retry')}
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-bg-card border-2 border-ink" />
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && data && (
        <>
          {data.github_query && (
            <p className="font-mono text-[10px] text-ink-soft truncate" title={data.github_query}>
              github: {data.github_query}
            </p>
          )}
          {data.results.length === 0 ? (
            <div className="py-12 text-center border-3 border-ink border-dashed">
              <p className="font-mono text-sm uppercase font-bold text-ink-soft italic">
                {t('discovery.github.empty')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.results.map((r) => (
                <div
                  key={r.full_name}
                  className="bg-bg-card border-3 border-ink p-4 shadow-hard flex flex-col sm:flex-row sm:items-center gap-3 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <GitBranch size={14} strokeWidth={3} className="shrink-0" />
                      <span className="font-display font-black text-xs uppercase truncate">
                        {r.full_name}
                      </span>
                      {r.language && (
                        <span className="border border-ink bg-bg-elevated px-1.5 py-0.5 text-[9px] font-black uppercase">
                          {r.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-ink-soft">
                        <Star size={10} className="text-accent-yellow" fill="currentColor" />
                        <span className="font-mono text-[9px] font-bold">
                          {r.stars >= 1000 ? `${(r.stars / 1000).toFixed(1)}k` : r.stars}
                        </span>
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-ink-soft line-clamp-2 mb-1">
                      {r.description}
                    </p>
                    <p className="font-mono text-[9px] uppercase font-bold text-accent-lime">
                      ✓ {r.match_reason}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => saveHit(r.url, r.full_name)}>
                      <Plus size={12} strokeWidth={4} />
                      {t('topbar.capture_button')}
                    </Button>
                    <button
                      type="button"
                      onClick={() => window.open(r.url, '_blank', 'noopener,noreferrer')}
                      aria-label={t('discovery.github.open_repo')}
                      className="p-1.5 border-2 border-ink hover:bg-accent-yellow transition-colors"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
