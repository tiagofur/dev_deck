<script setup lang="ts">
const props = defineProps<{ label: string; colorIndex?: number }>()

const tagColors = [
  'bg-accent-yellow',
  'bg-accent-cyan',
  'bg-accent-lime',
  'bg-accent-lavender',
  'bg-accent-orange',
]

const color = tagColors[Math.abs(props.colorIndex ?? 0) % tagColors.length]
</script>

<template>
  <span :class="['inline-block px-2 py-0.5 text-xs font-mono font-semibold border-2 border-ink shadow-hard-sm', color]">
    {{ label }}
  </span>
</template>
