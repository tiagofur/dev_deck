<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const refreshToken = params.get('refresh_token')

  if (token && refreshToken) {
    auth.handleCallback(token, refreshToken)
    await auth.fetchUser()
    router.replace('/')
  } else {
    router.replace('/login')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-primary">
    <div class="border-3 border-ink bg-bg-card shadow-hard px-10 py-8 text-center">
      <div class="w-12 h-12 border-3 border-ink bg-accent-lime mx-auto mb-4 flex items-center justify-center text-xl">🦎</div>
      <p class="font-mono text-sm">Autenticando…</p>
    </div>
  </div>
</template>
