import type { Repo } from '@devdeck/api-client'
import { RepoCard } from './RepoCard'

interface Props {
  repos: Repo[]
  onSelect?: (repo: Repo) => void
}

export function RepoGrid({ repos, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {repos.map((r) => (
        <RepoCard key={r.id} repo={r} onClick={() => onSelect?.(r)} />
      ))}
    </div>
  )
}
