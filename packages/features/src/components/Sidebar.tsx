import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Menu, X } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)

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

  // Mobile: toggle button
  const MobileToggle = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="fixed top-4 left-4 z-50 p-2 bg-bg-card border-3 border-ink shadow-hard lg:hidden"
      aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
    >
      {isOpen ? <X size={20} strokeWidth={3} /> : <Menu size={20} strokeWidth={3} />}
    </button>
  )

  const sidebarContent = (
    <>
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
          langs.map(([lang, { count, color }]) => (
            <FilterRow
              key={lang}
              label={lang}
              count={count}
              color={color}
              active={selectedLang === lang}
              onClick={() => onSelectLang(selectedLang === lang ? null : lang)}
            />
          ))
        )}
      </Section>
    </>
  )

  // Desktop: always visible
  if (!isOpen) {
    return (
      <>
        {MobileToggle}
        <aside className="w-60 shrink-0 border-r-3 border-ink bg-bg-elevated p-5 overflow-y-auto hidden lg:block">
          {sidebarContent}
        </aside>
      </>
    )
  }

  // Mobile: slide-over drawer
  return (
    <>
      {MobileToggle}
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside
        className={clsx(
          'fixed lg:hidden inset-y-0 left-0 w-72 z-40 bg-bg-elevated border-r-3 border-ink p-5 overflow-y-auto transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

function FilterRow({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string
  count: number
  color?: string | null
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between px-2 py-1.5 text-sm font-mono transition-colors',
        active ? 'bg-accent-lime shadow-hard-sm' : 'hover:bg-accent-yellow/40'
      )}
    >
      <span className="flex items-center gap-2">
        {color && (
          <span className="w-3 h-3 border border-ink" style={{ backgroundColor: color }} />
        )}
        {label}
      </span>
      <span className="text-xs opacity-60">({count})</span>
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="font-display font-black text-xs uppercase tracking-widest text-ink-soft mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="text-sm font-mono text-ink-soft italic">— vacío —</p>
}