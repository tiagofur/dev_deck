export type CommandCategory =
  | 'install'
  | 'dev'
  | 'test'
  | 'build'
  | 'deploy'
  | 'lint'
  | 'db'
  | 'other'

export interface RepoCommand {
  id: string
  repo_id: string
  label: string
  command: string
  description: string
  category: CommandCategory | null
  position: number
  created_at: string
}

export interface CreateCommandInput {
  label: string
  command: string
  description?: string
  category?: CommandCategory | null
}

export interface UpdateCommandInput {
  label?: string
  command?: string
  description?: string
  category?: CommandCategory | null
}

export interface PackageScript {
  name: string
  command: string
}
