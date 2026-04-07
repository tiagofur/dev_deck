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
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import { hashIndex } from '../lib/hash'
import { showToast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const store = useReposStore()

const tab = ref<'overview' | 'readme' | 'commands'>('overview')
const loading = ref(true)
const error = ref<string | null>(null)

// notes editing
const editingNotes = ref(false)
const notesValue = ref('')
const savingNotes = ref(false)

// tags inline editing
const tagDraft = ref('')
const tagSaving = ref(false)

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
    showToast(e.message || 'Error inesperado', 'error')
  } finally {
    savingNotes.value = false
  }
}

async function addTag(raw: string) {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '-')
  tagDraft.value = ''
  if (!t || store.currentRepo?.tags?.includes(t)) return
  tagSaving.value = true
  try {
    await store.updateRepo(id, { tags: [...(store.currentRepo?.tags ?? []), t] })
  } catch (e: any) {
    showToast(e.message || 'Error inesperado', 'error')
  } finally {
    tagSaving.value = false
  }
}

async function removeTag(tag: string) {
  if (!store.currentRepo) return
  tagSaving.value = true
  try {
    await store.updateRepo(id, { tags: store.currentRepo.tags.filter(t => t !== tag) })
  } catch (e: any) {
    showToast(e.message || 'Error inesperado', 'error')
  } finally {
    tagSaving.value = false
  }
}

function onTagKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    void addTag(tagDraft.value)
  } else if (e.key === 'Backspace' && tagDraft.value === '' && store.currentRepo?.tags?.length) {
    const tags = store.currentRepo.tags
    void removeTag(tags[tags.length - 1])
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
    showToast(e.message || 'Error inesperado', 'error')
  }
}

async function handleReorder(order: string[]) {
  try {
    await store.reorderCommands(id, order)
  } catch (e: any) {
    showToast(e.message || 'Error inesperado', 'error')
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
    showToast(e.message || 'Error inesperado', 'error')
  }
}

async function deleteRepo() {
  if (!store.currentRepo) return
  if (!confirm(`¿Borrar "${store.currentRepo.name}"? No se puede deshacer.`)) return
  try {
    await store.deleteRepo(id)
    router.push('/')
  } catch (e: any) {
    showToast(e.message || 'Error inesperado', 'error')
  }
}

const refreshing = ref(false)
const heroImgError = ref(false)

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('Copiado al portapapeles', 'success')
  } catch {
    showToast('No se pudo copiar', 'error')
  }
}

async function refreshRepo() {
  refreshing.value = true
  try {
    await store.refreshRepo(id)
  } catch (e: any) {
    showToast(e.message || 'Error inesperado', 'error')
  } finally {
    refreshing.value = false
  }
}

async function shareRepo() {
  if (!store.currentRepo) return
  if (navigator.share) {
    try {
      await navigator.share({
        title: store.currentRepo.name,
        text: store.currentRepo.description ?? store.currentRepo.name,
        url: store.currentRepo.url,
      })
    } catch { /* user canceled */ }
  } else {
    await navigator.clipboard.writeText(store.currentRepo.url)
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
            <img v-if="store.currentRepo.avatar_url && !heroImgError" :src="store.currentRepo.avatar_url"
              class="w-20 h-20 border-3 border-ink shrink-0 bg-bg-elevated"
              @error="heroImgError = true" />
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
        <template v-if="tab === 'overview'">

          <!-- Notes card -->
          <div class="bg-bg-card border-3 border-ink shadow-hard p-5">
            <!-- Edit mode header -->
            <template v-if="editingNotes">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-display font-black uppercase text-sm tracking-widest">Editando notas</h3>
                <div class="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm"
                    @click="editingNotes = false" :disabled="savingNotes">
                    <span class="flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      Cancelar
                    </span>
                  </Button>
                  <Button type="button" variant="accent" size="sm"
                    @click="saveNotes" :disabled="savingNotes">
                    <span class="flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v13a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      {{ savingNotes ? 'Guardando…' : 'Guardar' }}
                    </span>
                  </Button>
                </div>
              </div>
              <textarea v-model="notesValue" autofocus rows="10"
                placeholder="Escribí tus notas en markdown…&#10;&#10;Tip: # heading, **bold**, `code`, - lista"
                class="w-full border-2 border-ink p-3 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10 resize-y" />
            </template>

            <!-- View mode -->
            <template v-else>
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-display font-black uppercase text-sm tracking-widest">Notas</h3>
                <Button type="button" variant="secondary" size="sm"
                  @click="editingNotes = true; notesValue = store.currentRepo?.notes || ''">
                  <span class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar
                  </span>
                </Button>
              </div>
              <button v-if="!store.currentRepo?.notes?.trim()"
                @click="editingNotes = true; notesValue = ''"
                class="w-full text-left font-mono text-sm text-ink-soft italic border-2 border-dashed border-ink/30 p-4 hover:bg-accent-yellow/10 transition-colors">
                <svg class="w-3.5 h-3.5 inline mr-2" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Sin notas. Click para empezar a escribir.
              </button>
              <MarkdownRenderer v-else :content="store.currentRepo.notes!" />
            </template>
          </div>

          <!-- Tags card -->
          <div class="bg-bg-card border-3 border-ink shadow-hard p-5">
            <h3 class="font-display font-black uppercase text-sm tracking-widest mb-3">Tags</h3>

            <div class="flex flex-wrap gap-2 mb-3">
              <p v-if="!store.currentRepo?.tags?.length" class="font-mono text-sm text-ink-soft italic">— sin tags —</p>
              <span v-for="tag in store.currentRepo?.tags" :key="tag"
                :class="[
                  'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-mono font-semibold border-2 border-ink shadow-hard-sm',
                  ['bg-accent-yellow','bg-accent-cyan','bg-accent-lime','bg-accent-lavender','bg-accent-orange'][Math.abs(hashIndex(tag)) % 5]
                ]">
                {{ tag }}
                <button type="button" @click="removeTag(tag)" :disabled="tagSaving"
                  class="border-l-2 border-ink/40 ml-1 pl-1 hover:text-danger transition-colors"
                  :aria-label="`Quitar ${tag}`">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </span>
            </div>

            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <input v-model="tagDraft" type="text" placeholder="agregar tag (Enter)"
                :disabled="tagSaving"
                @keydown="onTagKey"
                @blur="tagDraft.trim() && addTag(tagDraft)"
                class="flex-1 border-2 border-ink px-2 py-1 font-mono text-sm focus:outline-none focus:bg-accent-yellow/10" />
            </div>
          </div>

        </template>

        <!-- README -->
        <template v-if="tab === 'readme'">
          <!-- Non-GitHub repo -->
          <div v-if="store.currentRepo.source !== 'github'"
            class="bg-bg-card border-3 border-ink shadow-hard p-10 text-center">
            <svg class="w-12 h-12 mx-auto mb-4 text-ink-soft" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <h3 class="font-display font-black uppercase text-lg mb-2">Solo repos de GitHub</h3>
            <p class="font-mono text-sm text-ink-soft">Este repo no es de GitHub — no hay README disponible.</p>
          </div>

          <!-- GitHub but no README -->
          <div v-else-if="!store.readme"
            class="bg-bg-card border-3 border-ink shadow-hard p-12 text-center">
            <svg class="w-12 h-12 mx-auto mb-4 text-ink-soft" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <h3 class="font-display font-black uppercase text-lg mb-2">Sin README</h3>
            <p class="font-mono text-sm text-ink-soft">Este repo no tiene un archivo README.md.</p>
          </div>

          <!-- Rendered README -->
          <div v-else class="bg-bg-card border-3 border-ink shadow-hard p-6">
            <MarkdownRenderer :content="store.readme" :repoUrl="store.currentRepo.url" />
          </div>
        </template>

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
      <aside class="lg:sticky lg:top-6">
        <div class="bg-bg-card border-3 border-ink shadow-hard p-5">
          <h3 class="font-display font-black uppercase text-sm tracking-widest mb-4">Acciones</h3>

          <div class="grid grid-cols-1 gap-2">
            <!-- Abrir en browser — primary (pink) -->
            <a v-if="store.currentRepo.url" :href="store.currentRepo.url" target="_blank" rel="noopener"
              class="flex items-center justify-center gap-2 w-full border-3 border-ink px-5 py-3 text-sm
                     bg-accent-pink font-display font-bold uppercase tracking-wide shadow-hard
                     hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
                     active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
                     transition-all duration-150 ease-out">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Abrir en browser
            </a>

            <!-- Copiar URL — secondary -->
            <Button variant="secondary" class="w-full flex items-center justify-center gap-2"
              @click="copyToClipboard(store.currentRepo!.url)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Copiar URL
            </Button>

            <!-- Copiar git clone — secondary -->
            <Button variant="secondary" class="w-full flex items-center justify-center gap-2"
              @click="copyToClipboard(store.currentRepo!.source === 'github' ? `git clone ${store.currentRepo!.url}.git` : `git clone ${store.currentRepo!.url}`)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              Copiar git clone
            </Button>

            <!-- Compartir — secondary -->
            <Button variant="secondary" class="w-full flex items-center justify-center gap-2" @click="shareRepo">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Compartir
            </Button>

            <!-- Refrescar — accent (yellow) -->
            <Button variant="accent" class="w-full flex items-center justify-center gap-2"
              @click="refreshRepo" :disabled="refreshing">
              <svg :class="['w-4 h-4', refreshing ? 'animate-spin' : '']" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {{ refreshing ? 'Refrescando…' : 'Refrescar metadata' }}
            </Button>

            <div class="border-t-2 border-ink/20 my-1" />

            <!-- Archivar — secondary -->
            <Button variant="secondary" class="w-full flex items-center justify-center gap-2" @click="toggleArchive">
              <svg v-if="store.currentRepo.archived" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
                <polyline points="10 12 12 14 14 12"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
              {{ store.currentRepo.archived ? 'Desarchivar' : 'Archivar' }}
            </Button>

            <!-- Borrar — danger (red) -->
            <Button variant="danger" class="w-full flex items-center justify-center gap-2" @click="deleteRepo">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Borrar repo
            </Button>
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
