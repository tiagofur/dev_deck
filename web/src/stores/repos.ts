import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'

export interface Repo {
  id: string
  url: string
  source: string
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

export interface Command {
  id: string
  repo_id: string
  label: string
  command: string
  description: string
  category: string | null
  position: number
  created_at?: string
}

export interface CreateCommandInput {
  label: string
  command: string
  description?: string
  category?: string | null
}

export interface PackageScript {
  name: string
  command: string
}

export const useReposStore = defineStore('repos', () => {
  const repos = ref<Repo[]>([])
  const currentRepo = ref<Repo | null>(null)
  const commands = ref<Command[]>([])
  const packageScripts = ref<PackageScript[]>([])
  const readme = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRepos() {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ total: number; items: Repo[] }>('/repos')
      repos.value = res.items
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchRepo(id: string) {
    loading.value = true
    error.value = null
    try {
      currentRepo.value = await api.get<Repo>(`/repos/${id}`)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function updateRepo(id: string, data: { notes?: string; tags?: string[]; archived?: boolean }) {
    const updated = await api.patch<Repo>(`/repos/${id}`, data)
    const idx = repos.value.findIndex((r) => r.id === id)
    if (idx >= 0) repos.value[idx] = updated
    if (currentRepo.value?.id === id) currentRepo.value = updated
    return updated
  }

  async function refreshRepo(id: string) {
    const updated = await api.post<Repo>(`/repos/${id}/refresh`)
    const idx = repos.value.findIndex((r) => r.id === id)
    if (idx >= 0) repos.value[idx] = updated
    if (currentRepo.value?.id === id) currentRepo.value = updated
    return updated
  }

  async function fetchReadme(id: string) {
    try {
      const data = await api.get<{ content: string; format: string }>(`/repos/${id}/readme`)
      readme.value = data.content || ''
    } catch {
      readme.value = ''
    }
  }

  async function fetchCommands(id: string) {
    try {
      commands.value = await api.get<Command[]>(`/repos/${id}/commands`)
    } catch {
      commands.value = []
    }
  }

  async function fetchPackageScripts(id: string) {
    try {
      const res = await api.get<{ scripts: PackageScript[] }>(`/repos/${id}/package-scripts`)
      packageScripts.value = res.scripts
    } catch {
      packageScripts.value = []
    }
  }

  async function addCommand(repoId: string, input: CreateCommandInput) {
    const created = await api.post<Command>(`/repos/${repoId}/commands`, input)
    commands.value = [...commands.value, created]
    return created
  }

  async function updateCommand(repoId: string, cmdId: string, data: Partial<CreateCommandInput>) {
    const updated = await api.patch<Command>(`/repos/${repoId}/commands/${cmdId}`, data)
    commands.value = commands.value.map((c) => (c.id === cmdId ? updated : c))
    return updated
  }

  async function deleteCommand(repoId: string, cmdId: string) {
    await api.delete(`/repos/${repoId}/commands/${cmdId}`)
    commands.value = commands.value.filter((c) => c.id !== cmdId)
  }

  async function reorderCommands(repoId: string, order: string[]) {
    // Optimistic update
    const byId = new Map(commands.value.map((c) => [c.id, c]))
    const reordered = order.map((id) => byId.get(id)).filter((c): c is Command => !!c)
    const prev = commands.value
    commands.value = reordered
    try {
      await api.post(`/repos/${repoId}/commands/reorder`, { order })
    } catch {
      commands.value = prev
      throw new Error('No se pudo reordenar')
    }
  }

  async function batchCreateCommands(repoId: string, inputs: CreateCommandInput[]) {
    const created = await api.post<Command[]>(`/repos/${repoId}/commands/batch`, { commands: inputs })
    commands.value = [...commands.value, ...created]
    return created
  }

  async function addRepo(data: { url: string; tags: string[]; notes: string }) {
    const created = await api.post<Repo>('/repos', data)
    repos.value = [created, ...repos.value]
    return created
  }

  async function deleteRepo(id: string) {
    await api.delete(`/repos/${id}`)
    repos.value = repos.value.filter((r) => r.id !== id)
    if (currentRepo.value?.id === id) currentRepo.value = null
  }

  async function searchRepos(query: string) {
    loading.value = true
    try {
      const res = await api.get<{ total: number; items: Repo[] }>(`/repos?q=${encodeURIComponent(query)}`)
      repos.value = res.items
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    repos,
    currentRepo,
    commands,
    packageScripts,
    readme,
    loading,
    error,
    fetchRepos,
    fetchRepo,
    updateRepo,
    refreshRepo,
    addRepo,
    deleteRepo,
    fetchReadme,
    fetchCommands,
    fetchPackageScripts,
    addCommand,
    updateCommand,
    deleteCommand,
    reorderCommands,
    batchCreateCommands,
    searchRepos,
  }
})
