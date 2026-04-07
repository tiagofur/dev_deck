import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import { getToken, setToken, clearTokens, setRefreshToken } from '@/lib/auth'

interface User {
  id: string
  username: string
  email: string
  avatar_url: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const tokenMode = import.meta.env.VITE_AUTH_MODE === 'token'

  // In token mode there's no user object — the token IS the identity.
  const isLoggedIn = computed(() => tokenMode ? !!getToken() : !!getToken() && !!user.value)

  async function fetchUser() {
    if (tokenMode || !getToken()) return
    try {
      loading.value = true
      user.value = await api.get<User>('/auth/me')
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  function handleCallback(token: string, refreshToken: string) {
    setToken(token)
    setRefreshToken(refreshToken)
  }

  async function logout() {
    clearTokens()
    user.value = null
  }

  function init() {
    if (getToken()) {
      fetchUser()
    }
  }

  return { user, loading, isLoggedIn, fetchUser, handleCallback, logout, init }
})
