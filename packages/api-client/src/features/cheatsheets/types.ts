export interface Cheatsheet {
  id: string
  slug: string
  title: string
  category: string
  icon: string | null
  color: string | null
  description: string
  is_seed: boolean
  created_at: string
  updated_at: string
}

export interface CheatsheetDetail extends Cheatsheet {
  entries: Entry[]
}

export interface Entry {
  id: string
  cheatsheet_id: string
  label: string
  command: string
  description: string
  tags: string[]
  position: number
}

export interface CreateCheatsheetInput {
  slug: string
  title: string
  category: string
  icon?: string | null
  color?: string | null
  description?: string
}

export interface UpdateCheatsheetInput {
  slug?: string
  title?: string
  category?: string
  icon?: string | null
  color?: string | null
  description?: string
}

export interface CreateEntryInput {
  label: string
  command: string
  description?: string
  tags?: string[]
}

export interface UpdateEntryInput {
  label?: string
  command?: string
  description?: string
  tags?: string[]
}

export interface SearchResult {
  type: 'item' | 'repo' | 'cheatsheet' | 'entry'
  id: string
  title: string
  subtitle: string
  extra: string
}
