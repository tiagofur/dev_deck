<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../lib/api'

const router = useRouter()
const repo = ref<any>(null)
const loading = ref(true)
const skipping = ref(false)
const cardImgError = ref(false)

async function loadNext() {
  loading.value = true
  cardImgError.value = false
  try {
    repo.value = await api.get('/discovery/next')
  } catch { repo.value = null }
  finally { loading.value = false }
}

async function skip() {
  skipping.value = true
  await loadNext()
  skipping.value = false
}

async function keep() {
  if (!repo.value) return
  try {
    await api.post('/repos', {
      url: repo.value.url || repo.value.html_url,
      tags: [],
      notes: '',
    })
  } catch (e) {
    console.error(e)
  }
  await loadNext()
}

onMounted(loadNext)
</script>

<template>
  <div class="min-h-screen bg-bg-primary flex flex-col">
    <header class="border-b-3 border-ink bg-bg-card px-6 py-4 flex items-center gap-4">
      <button @click="router.push('/')" class="border-3 border-ink p-2 bg-bg-card shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg transition-all duration-150">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h1 class="font-display font-black text-2xl uppercase tracking-tight flex items-center gap-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"/></svg>
        Discover
      </h1>
    </header>

    <main class="flex-1 flex items-center justify-center p-8">
      <div v-if="loading" class="font-mono text-ink-soft">Buscando repo…</div>

      <div v-else-if="!repo" class="text-center">
        <div class="w-20 h-20 mx-auto mb-4 border-3 border-ink bg-accent-yellow flex items-center justify-center text-3xl">🎉</div>
        <p class="font-display font-black text-2xl uppercase mb-2">¡Todo visto!</p>
        <p class="font-mono text-sm text-ink-soft mb-6">Ya revisaste todo por hoy. Volvé mañana.</p>
        <button @click="router.push('/')" class="border-3 border-ink px-5 py-3 bg-accent-pink font-display font-bold uppercase shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg transition-all duration-150">
          Volver al inicio
        </button>
      </div>

      <div v-else class="w-full max-w-lg">
        <!-- Card -->
        <div :class="['bg-bg-card border-5 border-ink shadow-hard-xl p-8 transition-all duration-300',
          skipping ? 'translate-x-[120%] rotate-12 opacity-0' : '']">
          <div class="flex items-start gap-4 mb-4">
            <img v-if="(repo.avatar_url || repo.owner?.avatar_url) && !cardImgError"
              :src="repo.avatar_url || repo.owner?.avatar_url"
              class="w-16 h-16 border-3 border-ink"
              @error="cardImgError = true" />
            <div v-else class="w-16 h-16 border-3 border-ink bg-accent-yellow flex items-center justify-center font-display font-black text-2xl">
              {{ (repo.name || repo.full_name || '?')[0].toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="font-display font-black text-2xl uppercase truncate">{{ repo.name || repo.full_name }}</h2>
              <p v-if="repo.language" class="font-mono text-sm text-ink-soft mt-1">{{ repo.language }}</p>
            </div>
          </div>

          <p v-if="repo.description" class="font-mono text-sm mb-4 leading-relaxed">{{ repo.description }}</p>

          <div class="flex items-center gap-4 font-mono text-sm text-ink-soft mb-6">
            <span v-if="repo.stargazers_count ?? repo.stars">★ {{ repo.stargazers_count ?? repo.stars }}</span>
            <span v-if="repo.forks_count ?? repo.forks">⑂ {{ repo.forks_count ?? repo.forks }}</span>
            <span v-if="repo.topics?.length" class="flex gap-1">
              <span v-for="t in repo.topics.slice(0, 3)" :key="t" class="px-1.5 py-0.5 text-[10px] border-2 border-ink bg-bg-elevated">{{ t }}</span>
            </span>
          </div>

          <!-- Actions -->
          <div class="flex gap-4">
            <button @click="skip" class="flex-1 border-3 border-ink py-3 bg-bg-elevated font-display font-bold uppercase text-lg shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-hard-sm transition-all duration-150">
              Skip
            </button>
            <button @click="keep" class="flex-1 border-3 border-ink py-3 bg-accent-pink font-display font-bold uppercase text-lg shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-hard-sm transition-all duration-150">
              ★ Keep
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
