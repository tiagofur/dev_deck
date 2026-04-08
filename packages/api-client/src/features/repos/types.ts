// Mirror of backend `internal/domain/repos/repo.go` Repo type.
// Kept hand-written for Wave 1; in Wave 4 we'll generate from OpenAPI.

export interface Repo {
  id: string
  url: string
  source: 'github' | 'generic'
  owner: string | null
  name: string
  description: string | null
  language: string | null
  language_color: string | null
  stars: number
  forks: number
  avatar_url: string | null
  og_image_url: string | null
  homepage: string | null
  topics: string[]
  notes: string
  tags: string[]
  archived: boolean
  added_at: string
  last_fetched_at: string | null
  last_seen_at: string | null
}

export interface ListResult {
  total: number
  items: Repo[]
}

export interface CreateRepoInput {
  url: string
  tags?: string[]
  notes?: string
}

export interface UpdateRepoInput {
  notes?: string
  tags?: string[]
  archived?: boolean
}

export interface ListReposParams {
  q?: string
  lang?: string
  tag?: string
  sort?: 'added_desc' | 'added_asc' | 'stars_desc' | 'name_asc'
  archived?: boolean
}
