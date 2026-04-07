<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { setToken } from '@/lib/auth'

const router = useRouter()

const authMode = import.meta.env.VITE_AUTH_MODE as string | undefined
const envToken = import.meta.env.VITE_API_TOKEN as string | undefined

onMounted(() => {
  // In token mode, auto-login with the env token — no GitHub OAuth needed.
  if (authMode === 'token' && envToken) {
    setToken(envToken)
    router.replace('/')
  }
})

function loginWithGitHub() {
  window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/auth/github/login`
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-primary p-8">
    <div class="bg-bg-card border-5 border-ink shadow-hard-xl p-10 max-w-md w-full text-center">
      <h1 class="font-display font-black text-5xl uppercase tracking-tight mb-2">
        Dev<span class="bg-accent-pink px-2 border-3 border-ink">Deck</span>
      </h1>
      <p class="font-mono text-sm text-ink-soft mb-8">
        Tu colección de repos, comandos y cheatsheets.
      </p>

      <div class="w-20 h-20 mx-auto mb-6 border-3 border-ink bg-accent-lime flex items-center justify-center text-3xl">
        🦎
      </div>

      <!-- Token mode: show loading while auto-redirecting -->
      <div v-if="authMode === 'token'" class="font-mono text-sm text-ink-soft">
        Cargando…
      </div>

      <!-- JWT mode: GitHub OAuth -->
      <button
        v-else
        @click="loginWithGitHub"
        class="w-full border-3 border-ink bg-ink text-white font-display font-bold uppercase
               text-lg py-4 px-6 shadow-hard
               hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg
               active:translate-x-1 active:translate-y-1 active:shadow-hard-sm
               transition-all duration-150 flex items-center justify-center gap-3"
      >
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        Sign in with GitHub
      </button>

      <p class="font-mono text-xs text-ink-soft mt-6">
        Solo necesitamos tu perfil público.
      </p>
    </div>
  </div>
</template>
