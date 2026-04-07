<template>
  <div class="min-h-screen bg-bg-primary">
    <router-view />
    <Snarkel />
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="border-3 border-ink px-4 py-3 font-display font-bold uppercase text-sm shadow-hard transition-all cursor-pointer"
        :class="toastClass(toast.type)"
        @click="dismissToast(toast.id)"
      >
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
