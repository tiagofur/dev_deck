<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { PackageScript } from '../stores/repos'

const props = defineProps<{
  scripts: PackageScript[]
  loading?: boolean
  saving?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  close: []
  import: [scripts: PackageScript[]]
}>()

const selected = ref<Set<string>>(new Set())

watch(() => props.scripts, (scripts) => {
  if (scripts.length > 0) {
    selected.value = new Set(scripts.map(s => s.name))
  }
}, { immediate: true })

const sorted = computed(() => [...props.scripts].sort((a, b) => a.name.localeCompare(b.name)))
const allSelected = computed(() => selected.value.size === props.scripts.length && props.scripts.length > 0)

function toggle(name: string) {
  const next = new Set(selected.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  selected.value = next
}

function toggleAll() {
  if (allSelected.value) selected.value = new Set()
  else selected.value = new Set(props.scripts.map(s => s.name))
}

function guessCategory(name: string): string | null {
  const l = name.toLowerCase()
  if (l === 'install' || l === 'postinstall' || l === 'preinstall') return 'install'
  if (l.startsWith('dev') || l === 'start' || l === 'serve') return 'dev'
  if (l.includes('test') || l.includes('spec')) return 'test'
  if (l.includes('build') || l.includes('compile')) return 'build'
  if (l.includes('deploy') || l.includes('release') || l.includes('publish')) return 'deploy'
  if (l.includes('lint') || l.includes('format') || l.includes('prettier') || l.includes('eslint')) return 'lint'
  if (l.includes('db') || l.includes('migrate') || l.includes('seed')) return 'db'
  return null
}

function handleImport() {
  const picked = props.scripts.filter(s => selected.value.has(s.name))
  if (!picked.length) return
  emit('import', picked)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-accent-yellow/30"
      @click.self="emit('close')">
      <div class="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <!-- Header -->
        <header class="flex items-center justify-between mb-5 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 border-3 border-ink bg-accent-lime flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            </div>
            <div>
              <h2 class="font-display font-black text-2xl uppercase">Importar scripts</h2>
              <p class="font-mono text-xs text-ink-soft">
                {{ loading ? 'Buscando package.json…' : `${scripts.length} scripts encontrados` }}
              </p>
            </div>
          </div>
          <button @click="emit('close')" class="border-3 border-ink p-1 hover:bg-accent-pink transition-colors">
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <!-- Loading -->
        <div v-if="loading" class="flex-1 flex items-center justify-center py-16">
          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-4 border-ink border-t-accent-yellow animate-spin" />
            <p class="font-mono text-sm text-ink-soft">Descargando package.json de GitHub…</p>
          </div>
        </div>

        <template v-else>
          <!-- Controls -->
          <div class="flex items-center justify-between mb-3 shrink-0 border-b-2 border-ink/10 pb-3">
            <button @click="toggleAll"
              class="font-display font-bold text-sm uppercase tracking-wide flex items-center gap-2 hover:text-accent-pink transition-colors">
              <span :class="['w-5 h-5 border-3 border-ink flex items-center justify-center text-xs', allSelected ? 'bg-accent-pink' : 'bg-bg-card']">
                <svg v-if="allSelected" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="4" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              {{ allSelected ? 'Deseleccionar todos' : 'Seleccionar todos' }}
            </button>
            <span class="font-mono text-xs text-ink-soft">{{ selected.size }} de {{ scripts.length }} seleccionados</span>
          </div>

          <!-- Scripts list -->
          <div class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            <label v-for="script in sorted" :key="script.name"
              :class="['flex items-start gap-3 p-3 border-3 border-ink cursor-pointer transition-all duration-100',
                selected.has(script.name) ? 'bg-accent-lime/20 shadow-hard-sm' : 'bg-bg-card hover:bg-bg-elevated']">
              <input type="checkbox" :checked="selected.has(script.name)" @change="toggle(script.name)" class="sr-only" />
              <span :class="['mt-0.5 w-5 h-5 shrink-0 border-3 border-ink flex items-center justify-center', selected.has(script.name) ? 'bg-accent-pink' : 'bg-bg-card']">
                <svg v-if="selected.has(script.name)" class="w-3 h-3" fill="none" stroke="white" stroke-width="4" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-display font-bold text-sm uppercase truncate">{{ script.name }}</span>
                  <span v-if="guessCategory(script.name)"
                    class="shrink-0 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border-2 border-ink bg-accent-yellow">
                    {{ guessCategory(script.name) }}
                  </span>
                </div>
                <code class="block bg-ink text-bg-primary font-mono text-xs px-2 py-1 overflow-x-auto whitespace-nowrap">{{ script.command }}</code>
              </div>
            </label>
          </div>
        </template>

        <div v-if="errorMessage" class="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm shrink-0">
          {{ errorMessage }}
        </div>

        <!-- Footer -->
        <div class="mt-5 flex items-center justify-between shrink-0 pt-4 border-t-3 border-ink">
          <p class="font-mono text-xs text-ink-soft">Cada script se crea como comando con categoría automática.</p>
          <div class="flex gap-3">
            <button @click="emit('close')"
              class="border-3 border-ink px-4 py-2 font-display font-bold uppercase text-sm shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150">
              Cancelar
            </button>
            <button @click="handleImport" :disabled="saving || selected.size === 0"
              class="border-3 border-ink px-4 py-2 bg-accent-lime font-display font-bold uppercase text-sm shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150">
              {{ saving ? 'Importando…' : `Importar ${selected.size} ${selected.size === 1 ? 'script' : 'scripts'}` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
