<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCheatsheetsStore, type Cheatsheet } from '../stores/cheatsheets'
import Button from '../components/Button.vue'

const router = useRouter()
const store = useCheatsheetsStore()
const selectedCategory = ref<string | null>(null)
const loading = ref(true)

// ─── Create modal ───
const showCreate = ref(false)
const saving = ref(false)
const createError = ref<string | null>(null)

const form = ref({
  title: '',
  slug: '',
  category: 'tool',
  description: '',
  icon: '',
  color: '',
})

const categoryLabels: Record<string, string> = {
  vcs: 'Version Control',
  os: 'OS / CLI',
  language: 'Languages',
  framework: 'Frameworks',
  tool: 'Tools',
  'package-manager': 'Package Managers',
  editor: 'Editors',
  shell: 'Shell / Terminal',
  cloud: 'Cloud / DevOps',
  other: 'Other',
}

const categoryOptions = Object.entries(categoryLabels)

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function onTitleInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  form.value.title = val
  // Auto-generate slug only if it hasn't been manually edited
  if (!form.value.slug || form.value.slug === slugify(form.value.title.slice(0, -1))) {
    form.value.slug = slugify(val)
  }
}

function openCreate() {
  form.value = { title: '', slug: '', category: 'tool', description: '', icon: '', color: '' }
  createError.value = null
  showCreate.value = true
}

async function submitCreate() {
  if (!form.value.title.trim() || !form.value.slug.trim()) return
  saving.value = true
  createError.value = null
  try {
    const created = await store.createCheatsheet({
      title: form.value.title.trim(),
      slug: form.value.slug.trim(),
      category: form.value.category,
      description: form.value.description.trim(),
      icon: form.value.icon.trim() || undefined,
      color: form.value.color.trim() || undefined,
    })
    showCreate.value = false
    router.push(`/cheatsheets/${created.id}`)
  } catch (e: any) {
    createError.value = e.message || 'Error al crear'
  } finally {
    saving.value = false
  }
}

async function deleteCheatsheet(e: MouseEvent, id: string) {
  e.stopPropagation()
  if (!confirm('¿Borrar esta cheatsheet?')) return
  try {
    await store.deleteCheatsheet(id)
  } catch (e: any) {
    alert(e.message)
  }
}

const filtered = computed(() => {
  if (!selectedCategory.value) return store.cheatsheets
  return store.cheatsheets.filter(c => c.category === selectedCategory.value)
})

onMounted(async () => {
  try {
    await store.fetchCheatsheets()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-bg-primary flex">
    <!-- Sidebar -->
    <aside class="w-56 shrink-0 border-r-3 border-ink bg-bg-elevated p-5">
      <button @click="router.push('/')" class="flex items-center gap-2 text-sm font-mono text-ink-soft hover:text-ink mb-6 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        Volver
      </button>

      <h3 class="font-display font-black text-xs uppercase tracking-widest mb-3">Categorías</h3>
      <div class="space-y-1">
        <button @click="selectedCategory = null"
          :class="['w-full text-left px-2 py-1 text-sm font-mono border-2 transition-colors',
            !selectedCategory ? 'bg-accent-yellow border-ink shadow-hard-sm' : 'border-transparent hover:border-ink']">
          Todas
        </button>
        <button v-for="(label, key) in categoryLabels" :key="key"
          @click="selectedCategory = selectedCategory === key ? null : key"
          :class="['w-full text-left px-2 py-1 text-sm font-mono border-2 transition-colors',
            selectedCategory === key ? 'bg-accent-yellow border-ink shadow-hard-sm' : 'border-transparent hover:border-ink']">
          {{ label }}
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 p-8">
      <header class="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 class="font-display font-black text-4xl uppercase tracking-tight flex items-center gap-3">
            <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            Cheatsheets
          </h1>
          <p class="font-mono text-sm text-ink-soft mt-2">
            {{ filtered.length }} {{ filtered.length === 1 ? 'cheatsheet' : 'cheatsheets' }}
            <span v-if="selectedCategory"> en {{ categoryLabels[selectedCategory] || selectedCategory }}</span>
          </p>
        </div>

        <Button @click="openCreate" size="sm" class="flex items-center gap-2 shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Nueva cheatsheet
        </Button>
      </header>

      <div v-if="loading" class="text-center py-20 font-mono text-ink-soft">Cargando…</div>

      <div v-else-if="!filtered.length" class="text-center py-20">
        <p class="font-mono text-ink-soft">No hay cheatsheets{{ selectedCategory ? ' en esta categoría' : '' }}.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="c in filtered" :key="c.id"
          @click="router.push(`/cheatsheets/${c.id}`)"
          class="bg-bg-card border-3 border-ink shadow-hard p-5 text-left cursor-pointer
                 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
                 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm
                 transition-all duration-150 group relative">

          <!-- Delete (only non-seed) -->
          <button v-if="!c.is_seed" @click.stop="deleteCheatsheet($event, c.id)"
            class="absolute top-3 right-3 border-2 border-ink p-1 bg-bg-card
                   hover:bg-danger hover:text-white opacity-0 group-hover:opacity-100
                   active:translate-x-[1px] active:translate-y-[1px] transition-all">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>

          <div class="flex items-start gap-3 mb-3">
            <div class="w-10 h-10 border-2 border-ink flex items-center justify-center text-lg shrink-0"
                 :style="{ backgroundColor: (c.color || '#888') + '30' }">
              {{ c.icon || '📄' }}
            </div>
            <div class="min-w-0">
              <h3 class="font-display font-bold text-lg uppercase truncate group-hover:text-accent-pink transition-colors">{{ c.title }}</h3>
              <span class="inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border-2 border-ink mt-1"
                    :style="{ backgroundColor: (c.color || '#888') + '40' }">
                {{ c.category }}
              </span>
            </div>
          </div>
          <p v-if="c.description" class="font-mono text-xs text-ink-soft line-clamp-2">{{ c.description }}</p>
        </div>
      </div>
    </main>
  </div>

  <!-- Create modal -->
  <Teleport to="body">
    <div v-if="showCreate"
      class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/40"
      @click.self="showCreate = false">
      <form @submit.prevent="submitCreate"
        class="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-lg">

        <header class="flex items-center justify-between mb-5">
          <h2 class="font-display font-black text-2xl uppercase">Nueva cheatsheet</h2>
          <button type="button" @click="showCreate = false"
            class="border-3 border-ink p-1 hover:bg-accent-pink transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <div class="space-y-4">
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Título *</label>
            <input :value="form.title" @input="onTitleInput" autofocus required
              placeholder="Docker Commands"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
          </div>
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Slug *</label>
            <input v-model="form.slug" required placeholder="docker-commands"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
          </div>
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Categoría *</label>
            <select v-model="form.category"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 bg-bg-card">
              <option v-for="[val, label] in categoryOptions" :key="val" :value="val">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Descripción</label>
            <input v-model="form.description" placeholder="Quick reference for Docker commands"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
          </div>
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Ícono</label>
              <input v-model="form.icon" placeholder="🐳"
                class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
            </div>
            <div class="flex-1">
              <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Color (hex)</label>
              <input v-model="form.color" placeholder="#2496ED"
                class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
            </div>
          </div>
        </div>

        <div v-if="createError" class="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm">{{ createError }}</div>

        <div class="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" @click="showCreate = false">Cancelar</Button>
          <Button type="submit" size="sm" :disabled="saving || !form.title.trim() || !form.slug.trim()">
            {{ saving ? 'Creando…' : 'Crear cheatsheet' }}
          </Button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
