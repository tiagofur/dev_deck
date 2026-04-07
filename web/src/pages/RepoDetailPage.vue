<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReposStore } from '../stores/repos'
import type { Command, CreateCommandInput, PackageScript } from '../stores/repos'
import CommandsList from '../components/CommandsList.vue'
import AddCommandModal from '../components/AddCommandModal.vue'
import ImportScriptsModal from '../components/ImportScriptsModal.vue'
import Button from '../components/Button.vue'
import TagChip from '../components/TagChip.vue'
import { hashIndex } from '../lib/hash'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const store = useReposStore()

const tab = ref<'overview' | 'readme' | 'commands'>('overview')
const loading = ref(true)
const error = ref<string | null>(null)

// notes / tags editing
const editingNotes = ref(false)
const notesValue = ref('')
const savingNotes = ref(false)
const editingTags = ref(false)
const tagsValue = ref('')
const savingTags = ref(false)

// command modals
const cmdModalOpen = ref(false)
const editingCmd = ref<Command | null>(null)
const cmdSaving = ref(false)
const cmdError = ref<string | null>(null)

const importModalOpen = ref(false)
const importSaving = ref(false)
const importError = ref<string | null>(null)
const scriptsLoading = ref(false)

async function saveNotes() {
  if (!store.currentRepo) return
  savingNotes.value = true
  try {
    await store.updateRepo(id, { notes: notesValue.value })
    editingNotes.value = false
  } catch (e: any) {
    alert(e.message)
  } finally {
    savingNotes.value = false
  }
}

async function saveTags() {
  if (!store.currentRepo) return
  savingTags.value = true
  try {
    const tags = tagsValue.value.split(',').map(t => t.trim()).filter(Boolean)
    await store.updateRepo(id, { tags })
    editingTags.value = false
  } catch (e: any) {
    alert(e.message)
  } finally {
    savingTags.value = false
  }
}

async function handleCopyCmd(cmd: Command) {
  await navigator.clipboard.writeText(cmd.command)
}

async function handleSubmitCmd(input: CreateCommandInput) {
  cmdError.value = null
  cmdSaving.value = true
  try {
    if (editingCmd.value) {
      await store.updateCommand(id, editingCmd.value.id, input)
    } else {
      await store.addCommand(id, input)
    }
    cmdModalOpen.value = false
    editingCmd.value = null
  } catch (e: any) {
    cmdError.value = e.message
  } finally {
    cmdSaving.value = false
  }
}

async function handleDeleteCmd(cmd: Command) {
  if (!confirm(`¿Borrar "${cmd.label}"?`)) return
  try {
    await store.deleteCommand(id, cmd.id)
  } catch (e: any) {
    alert(e.message)
  }
}

async function handleReorder(order: string[]) {
  try {
    await store.reorderCommands(id, order)
  } catch (e: any) {
    alert(e.message)
  }
}

async function openImportModal() {
  importModalOpen.value = true
  importError.value = null
  scriptsLoading.value = true
  try {
    await store.fetchPackageScripts(id)
  } finally {
    scriptsLoading.value = false
  }
}

async function handleImportScripts(scripts: PackageScript[]) {
  importSaving.value = true
  importError.value = null
  try {
    type Cat = 'install' | 'dev' | 'test' | 'build' | 'deploy' | 'lint' | 'db' | 'other'
    const inputs: CreateCommandInput[] = scripts.map(s => {
      const l = s.name.toLowerCase()
      let category: Cat | null = null
      if (l === 'install' || l === 'postinstall' || l === 'preinstall') category = 'install'
      else if (l.startsWith('dev') || l === 'start' || l === 'serve') category = 'dev'
      else if (l.includes('test') || l.includes('spec')) category = 'test'
      else if (l.includes('build') || l.includes('compile')) category = 'build'
      else if (l.includes('deploy') || l.includes('release') || l.includes('publish')) category = 'deploy'
      else if (l.includes('lint') || l.includes('format') || l.includes('prettier') || l.includes('eslint')) category = 'lint'
      else if (l.includes('db') || l.includes('migrate') || l.includes('seed')) category = 'db'
      return { label: s.name, command: s.command, category }
    })
    await store.batchCreateCommands(id, inputs)
    importModalOpen.value = false
  } catch (e: any) {
    importError.value = e.message
  } finally {
    importSaving.value = false
  }
}

async function toggleArchive() {
  if (!store.currentRepo) return
  try {
    await store.updateRepo(id, { archived: !store.currentRepo.archived })
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteRepo() {
  if (!store.currentRepo) return
  if (!confirm(`¿Borrar "${store.currentRepo.name}"? No se puede deshacer.`)) return
  try {
    await store.deleteRepo(id)
    router.push('/')
  } catch (e: any) {
    alert(e.message)
  }
}

async function refreshRepo() {
  try {
    await store.refreshRepo(id)
  } catch (e: any) {
    alert(e.message)
  }
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    await Promise.all([
      store.fetchRepo(id),
      store.fetchCommands(id),
      store.fetchReadme(id),
    ])
    notesValue.value = store.currentRepo?.notes || ''
    tagsValue.value = (store.currentRepo?.tags || []).join(', ')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-bg-primary">
    <!-- Header -->
    <header class="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
      <button @click="router.push('/')"
        class="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h1 v-if="store.currentRepo" class="font-display font-black text-2xl uppercase tracking-tight truncate flex-1">
        {{ store.currentRepo.owner ? `${store.currentRepo.owner}/${store.currentRepo.name}` : store.currentRepo.name }}
      </h1>
      <span v-if="store.currentRepo?.archived" class="px-2 py-0.5 text-xs font-mono font-bold border-2 border-ink bg-accent-orange shrink-0">
        ARCHIVADO
      </span>
    </header>

    <div v-if="loading" class="flex items-center justify-center py-20 font-mono text-ink-soft">Cargando…</div>
    <div v-else-if="error" class="flex items-center justify-center py-20 font-mono text-danger">{{ error }}</div>

    <div v-else-if="store.currentRepo" class="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

      <!-- ─── Main column (2/3) ─────────────────────────── -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Hero -->
        <section class="bg-bg-card border-3 border-ink shadow-hard p-6">
          <div class="flex items-start gap-4">
            <img v-if="store.currentRepo.avatar_url" :src="store.currentRepo.avatar_url"
              class="w-20 h-20 border-3 border-ink shrink-0 bg-bg-elevated" />
            <div v-else
              class="w-20 h-20 border-3 border-ink bg-accent-yellow flex items-center justify-center font-display font-black text-3xl shrink-0">
              {{ store.currentRepo.name[0]?.toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-mono text-xs text-ink-soft mb-1">{{ store.currentRepo.source }}</p>
              <h2 class="font-display font-black text-3xl leading-tight mb-2">{{ store.currentRepo.name }}</h2>
              <p v-if="store.currentRepo.description" class="text-ink-soft text-sm">{{ store.currentRepo.description }}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t-2 border-ink/10 font-mono text-sm">
            <span v-if="store.currentRepo.language" class="flex items-center gap-2">
              <span class="w-3 h-3 border border-ink" :style="{ backgroundColor: store.currentRepo.language_color || '#888' }" />
              {{ store.currentRepo.language }}
            </span>
            <span v-if="store.currentRepo.stars" class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              {{ store.currentRepo.stars }}
            </span>
            <span v-if="store.currentRepo.forks" class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a9 9 0 01-9 9"/></svg>
              {{ store.currentRepo.forks }}
            </span>
            <span v-if="store.currentRepo.archived"
              class="px-2 py-0.5 text-[10px] font-mono font-bold border-2 border-ink bg-accent-orange">ARCHIVADO</span>
          </div>

          <div v-if="store.currentRepo.topics?.length" class="mt-4 pt-3 border-t-2 border-ink/10 flex flex-wrap gap-2">
            <TagChip
              v-for="t in store.currentRepo.topics" :key="t"
              :label="t"
              :colorIndex="hashIndex(t)"
            />
          </div>
        </section>

        <!-- Tabs -->
        <div class="flex gap-0 border-b-3 border-ink">
          <button v-for="t in (['overview', 'readme', 'commands'] as const)" :key="t"
            @click="tab = t"
            :class="['flex items-center gap-2 px-4 py-2 -mb-[3px] font-display font-bold uppercase text-sm tracking-wide border-3 border-b-0 transition-colors',
              tab === t ? 'border-ink bg-bg-card' : 'border-transparent text-ink-soft hover:text-ink']">
            <!-- overview icon -->
            <svg v-if="t === 'overview'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <!-- readme icon -->
            <svg v-else-if="t === 'readme'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <!-- commands icon -->
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            {{ t }}
            <span v-if="t === 'commands' && store.commands.length"
              class="px-1.5 py-0.5 text-[10px] bg-ink text-bg-primary font-mono">
              {{ store.commands.length }}
            </span>
          </button>
        </div>

        <!-- Overview -->
        <div v-if="tab === 'overview'" class="bg-bg-card border-3 border-ink p-6 space-y-6">
          <!-- Notes -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-display font-bold uppercase">Notas</h3>
              <Button v-if="!editingNotes" size="sm" variant="ghost"
                @click="editingNotes = true; notesValue = store.currentRepo?.notes || ''">
                Editar
              </Button>
            </div>
            <div v-if="editingNotes">
              <textarea v-model="notesValue" rows="6"
                class="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none mb-3" />
              <div class="flex gap-2">
                <Button size="sm" variant="secondary" @click="editingNotes = false">Cancelar</Button>
                <Button size="sm" @click="saveNotes" :disabled="savingNotes">
                  {{ savingNotes ? 'Guardando…' : 'Guardar' }}
                </Button>
              </div>
            </div>
            <p v-else class="font-mono text-sm whitespace-pre-wrap text-ink-soft">
              {{ store.currentRepo?.notes || 'Sin notas.' }}
            </p>
          </div>

          <!-- Tags -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-display font-bold uppercase">Tags</h3>
              <Button v-if="!editingTags" size="sm" variant="ghost"
                @click="editingTags = true; tagsValue = (store.currentRepo?.tags || []).join(', ')">
                Editar
              </Button>
            </div>
            <div v-if="editingTags">
              <input v-model="tagsValue" type="text" placeholder="frontend, vue, personal"
                class="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 mb-3" />
              <div class="flex gap-2">
                <Button size="sm" variant="secondary" @click="editingTags = false">Cancelar</Button>
                <Button size="sm" @click="saveTags" :disabled="savingTags">
                  {{ savingTags ? 'Guardando…' : 'Guardar' }}
                </Button>
              </div>
            </div>
            <div v-else class="flex flex-wrap gap-2">
              <TagChip
                v-for="tag in store.currentRepo?.tags" :key="tag"
                :label="tag" :colorIndex="hashIndex(tag)"
              />
              <span v-if="!store.currentRepo?.tags?.length" class="font-mono text-xs text-ink-soft">Sin tags.</span>
            </div>
          </div>
        </div>

        <!-- README -->
        <div v-if="tab === 'readme'">
          <div v-if="store.readme"
            class="bg-bg-card border-3 border-ink p-6 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[70vh]">
            {{ store.readme }}
          </div>
          <div v-else class="text-center py-16 font-mono text-ink-soft">No hay README disponible.</div>
        </div>

        <!-- Commands -->
        <div v-if="tab === 'commands'">
          <div class="flex items-center justify-between mb-4 gap-3">
            <p class="font-mono text-sm text-ink-soft">
              <template v-if="!store.commands.length">Sin comandos — agregá tus <code class="bg-bg-elevated px-1">pnpm dev</code>, <code class="bg-bg-elevated px-1">make migrate</code>…</template>
              <template v-else>{{ store.commands.length }} {{ store.commands.length === 1 ? 'comando' : 'comandos' }} — arrastrá para reordenar.</template>
            </p>
            <div class="flex gap-2 shrink-0">
              <Button v-if="store.currentRepo?.source === 'github'" size="sm" variant="secondary"
                @click="openImportModal" class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                Importar scripts
              </Button>
              <Button size="sm" @click="cmdModalOpen = true; editingCmd = null">+ Nuevo</Button>
            </div>
          </div>

          <div v-if="!store.commands.length" class="bg-bg-card border-3 border-dashed border-ink/40 p-12 text-center">
            <svg class="w-12 h-12 mx-auto mb-4 text-ink-soft" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <p class="font-mono text-sm text-ink-soft mb-4">Vacío. Pegá tu primer comando.</p>
            <Button @click="cmdModalOpen = true; editingCmd = null">Crear comando</Button>
          </div>

          <CommandsList v-else
            :commands="store.commands"
            @reorder="handleReorder"
            @edit="(cmd) => { editingCmd = cmd; cmdModalOpen = true }"
            @delete="handleDeleteCmd"
            @copy="handleCopyCmd"
          />
        </div>
      </div>

      <!-- ─── Actions sidebar (1/3, sticky) ────────────── -->
      <aside class="lg:sticky lg:top-6 space-y-3">
        <div class="bg-bg-card border-3 border-ink shadow-hard p-4 space-y-2">
          <h3 class="font-display font-black text-xs uppercase tracking-widest mb-3">Acciones</h3>

          <a v-if="store.currentRepo.url" :href="store.currentRepo.url" target="_blank" rel="noopener"
            class="flex items-center gap-2 w-full border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs shadow-hard bg-bg-card
                   hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg hover:bg-accent-lime
                   active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Abrir en browser
          </a>

          <button @click="() => navigator.clipboard.writeText(store.currentRepo!.url)"
            class="flex items-center gap-2 w-full border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs shadow-hard bg-bg-card
                   hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg hover:bg-accent-yellow
                   active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Copiar URL
          </button>

          <button @click="() => navigator.clipboard.writeText(`git clone ${store.currentRepo!.url}`)"
            class="flex items-center gap-2 w-full border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs shadow-hard bg-bg-card
                   hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg hover:bg-accent-cyan
                   active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            Copiar git clone
          </button>

          <div class="border-t-2 border-ink/10 pt-2 space-y-2">
            <button @click="refreshRepo"
              class="flex items-center gap-2 w-full border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs shadow-hard bg-bg-card
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg hover:bg-accent-lavender
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Refrescar metadata
            </button>

            <button @click="toggleArchive"
              class="flex items-center gap-2 w-full border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs shadow-hard bg-bg-card
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg hover:bg-accent-orange
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
              {{ store.currentRepo.archived ? 'Desarchivar' : 'Archivar' }}
            </button>
          </div>

          <div class="border-t-2 border-ink/10 pt-2">
            <button @click="deleteRepo"
              class="flex items-center gap-2 w-full border-3 border-ink px-3 py-2 font-display font-bold uppercase text-xs shadow-hard bg-bg-card
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg hover:bg-danger hover:text-white
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm transition-all duration-150">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Borrar repo
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Modals -->
    <AddCommandModal
      v-if="cmdModalOpen"
      :editing="editingCmd"
      :saving="cmdSaving"
      :error-message="cmdError"
      @close="cmdModalOpen = false; editingCmd = null; cmdError = null"
      @submit="handleSubmitCmd"
    />

    <ImportScriptsModal
      v-if="importModalOpen"
      :scripts="store.packageScripts"
      :loading="scriptsLoading"
      :saving="importSaving"
      :error-message="importError"
      @close="importModalOpen = false; importError = null"
      @import="handleImportScripts"
    />
  </div>
</template>
