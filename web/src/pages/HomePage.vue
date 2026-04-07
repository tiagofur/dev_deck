<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReposStore } from '../stores/repos'
import { useAuthStore } from '../stores/auth'
import { hashIndex } from '../lib/hash'
import AddRepoModal from '../components/AddRepoModal.vue'
import GlobalSearchModal from '../components/GlobalSearchModal.vue'
import TagChip from '../components/TagChip.vue'
import Button from '../components/Button.vue'
import Snarkel from '../components/Snarkel.vue'

const router = useRouter()
const repos = useReposStore()
const auth = useAuthStore()

const showAddModal = ref(false)
const showSearch = ref(false)
const query = ref('')
const selectedTag = ref<string | null>(null)
const selectedLang = ref<string | null>(null)

const filteredRepos = computed(() => {
  let items = repos.repos
  if (query.value) {
    const q = query.value.toLowerCase()
    items = items.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    )
  }
  if (selectedTag.value) items = items.filter(r => r.tags.includes(selectedTag.value!))
  if (selectedLang.value) items = items.filter(r => r.language === selectedLang.value)
  return items
})

const allTags = computed(() => {
  const tags = new Map<string, number>()
  for (const r of repos.repos) for (const t of r.tags) tags.set(t, (tags.get(t) || 0) + 1)
  return [...tags.entries()].sort((a, b) => b[1] - a[1])
})

const allLangs = computed(() => {
  const langs = new Map<string, number>()
  for (const r of repos.repos) {
    if (r.language) langs.set(r.language, (langs.get(r.language) || 0) + 1)
  }
  return [...langs.entries()].sort((a, b) => b[1] - a[1])
})

/** Tiny deterministic rotation for card personality (-1°, 0°, +1°) */
function cardRotation(id: string): number {
  return (id.charCodeAt(0) % 3) - 1
}

function logout() {
  auth.logout()
  router.push('/login')
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); showSearch.value = true; return }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); showAddModal.value = true; return }
  if (e.key === 'd' && !inInput && !e.ctrlKey && !e.metaKey) { router.push('/discovery'); return }
  if (e.key === '/' && !inInput) {
    e.preventDefault()
    document.getElementById('topbar-search')?.focus()
  }
}

onMounted(() => { repos.fetchRepos(); window.addEventListener('keydown', onKeydown) })
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="h-screen flex flex-col bg-bg-primary">

    <!-- ─── Topbar ─────────────────────────────────────────────────────── -->
    <header class="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
      <h1
        class="font-display font-black text-2xl uppercase tracking-tight whitespace-nowrap cursor-pointer"
        @click="router.push('/')"
      >
        Dev<span class="bg-accent-pink px-1.5 border-2 border-ink">Deck</span>
      </h1>

      <!-- Search with icon -->
      <div class="flex-1 max-w-xl mx-auto relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-ink-soft"
          fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          id="topbar-search"
          v-model="query"
          type="search"
          placeholder="Buscar repos…  (presioná /)"
          class="w-full border-3 border-ink pl-10 pr-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
        />
      </div>

      <!-- Global search button -->
      <Button variant="ghost" size="sm" class="whitespace-nowrap" title="Ctrl+K" @click="showSearch = true">
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span class="hidden sm:inline">Search</span>
        </span>
      </Button>

      <!-- Cheats -->
      <Button variant="secondary" size="sm" class="whitespace-nowrap" @click="router.push('/cheatsheets')">
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          <span class="hidden sm:inline">Cheats</span>
        </span>
      </Button>

      <!-- Discover -->
      <Button variant="accent" size="sm" class="whitespace-nowrap" title="D" @click="router.push('/discovery')">
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <path d="M5 3l14 9-14 9V3z"/>
          </svg>
          Discover
        </span>
      </Button>

      <!-- Add -->
      <Button size="sm" class="whitespace-nowrap" title="Ctrl+N" @click="showAddModal = true">
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add
        </span>
      </Button>

      <!-- Settings/Logout -->
      <button
        @click="logout"
        title="Salir"
        class="border-3 border-ink p-2 bg-bg-card shadow-hard
               hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
               active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm
               transition-all duration-150"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      </button>
    </header>

    <!-- ─── Body ──────────────────────────────────────────────────────── -->
    <div class="flex-1 flex overflow-hidden">

      <!-- Sidebar -->
      <aside class="w-56 shrink-0 border-r-3 border-ink bg-bg-elevated p-5 overflow-y-auto">
        <h3 class="font-display font-black text-xs uppercase tracking-widest mb-3">Tags</h3>
        <div class="space-y-1 mb-6">
          <button
            @click="selectedTag = null"
            :class="['w-full flex justify-between px-2 py-1 text-sm font-mono border-2 transition-colors',
              !selectedTag ? 'bg-accent-yellow border-ink shadow-hard-sm' : 'border-transparent hover:border-ink']"
          >
            <span>Todas</span>
          </button>
          <button
            v-for="[tag, count] in allTags" :key="tag"
            @click="selectedTag = selectedTag === tag ? null : tag"
            :class="['w-full flex justify-between items-center px-2 py-1 text-sm font-mono border-2 transition-colors',
              selectedTag === tag ? 'bg-accent-yellow border-ink shadow-hard-sm' : 'border-transparent hover:border-ink']"
          >
            <span class="truncate">{{ tag }}</span>
            <span class="text-ink-soft text-xs ml-1 shrink-0">{{ count }}</span>
          </button>
        </div>

        <h3 class="font-display font-black text-xs uppercase tracking-widest mb-3">Languages</h3>
        <div class="space-y-1">
          <button
            v-for="[lang, count] in allLangs" :key="lang"
            @click="selectedLang = selectedLang === lang ? null : lang"
            :class="['w-full flex justify-between items-center px-2 py-1 text-sm font-mono border-2 transition-colors',
              selectedLang === lang ? 'bg-accent-yellow border-ink shadow-hard-sm' : 'border-transparent hover:border-ink']"
          >
            <span class="truncate">{{ lang }}</span>
            <span class="text-ink-soft text-xs ml-1 shrink-0">{{ count }}</span>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main class="flex-1 overflow-y-auto p-6">
        <div v-if="repos.loading" class="flex items-center justify-center py-20 font-mono text-ink-soft">
          Cargando repos…
        </div>

        <template v-else>
          <p class="font-mono text-xs text-ink-soft mb-4">{{ filteredRepos.length }} repos</p>

          <!-- Empty state -->
          <div v-if="!filteredRepos.length" class="flex flex-col items-center justify-center py-20 gap-4">
            <div class="w-16 h-16 border-3 border-ink bg-accent-yellow flex items-center justify-center text-2xl">🦎</div>
            <p class="font-display font-black text-xl uppercase">
              {{ query || selectedTag || selectedLang ? 'Sin resultados' : 'No hay repos' }}
            </p>
            <p class="font-mono text-sm text-ink-soft">
              {{ query || selectedTag || selectedLang ? 'Probá con otro filtro.' : 'Agregá tu primer repo con Add.' }}
            </p>
          </div>

          <!-- Repo grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <article
              v-for="repo in filteredRepos" :key="repo.id"
              @click="router.push(`/repo/${repo.id}`)"
              class="group bg-bg-card border-3 border-ink shadow-hard p-5 cursor-pointer
                     transition-all duration-150 ease-out
                     hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                     active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm"
              :style="{ transform: `rotate(${cardRotation(repo.id)}deg)` }"
            >
              <header class="flex items-start gap-3 mb-3">
                <img v-if="repo.avatar_url" :src="repo.avatar_url" alt=""
                  class="w-12 h-12 border-2 border-ink shrink-0 bg-bg-elevated" loading="lazy" />
                <div v-else
                  class="w-12 h-12 border-2 border-ink shrink-0 bg-accent-yellow flex items-center justify-center font-display font-black text-xl">
                  {{ (repo.name[0] ?? '?').toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-display font-bold text-xl leading-tight truncate">
                    {{ repo.owner ? `${repo.owner}/${repo.name}` : repo.name }}
                  </h3>
                  <p v-if="repo.description" class="text-sm text-ink-soft line-clamp-2 mt-1">{{ repo.description }}</p>
                </div>
                <!-- External link icon, appears on hover -->
                <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </header>

              <div class="flex items-center gap-4 text-xs font-mono mb-3">
                <span v-if="repo.language" class="flex items-center gap-1.5">
                  <span class="w-3 h-3 border border-ink" :style="{ backgroundColor: repo.language_color || '#888' }" />
                  {{ repo.language }}
                </span>
                <span v-if="repo.stars" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  {{ repo.stars }}
                </span>
              </div>

              <!-- Tags with TagChip -->
              <div v-if="repo.tags.length" class="flex flex-wrap gap-1.5">
                <TagChip
                  v-for="tag in repo.tags.slice(0, 5)" :key="tag"
                  :label="tag"
                  :colorIndex="hashIndex(tag)"
                />
              </div>
            </article>
          </div>
        </template>
      </main>
    </div>

    <!-- Mascot -->
    <Snarkel />
  </div>

  <AddRepoModal v-if="showAddModal" @close="showAddModal = false" />
  <GlobalSearchModal :open="showSearch" @close="showSearch = false" />
</template>
