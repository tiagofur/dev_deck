<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Command, CreateCommandInput } from '../stores/repos'
import Button from './Button.vue'

const props = defineProps<{
  editing?: Command | null
  saving?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [input: CreateCommandInput]
}>()

type Category = 'install' | 'dev' | 'test' | 'build' | 'deploy' | 'lint' | 'db' | 'other'

const CATEGORIES: Category[] = ['install', 'dev', 'test', 'build', 'deploy', 'lint', 'db', 'other']

const label = ref('')
const command = ref('')
const description = ref('')
const category = ref<Category | ''>('')

watch(() => props.editing, (cmd) => {
  if (cmd) {
    label.value = cmd.label
    command.value = cmd.command
    description.value = cmd.description || ''
    category.value = (cmd.category as Category) || ''
  } else {
    label.value = ''
    command.value = ''
    description.value = ''
    category.value = ''
  }
}, { immediate: true })

function submit() {
  if (!label.value.trim() || !command.value.trim()) return
  emit('submit', {
    label: label.value.trim(),
    command: command.value.trim(),
    description: description.value.trim(),
    category: category.value || null,
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-accent-cyan/40"
      @click.self="emit('close')">
      <form @submit.prevent="submit"
        class="bg-bg-card border-5 border-ink shadow-hard-xl p-7 w-full max-w-xl">
        <header class="flex items-center justify-between mb-5">
          <h2 class="font-display font-black text-2xl uppercase">
            {{ editing ? 'Editar comando' : 'Nuevo comando' }}
          </h2>
          <button type="button" @click="emit('close')" class="border-3 border-ink p-1 hover:bg-accent-pink transition-colors">
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <div class="space-y-4">
          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Label</label>
            <input v-model="label" autofocus maxlength="80" placeholder="Dev server"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
            <p class="text-xs text-ink-soft font-mono mt-1">Cómo lo vas a recordar</p>
          </div>

          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Command</label>
            <input v-model="command" maxlength="500" placeholder="pnpm dev"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20" />
            <p class="text-xs text-ink-soft font-mono mt-1">El string que copiamos al clipboard</p>
          </div>

          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Descripción <span class="font-normal normal-case">(opcional)</span></label>
            <textarea v-model="description" rows="2" placeholder="Levanta el server con HMR"
              class="w-full border-3 border-ink p-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none" />
          </div>

          <div>
            <label class="block font-display font-bold text-xs uppercase tracking-wider mb-1">Categoría <span class="font-normal normal-case">(opcional)</span></label>
            <div class="flex flex-wrap gap-2">
              <button type="button" @click="category = ''"
                :class="['px-2 py-1 text-xs font-mono font-bold uppercase border-2 border-ink transition-colors', category === '' ? 'bg-accent-yellow shadow-hard-sm' : 'bg-bg-card hover:bg-bg-elevated']">
                —
              </button>
              <button v-for="cat in CATEGORIES" :key="cat" type="button" @click="category = cat"
                :class="['px-2 py-1 text-xs font-mono font-bold uppercase border-2 border-ink transition-colors', category === cat ? 'bg-accent-yellow shadow-hard-sm' : 'bg-bg-card hover:bg-bg-elevated']">
                {{ cat }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="mt-4 p-3 bg-danger text-white border-3 border-ink font-bold text-sm">
          {{ errorMessage }}
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" @click="emit('close')">Cancelar</Button>
          <Button type="submit" size="sm" :disabled="saving || !label.trim() || !command.trim()">
            {{ saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear') }}
          </Button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
