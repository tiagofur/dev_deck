<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCheatsheetsStore, type Entry } from '../stores/cheatsheets'
import Button from '../components/Button.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const store = useCheatsheetsStore()
const loading = ref(true)
const tagFilter = ref<string | null>(null)
const searchFilter = ref('')

// entry modal
const modalOpen = ref(false)
const editingEntry = ref<Entry | null>(null)
const entryLabel = ref('')
const entryCommand = ref('')
const entryDescription = ref('')
const entryTagsStr = ref('')
const entrySaving = ref(false)
const entryError = ref<string | null>(null)

const allTags = computed(() => {
  if (!store.currentCheatsheet) return []
  const tags = new Set<string>()
  for (const e of store.entries) for (const t of e.tags) tags.add(t)
  return [...tags].sort()
})

const filtered = computed(() => {
  return store.entries.filter((e) => {
    if (tagFilter.value && !e.tags.includes(tagFilter.value)) return false
    if (searchFilter.value) {
      const q = searchFilter.value.toLowerCase()
      return e.label.toLowerCase().includes(q) || e.command.toLowerCase().includes(q)
    }
    return true
  })
})

async function copy(cmd: string) {
  await navigator.clipboard.writeText(cmd)
}

function openCreate() {
  editingEntry.value = null
  entryLabel.value = ''
  entryCommand.value = ''
  entryDescription.value = ''
  entryTagsStr.value = ''
  entryError.value = null
  modalOpen.value = true
}

function openEdit(entry: Entry) {
  editingEntry.value = entry
  entryLabel.value = entry.label
  entryCommand.value = entry.command
  entryDescription.value = entry.description || ''
  entryTagsStr.value = entry.tags.join(', ')
  entryError.value = null
  modalOpen.value = true
}

async function submitEntry() {
  if (!entryLabel.value.trim() || !entryCommand.value.trim()) return
  entrySaving.value = true
  entryError.value = null
  try {
    const input = {
      label: entryLabel.value.trim(),
      command: entryCommand.value.trim(),
      description: entryDescription.value.trim(),
      tags: entryTagsStr.value.split(',').map(t => t.trim()).filter(Boolean),
    }
    if (editingEntry.value) {
      await store.updateEntry(id, editingEntry.value.id, input)
    } else {
      await store.addEntry(id, input)
    }
    modalOpen.value = false
    editingEntry.value = null
  } catch (e: any) {
    entryError.value = e.message || 'Error al guardar'
  } finally {
    entrySaving.value = false
  }
}

async function deleteEntry(entry: Entry) {
  if (!confirm(`¿Borrar "${entry.label}"?`)) return
  try {
    await store.deleteEntry(id, entry.id)
  } catch (e: any) {
    alert(e.message)
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchCheatsheet(id),
      store.fetchEntries(id),
    ])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-bg-primary">
    <header class="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
      <button @click="router.push('/cheatsheets')"
        class="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg transition-all duration-150">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
      </button>
      <div v-if="store.currentCheatsheet" class="w-10 h-10 border-3 border-ink flex items-center justify-center text-lg"
        :style="{ backgroundColor: (store.currentCheatsheet.color || '#888') + '30' }">
        {{ store.currentCheatsheet.icon || '📄' }}
      </div>
      <div v-if="store.currentCheatsheet" class="flex-1 min-w-0">
        <h1 class="font-display font-black text-2xl uppercase tracking-tight truncate">{{ store.currentCheatsheet.title }}</h1>
        <p class="font-mono text-xs text-ink-soft">{{ store.currentCheatsheet.category }} · {{ store.entries.length }} entries</p>
      </div>
    </header>

    <div v-if="loading" class="flex items-center justify-center py-20 font-mono text-ink-soft">Cargando…</div>

    <div v-else-if="store.currentCheatsheet" class="max-w-5xl mx-auto p-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <input v-model="searchFilter" type="search" placeholder="Filtrar entries…"
          class="border-2 border-ink px-3 py-1.5 font-mono text-xs focus:outline-none focus:bg-accent-yellow/20 w-48" />

        <div v-if="allTags.length" class="flex flex-wrap gap-1.5">
          <button @click="tagFilter = null"
            :class="['px-2 py-0.5 text-[10px] font-mono font-bold uppercase border-2 transition-colors',
              !tagFilter ? 'bg-accent-yellow border-ink' : 'border-ink/30 hover:border-ink']">
            Todas
          </button>
          <button v-for="t in allTags" :key="t" @click="tagFilter = tagFilter === t ? null : t"
            :class="['px-2 py-0.5 text-[10px] font-mono font-bold uppercase border-2 transition-colors',
              tagFilter === t ? 'bg-accent-yellow border-ink' : 'border-ink/30 hover:border-ink']">
            {{ t }}
          </button>
        </div>

        <div class="ml-auto">
          <Button size="sm" @click="openCreate">+ Nueva entry</Button>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="!filtered.length" class="text-center py-16">
        <p class="font-mono text-ink-soft">
          {{ searchFilter || tagFilter ? 'No hay entries con ese filtro.' : 'Sin entries todavía.' }}
        </p>
      </div>

      <!-- Entries -->
      <div v-else class="space-y-3">
        <div v-for="entry in filtered" :key="entry.id" class="bg-bg-card border-3 border-ink shadow-hard p-4">
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <h4 class="font-display font-bold uppercase text-base truncate">{{ entry.label }}</h4>
                <div v-if="entry.tags.length" class="flex gap-1 shrink-0">
                  <span v-for="t in entry.tags" :key="t"
                    class="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border-2 border-ink"
                    :style="{ backgroundColor: (store.currentCheatsheet?.color || '#888') + '30' }">
                    {{ t }}
                  </span>
                </div>
              </div>
              <code class="block bg-ink text-bg-primary font-mono text-xs px-3 py-2 border-2 border-ink overflow-x-auto whitespace-nowrap">{{ entry.command }}</code>
              <p v-if="entry.description" class="text-xs text-ink-soft font-mono mt-2">{{ entry.description }}</p>
            </div>

            <div class="flex flex-col gap-1 shrink-0">
              <button @click="copy(entry.command)" title="Copiar"
                class="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-lime active:translate-x-[1px] active:translate-y-[1px] transition-transform">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
              <button @click="openEdit(entry)" title="Editar"
                class="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-yellow active:translate-x-[1px] active:translate-y-[1px] transition-transform">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button @click="deleteEntry(entry)" title="Borrar"
                class="border-2 border-ink p-1.5 bg-bg-card hover:bg-danger hover:text-white active:translate-x-[1px] active:translate-y-[1px] transition-transform">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Entry modal -->
  <Teleport to="body">
    <div v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-accent-cyan/40"
      @click.self="modalOpen = false">
      <form @submit.prevent="submitEntry"
        class="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-xl">
        <header class="flex items-center justify-between mb-5">
          <h2 class="font-display font-black text-2xl uppercase">
            {{ editingEntry ? 'Editar entry' : 'Nueva entry' }}
          </h2>
          <button type="button" @click="modalOpen = false" class="border-3 border-ink p-1 hover:bg-accent-pink transition-colors">
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <div class="space-y-4">
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Label</label>
            <input v-model="entryLabel" autofocus placeholder="Stage & Commit"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
          </div>
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Command</label>
            <input v-model="entryCommand" placeholder="git add -A && git commit -m 'msg'"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
          </div>
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Descripción</label>
            <textarea v-model="entryDescription" rows="2" placeholder="Stage all changes and commit"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none" />
          </div>
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Tags (separados por coma)</label>
            <input v-model="entryTagsStr" placeholder="commit, staging, basic"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
          </div>
        </div>

        <div v-if="entryError" class="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm">{{ entryError }}</div>

        <div class="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" @click="modalOpen = false">Cancelar</Button>
          <Button type="submit" size="sm" :disabled="entrySaving || !entryLabel.trim() || !entryCommand.trim()">
            {{ entrySaving ? 'Guardando…' : (editingEntry ? 'Guardar' : 'Crear') }}
          </Button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
