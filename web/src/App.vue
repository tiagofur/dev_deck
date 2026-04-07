<template>
  <div class="min-h-screen bg-bg-primary">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
    <Snarkel />
    <!-- Toasts — bottom-left, matches desktop -->
    <div class="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-center gap-2 border-3 border-ink px-4 py-3 font-display font-bold uppercase text-sm shadow-hard cursor-pointer animate-toast-in"
        :class="toastClass(toast.type)"
        @click="dismissToast(toast.id)"
      >
        <!-- success icon -->
        <svg v-if="toast.type === 'success'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <!-- error icon -->
        <svg v-else-if="toast.type === 'error'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <!-- info icon -->
        <svg v-else class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { subscribeToToasts, dismissToast, type Toast } from '@/lib/toast'
import Snarkel from '@/components/Snarkel.vue'

const toasts = ref<Toast[]>([])

onMounted(() => {
  subscribeToToasts((t) => (toasts.value = t))
})

function toastClass(type: Toast['type']) {
  switch (type) {
    case 'success':
      return 'bg-accent-lime text-ink'
    case 'error':
      return 'bg-danger text-white'
    default:
      return 'bg-accent-yellow text-ink'
  }
}
</script>
