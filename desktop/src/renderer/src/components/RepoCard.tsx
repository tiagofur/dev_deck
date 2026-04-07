import { useState } from 'react'
import { GitFork, Star, ExternalLink } from 'lucide-react'
import type { Repo } from '../features/repos/types'
import { formatCount } from '../lib/format'
import { TagChip, hashIndex } from './TagChip'

interface Props {
  repo: Repo
  onClick?: () => void
}

export function RepoCard({ repo, onClick }: Props) {
  const [imgError, setImgError] = useState(false)
  // Tiny deterministic rotation for personality (-1°, 0°, +1°)
  const rotation = (repo.id.charCodeAt(0) % 3) - 1
  const title = repo.owner ? `${repo.owner}/${repo.name}` : repo.name

  return (
    <article
      onClick={onClick}
      className="group bg-bg-card border-3 border-ink shadow-hard p-5 cursor-pointer
                 transition-all duration-150 ease-out
                 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <header className="flex items-start gap-3 mb-3">
        {repo.avatar_url && !imgError ? (
          <img
            src={repo.avatar_url}
            alt=""
            className="w-12 h-12 border-2 border-ink shrink-0 bg-bg-elevated"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-12 h-12 border-2 border-ink shrink-0 bg-accent-yellow flex items-center justify-center font-display font-black text-xl">
            {(repo.name[0] ?? '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-xl leading-tight truncate">
            {title}
          </h3>
          {repo.description && (
            <p className="text-sm text-ink-soft line-clamp-2 mt-1">
              {repo.description}
            </p>
          )}
        </div>
        <ExternalLink
          size={16}
          strokeWidth={2.5}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </header>

      <div className="flex items-center gap-4 text-xs font-mono mb-3">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 border border-ink"
              style={{ backgroundColor: repo.language_color || '#888' }}
            />
            {repo.language}
          </span>
        )}
        {repo.stars > 0 && (
          <span className="flex items-center gap-1">
            <Star size={14} strokeWidth={2.5} />
            {formatCount(repo.stars)}
          </span>
        )}
        {repo.forks > 0 && (
          <span className="flex items-center gap-1">
            <GitFork size={14} strokeWidth={2.5} />
            {formatCount(repo.forks)}
          </span>
        )}
      </div>

      {repo.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {repo.tags.slice(0, 5).map((t) => (
            <TagChip key={t} label={t} colorIndex={hashIndex(t)} />
          ))}
        </div>
      )}
    </article>
  )
}
