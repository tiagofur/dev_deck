<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

type Mood = 'idle' | 'happy' | 'sleeping' | 'judging' | 'celebrating'

const MESSAGES: Record<Mood, string[]> = {
  idle: [
    '¿Qué onda, programador?',
    'Acá esperando que hagas algo…',
    'Todo tranquilo por acá.',
  ],
  happy: [
    '¡Qué buena onda!',
    '¡Eso es! Seguí así.',
    '¡Fantástico, loco!',
  ],
  sleeping: [
    'Zzzz… despertame cuando haya repos.',
    'Ojooo… me dormí un toque.',
    'Zzzz…',
  ],
  judging: [
    '¿En serio? ¿Eso guardaste?',
    'Te estoy mirando, eh.',
    'Hmm… qué decís.',
  ],
  celebrating: [
    '¡Épico! ¡Tremendo!',
    '¡SIIIII! ¡Eso es!',
    '¡La rompiste!',
  ],
}

const mood = ref<Mood>('idle')
const message = ref('')
const visible = ref(false)
let hideTimer: ReturnType<typeof setTimeout>

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function show(m: Mood) {
  mood.value = m
  message.value = pick(MESSAGES[m])
  visible.value = true
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { visible.value = false }, 4000)
}

let idleTimer: ReturnType<typeof setTimeout>

function scheduleIdle() {
  idleTimer = setTimeout(() => {
    show('idle')
    scheduleIdle()
  }, 30000 + Math.random() * 30000)
}

onMounted(() => {
  setTimeout(() => show('idle'), 2000)
  scheduleIdle()
})

onUnmounted(() => {
  clearTimeout(hideTimer)
  clearTimeout(idleTimer)
})

defineExpose({ show })
</script>

<template>
  <div class="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 pointer-events-none select-none">
    <!-- Bubble -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div v-if="visible && message" class="max-w-[200px] bg-bg-card border-3 border-ink shadow-hard px-3 py-2 font-mono text-xs text-right relative">
        {{ message }}
        <!-- tail -->
        <div class="absolute -bottom-[7px] right-5 w-3 h-3 bg-bg-card border-r-3 border-b-3 border-ink rotate-45" />
      </div>
    </Transition>

    <!-- Axolotl SVG -->
    <div class="pointer-events-auto cursor-pointer" @click="show('happy')">
      <!-- idle/happy/sleeping -->
      <svg v-if="mood !== 'celebrating'" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- body -->
        <ellipse cx="28" cy="34" rx="16" ry="13" fill="#f9a8d4" stroke="#000" stroke-width="2.5"/>
        <!-- head -->
        <ellipse cx="28" cy="20" rx="13" ry="12" fill="#fbcfe8" stroke="#000" stroke-width="2.5"/>
        <!-- gills left -->
        <path d="M15 18 C10 14 8 10 11 7 C13 5 16 8 15 12" fill="#f472b6" stroke="#000" stroke-width="2"/>
        <path d="M13 22 C8 20 5 16 8 13 C10 11 14 13 13 17" fill="#f472b6" stroke="#000" stroke-width="2"/>
        <!-- gills right -->
        <path d="M41 18 C46 14 48 10 45 7 C43 5 40 8 41 12" fill="#f472b6" stroke="#000" stroke-width="2"/>
        <path d="M43 22 C48 20 51 16 48 13 C46 11 42 13 43 17" fill="#f472b6" stroke="#000" stroke-width="2"/>
        <!-- eyes -->
        <template v-if="mood === 'sleeping'">
          <path d="M22 21 Q24 19 26 21" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
          <path d="M30 21 Q32 19 34 21" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
        </template>
        <template v-else-if="mood === 'judging'">
          <ellipse cx="24" cy="21" rx="3" ry="2.5" fill="#000"/>
          <ellipse cx="32" cy="21" rx="3" ry="2.5" fill="#000"/>
          <!-- eyebrows judging -->
          <path d="M21 17.5 Q24 15.5 27 17.5" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
          <path d="M29 17.5 Q32 15.5 35 17.5" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
        </template>
        <template v-else>
          <ellipse cx="24" cy="21" rx="3" ry="3" fill="#000"/>
          <ellipse cx="32" cy="21" rx="3" ry="3" fill="#000"/>
          <ellipse cx="25" cy="20" rx="1" ry="1" fill="#fff"/>
          <ellipse cx="33" cy="20" rx="1" ry="1" fill="#fff"/>
        </template>
        <!-- mouth -->
        <path v-if="mood === 'happy'" d="M24 27 Q28 30 32 27" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path v-else-if="mood === 'judging'" d="M24 28 Q28 26 32 28" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path v-else d="M25 27 Q28 29 31 27" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
        <!-- tail -->
        <path d="M28 47 Q22 52 18 50 Q14 48 16 44 Q18 40 24 42" fill="#f9a8d4" stroke="#000" stroke-width="2"/>
        <!-- legs -->
        <path d="M16 40 Q12 44 14 48" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M40 40 Q44 44 42 48" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </svg>

      <!-- celebrating — bouncing star burst -->
      <svg v-else width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="animate-bounce">
        <ellipse cx="28" cy="34" rx="16" ry="13" fill="#fef08a" stroke="#000" stroke-width="2.5"/>
        <ellipse cx="28" cy="20" rx="13" ry="12" fill="#fef9c3" stroke="#000" stroke-width="2.5"/>
        <path d="M15 18 C10 14 8 10 11 7 C13 5 16 8 15 12" fill="#fbbf24" stroke="#000" stroke-width="2"/>
        <path d="M13 22 C8 20 5 16 8 13 C10 11 14 13 13 17" fill="#fbbf24" stroke="#000" stroke-width="2"/>
        <path d="M41 18 C46 14 48 10 45 7 C43 5 40 8 41 12" fill="#fbbf24" stroke="#000" stroke-width="2"/>
        <path d="M43 22 C48 20 51 16 48 13 C46 11 42 13 43 17" fill="#fbbf24" stroke="#000" stroke-width="2"/>
        <ellipse cx="24" cy="21" rx="3" ry="3" fill="#000"/>
        <ellipse cx="32" cy="21" rx="3" ry="3" fill="#000"/>
        <ellipse cx="25" cy="20" rx="1" ry="1" fill="#fff"/>
        <ellipse cx="33" cy="20" rx="1" ry="1" fill="#fff"/>
        <path d="M23 27 Q28 32 33 27" stroke="#000" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M28 47 Q22 52 18 50 Q14 48 16 44 Q18 40 24 42" fill="#fef08a" stroke="#000" stroke-width="2"/>
        <path d="M16 40 Q12 44 14 48" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M40 40 Q44 44 42 48" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </svg>
    </div>
  </div>
</template>
