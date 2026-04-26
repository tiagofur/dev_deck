import clsx from 'clsx'
import { useMemo } from 'react'
import type { Repo } from '@devdeck/api-client'

interface Props {
  repos: Repo[]
  selectedTag: string | null
  selectedLang: string | null
  onSelectTag: (tag: string | null) => void
  onSelectLang: (lang: string | null) => void
}

export function Sidebar({
  repos,
  selectedTag,
  selectedLang,
  onSelectTag,
  onSelectLang,
}: Props) {
  // ⚡ Bolt: Memoized expensive tag and language counting/sorting
  // Prevents O(N * T) iteration and sorting on every render where N is repos and T is tags.
  const { tags, langs } = useMemo(() => {
    const tagCounts = new Map<string, number>()
    const langCounts = new Map<string, { count: number; color: string | null }>()

    for (const r of repos) {
      for (const t of r.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
      if (r.language) {
        const cur = langCounts.get(r.language)
        langCounts.set(r.language, {
          count: (cur?.count ?? 0) + 1,
          color: r.language_color,
        })
      }
    }

    return {
      tags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]),
      langs: [...langCounts.entries()].sort((a, b) => b[1].count - a[1].count),
    }
  }, [repos])

  return (
    <aside className="w-60 shrink-0 border-r-3 border-ink bg-bg-elevated p-5 overflow-y-auto">
      <Section title="Tags">
        {tags.length === 0 ? (
          <Empty />
        ) : (
          tags.map(([tag, count]) => (
            <FilterRow
              key={tag}
              label={tag}
              count={count}
              active={selectedTag === tag}
              onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
            />
          ))
        )}
      </Section>

      <Section title="Languages">
        {langs.length === 0 ? (
          <Empty />
        ) : (
          langs.map(([lang, info]) => (
            <FilterRow
              key={lang}
              label={lang}
              count={info.count}
              color={info.color}
              active={selectedLang === lang}
              onClick={() => onSelectLang(selectedLang === lang ? null : lang)}
            />
          ))
        )}
      </Section>
    </aside>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h3 className="font-display font-black text-xs uppercase tracking-widest mb-3 text-ink">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

interface FilterRowProps {
  label: string
  count: number
  color?: string | null
  active: boolean
  onClick: () => void
}

function FilterRow({ label, count, color, active, onClick }: FilterRowProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between gap-2 px-2 py-1 text-sm font-mono text-left',
        'border-2 transition-colors',
        active
          ? 'bg-accent-yellow border-ink shadow-hard-sm'
          : 'border-transparent hover:border-ink',
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {color && (
          <span
            className="w-2.5 h-2.5 border border-ink shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="text-ink-soft text-xs shrink-0">{count}</span>
    </button>
  )
}

function Empty() {
  return <p className="text-xs font-mono text-ink-soft italic">— vacío —</p>
}
