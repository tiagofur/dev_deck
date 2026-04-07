<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-primary p-8">
    <div class="bg-bg-card border-3 border-ink shadow-hard p-10 max-w-sm w-full text-center">
      <div class="font-display font-black text-8xl mb-2">404</div>
      <p class="font-mono text-sm text-ink-soft mb-6">Esta página no existe, hermano.</p>
      <button
        @click="router.push('/')"
        class="border-3 border-ink px-6 py-3 bg-accent-yellow font-display font-bold uppercase shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg transition-all duration-150"
      >
        Volver al inicio
      </button>
    </div>
  </div>
</template>
