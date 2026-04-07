<script setup lang="ts">
import type { Command } from '../stores/repos'

defineProps<{
  command: Command
  isDragging?: boolean
}>()

const emit = defineEmits<{
  copy: []
  edit: []
  delete: []
}>()

const CATEGORY_COLORS: Record<string, string> = {
  install: 'bg-accent-cyan',
  dev:     'bg-accent-lime',
  test:    'bg-accent-yellow',
  build:   'bg-accent-orange',
  deploy:  'bg-accent-pink',
  lint:    'bg-accent-lavender',
  db:      'bg-bg-elevated',
  other:   'bg-bg-elevated',
}
</script>

<template>
  <div :class="['bg-bg-card border-3 border-ink shadow-hard p-4 transition-opacity', isDragging && 'opacity-40']">
    <div class="flex items-start gap-3">
      <!-- Drag handle -->
      <div class="cursor-grab active:cursor-grabbing p-1 hover:bg-accent-yellow border-2 border-transparent hover:border-ink touch-none text-ink-soft" data-drag-handle>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>
        </svg>
      </div>

      <!-- Body -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <h4 class="font-display font-bold uppercase text-base truncate">{{ command.label }}</h4>
          <span v-if="command.category"
            :class="['shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border-2 border-ink', CATEGORY_COLORS[command.category] || 'bg-bg-elevated']">
            {{ command.category }}
          </span>
        </div>
        <code class="block bg-ink text-bg-primary font-mono text-xs px-3 py-2 border-2 border-ink overflow-x-auto whitespace-nowrap">{{ command.command }}</code>
        <p v-if="command.description" class="text-xs text-ink-soft font-mono mt-2">{{ command.description }}</p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-1 shrink-0">
        <button @click="emit('copy')" title="Copiar"
          class="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-lime active:translate-x-[1px] active:translate-y-[1px] transition-transform">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        <button @click="emit('edit')" title="Editar"
          class="border-2 border-ink p-1.5 bg-bg-card hover:bg-accent-yellow active:translate-x-[1px] active:translate-y-[1px] transition-transform">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button @click="emit('delete')" title="Borrar"
          class="border-2 border-ink p-1.5 bg-bg-card hover:bg-danger hover:text-white active:translate-x-[1px] active:translate-y-[1px] transition-transform">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
