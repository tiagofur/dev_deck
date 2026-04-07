<script setup lang="ts">
import { ref } from 'vue'
import type { Command } from '../stores/repos'
import CommandCard from './CommandCard.vue'

const props = defineProps<{ commands: Command[] }>()
const emit = defineEmits<{
  reorder: [ids: string[]]
  edit: [cmd: Command]
  delete: [cmd: Command]
  copy: [cmd: Command]
}>()

const draggedId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(e: DragEvent, id: string) {
  draggedId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
}

function onDragOver(e: DragEvent, id: string) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverId.value = id
}

function onDrop(e: DragEvent, targetId: string) {
  e.preventDefault()
  const fromId = draggedId.value
  if (!fromId || fromId === targetId) return
  const ids = props.commands.map(c => c.id)
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0) return
  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, fromId)
  emit('reorder', next)
  draggedId.value = null
  dragOverId.value = null
}

function onDragEnd() {
  draggedId.value = null
  dragOverId.value = null
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="cmd in commands"
      :key="cmd.id"
      draggable="true"
      @dragstart="onDragStart($event, cmd.id)"
      @dragover="onDragOver($event, cmd.id)"
      @drop="onDrop($event, cmd.id)"
      @dragend="onDragEnd"
      :class="['transition-all duration-100', dragOverId === cmd.id && draggedId !== cmd.id && 'translate-x-1 border-l-4 border-accent-yellow']"
    >
      <CommandCard
        :command="cmd"
        :is-dragging="draggedId === cmd.id"
        @copy="emit('copy', cmd)"
        @edit="emit('edit', cmd)"
        @delete="emit('delete', cmd)"
      />
    </div>
  </div>
</template>
