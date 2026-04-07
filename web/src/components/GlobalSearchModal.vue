<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { searchGlobal, type SearchResult } from '../lib/api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout>

watch(query, (q) => {
  clearTimeout(debounceTimer)
  if (q.length < 2) { results.value = []; return }
  loading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      results.value = await searchGlobal(q)
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 250)
})

watch(() => props.open, (open) => {
  if (open) {
    query.value = ''
    results.value = []
    setTimeout(() => inputRef.value?.focus(), 50)
  }
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const repos = () => results.value.filter(r => r.type === 'repo')
const cheats = () => results.value.filter(r => r.type === 'cheatsheet')
const entries = () => results.value.filter(r => r.type === 'entry')

function select(r: SearchResult) {
  emit('close')
  if (r.type === 'repo') router.push(`/repo/${r.id}`)
  else if (r.type === 'cheatsheet') router.push(`/cheatsheets/${r.id}`)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-6 bg-ink/40"
      @click.self="emit('close')"
    >
      <div class="bg-bg-card border-5 border-ink shadow-hard-xl w-full max-w-2xl max-h-[60vh] flex flex-col">
        <!-- Input -->
        <div class="flex items-center gap-3 p-4 border-b-3 border-ink shrink-0">
          <svg class="w-5 h-5 text-ink-soft shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Buscar repos, cheatsheets, comandos…"
            class="flex-1 font-mono text-sm bg-transparent focus:outline-none"
          />
          <div v-if="loading" class="w-4 h-4 border-2 border-ink border-t-accent-yellow animate-spin shrink-0" />
          <button @click="emit('close')" class="border-2 border-ink p-1 hover:bg-accent-pink transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Results -->
        <div class="flex-1 overflow-y-auto min-h-0">
          <div v-if="query.length < 2" class="p-8 text-center font-mono text-sm text-ink-soft">
            Escribí al menos 2 caracteres para buscar…
          </div>
          <div v-else-if="results.length === 0 && !loading" class="p-8 text-center font-mono text-sm text-ink-soft">
            No hay resultados para "{{ query }}"
          </div>
          <div v-else class="py-2">
            <template v-if="repos().length">
              <div class="px-4 py-1.5 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-ink-soft bg-bg-elevated">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Repos
              </div>
              <button v-for="r in repos()" :key="r.id" @click="select(r)"
                class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent-yellow/20 transition-colors">
                <div class="flex-1 min-w-0">
                  <p class="font-display font-bold text-sm uppercase truncate">{{ r.title }}</p>
                  <p class="font-mono text-xs text-ink-soft truncate">{{ r.subtitle }}</p>
                </div>
                <code v-if="r.extra" class="text-[10px] font-mono bg-ink text-bg-primary px-2 py-0.5 truncate max-w-[200px]">{{ r.extra }}</code>
              </button>
            </template>

            <template v-if="cheats().length">
              <div class="px-4 py-1.5 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-ink-soft bg-bg-elevated">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                Cheatsheets
              </div>
              <button v-for="r in cheats()" :key="r.id" @click="select(r)"
                class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent-yellow/20 transition-colors">
                <div class="flex-1 min-w-0">
                  <p class="font-display font-bold text-sm uppercase truncate">{{ r.title }}</p>
                  <p class="font-mono text-xs text-ink-soft truncate">{{ r.subtitle }}</p>
                </div>
                <code v-if="r.extra" class="text-[10px] font-mono bg-ink text-bg-primary px-2 py-0.5 truncate max-w-[200px]">{{ r.extra }}</code>
              </button>
            </template>

            <template v-if="entries().length">
              <div class="px-4 py-1.5 flex items-center gap-2 text-xs font-display font-bold uppercase tracking-widest text-ink-soft bg-bg-elevated">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Commands
              </div>
              <button v-for="r in entries()" :key="r.id" @click="select(r)"
                class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent-yellow/20 transition-colors">
                <div class="flex-1 min-w-0">
                  <p class="font-display font-bold text-sm uppercase truncate">{{ r.title }}</p>
                  <p class="font-mono text-xs text-ink-soft truncate">{{ r.subtitle }}</p>
                </div>
                <code v-if="r.extra" class="text-[10px] font-mono bg-ink text-bg-primary px-2 py-0.5 truncate max-w-[200px]">{{ r.extra }}</code>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
