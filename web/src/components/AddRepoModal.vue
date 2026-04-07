<script setup lang="ts">
import { ref } from 'vue'
import { useReposStore } from '../stores/repos'
import Button from './Button.vue'

const emit = defineEmits<{ close: [] }>()

const repos = useReposStore()
const url = ref('')
const tags = ref('')
const notes = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (!url.value.trim()) return
  loading.value = true
  error.value = null
  try {
    await repos.addRepo({
      url: url.value.trim(),
      tags: tags.value ? tags.value.split(',').map(t => t.trim()).filter(Boolean) : [],
      notes: notes.value.trim(),
    })
    emit('close')
  } catch (e: any) {
    error.value = e.message || 'Error al agregar el repo.'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40" @keydown="onKeydown" @click.self="emit('close')">
    <div class="bg-bg-card border-3 border-ink shadow-hard-xl w-full max-w-md">
      <div class="border-b-3 border-ink px-6 py-4 flex items-center justify-between">
        <h2 class="font-display font-black text-xl uppercase tracking-tight">Agregar repo</h2>
        <button @click="emit('close')" class="border-2 border-ink p-1 hover:bg-accent-pink transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <form @submit.prevent="submit" class="p-6 space-y-4">
        <div>
          <label class="block font-display font-bold uppercase text-xs mb-1.5">URL del repo *</label>
          <input
            v-model="url"
            type="url"
            placeholder="https://github.com/owner/repo"
            required
            autofocus
            class="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
          />
        </div>

        <div>
          <label class="block font-display font-bold uppercase text-xs mb-1.5">Tags <span class="text-ink-soft font-normal normal-case">(separados por coma)</span></label>
          <input
            v-model="tags"
            type="text"
            placeholder="frontend, vue, personal"
            class="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20"
          />
        </div>

        <div>
          <label class="block font-display font-bold uppercase text-xs mb-1.5">Notas</label>
          <textarea
            v-model="notes"
            rows="3"
            placeholder="Por qué lo guardaste, qué hace, etc."
            class="w-full border-3 border-ink px-3 py-2 font-mono text-sm focus:outline-none focus:bg-accent-yellow/20 resize-none"
          />
        </div>

        <p v-if="error" class="font-mono text-xs text-red-600 border-2 border-red-400 bg-red-50 px-3 py-2">{{ error }}</p>

        <div class="flex gap-3 pt-2">
          <Button type="button" variant="secondary" class="flex-1 justify-center" @click="emit('close')">Cancelar</Button>
          <Button type="submit" class="flex-1 justify-center" :disabled="loading || !url.trim()">
            {{ loading ? 'Agregando…' : 'Agregar' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
