import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'

export interface Cheatsheet {
  id: string
  title: string
  slug: string
  description: string
  category: string
  icon: string | null
  color: string | null
  tags: string[]
  entries_count: number
  is_seed: boolean
  repo_id: string | null
  created_at: string
  updated_at: string
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

export const useCheatsheetsStore = defineStore('cheatsheets', () => {
  const cheatsheets = ref<Cheatsheet[]>([])
  const currentCheatsheet = ref<Cheatsheet | null>(null)
  const entries = ref<Entry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCheatsheets() {
    loading.value = true
    error.value = null
    try {
      cheatsheets.value = await api.get<Cheatsheet[]>('/cheatsheets')
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchCheatsheet(id: string) {
    loading.value = true
    error.value = null
    try {
      currentCheatsheet.value = await api.get<Cheatsheet>(`/cheatsheets/${id}`)
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchEntries(cheatsheetId: string) {
    try {
      entries.value = await api.get<Entry[]>(`/cheatsheets/${cheatsheetId}/entries`)
    } catch {
      entries.value = []
    }
  }

  async function createCheatsheet(data: Partial<Cheatsheet>) {
    const created = await api.post<Cheatsheet>('/cheatsheets', data)
    cheatsheets.value = [...cheatsheets.value, created]
    return created
  }

  async function updateCheatsheet(id: string, data: Partial<Cheatsheet>) {
    const updated = await api.patch<Cheatsheet>(`/cheatsheets/${id}`, data)
    const idx = cheatsheets.value.findIndex((c) => c.id === id)
    if (idx >= 0) cheatsheets.value[idx] = updated
    if (currentCheatsheet.value?.id === id) currentCheatsheet.value = updated
    return updated
  }

  async function deleteCheatsheet(id: string) {
    await api.delete(`/cheatsheets/${id}`)
    cheatsheets.value = cheatsheets.value.filter((c) => c.id !== id)
  }

  async function addEntry(cheatsheetId: string, data: { label: string; command: string; description?: string; tags?: string[] }) {
    const created = await api.post<Entry>(`/cheatsheets/${cheatsheetId}/entries`, data)
    entries.value = [...entries.value, created]
    return created
  }

  async function updateEntry(cheatsheetId: string, entryId: string, data: Partial<Entry>) {
    const updated = await api.patch<Entry>(`/cheatsheets/${cheatsheetId}/entries/${entryId}`, data)
    entries.value = entries.value.map((e) => (e.id === entryId ? updated : e))
    return updated
  }

  async function deleteEntry(cheatsheetId: string, entryId: string) {
    await api.delete(`/cheatsheets/${cheatsheetId}/entries/${entryId}`)
    entries.value = entries.value.filter((e) => e.id !== entryId)
  }

  async function fetchRepoCheatsheets(repoId: string) {
    try {
      return await api.get<Cheatsheet[]>(`/repos/${repoId}/cheatsheets`)
    } catch {
      return []
    }
  }

  async function linkCheatsheetToRepo(repoId: string, cheatsheetId: string) {
    await api.post(`/repos/${repoId}/cheatsheets/${cheatsheetId}`)
  }

  async function unlinkCheatsheetFromRepo(repoId: string, cheatsheetId: string) {
    await api.delete(`/repos/${repoId}/cheatsheets/${cheatsheetId}`)
  }

  return {
    cheatsheets,
    currentCheatsheet,
    entries,
    loading,
    error,
    fetchCheatsheets,
    fetchCheatsheet,
    fetchEntries,
    createCheatsheet,
    updateCheatsheet,
    deleteCheatsheet,
    addEntry,
    updateEntry,
    deleteEntry,
    fetchRepoCheatsheets,
    linkCheatsheetToRepo,
    unlinkCheatsheetFromRepo,
  }
})
