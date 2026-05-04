import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface Deck {
  id: string
  slug: string
  title: string
  description?: string
  is_public: boolean
  created_at: string
  updated_at: string
  item_count?: number
}

export interface CreateDeckInput {
  title: string
  description?: string
  is_public?: boolean
}

export interface UpdateDeckInput {
  title?: string
  description?: string
  is_public?: boolean
}

export interface AddItemsInput {
  item_ids: string[]
}

export interface DeckItem {
  item_id: string
  position: number
}

const DECKS_KEY = ['decks']

// Recent deck keys for quick access (stored in localStorage)
const RECENT_DECKS_KEY = 'devdeck_recent_decks'
const MAX_RECENT_DECKS = 5
const LAST_DECK_KEY = 'devdeck_last_deck'

export function addRecentDeck(deckId: string): void {
  try {
    const stored = localStorage.getItem(RECENT_DECKS_KEY)
    const recent: string[] = stored ? JSON.parse(stored) : []
    const filtered = recent.filter(id => id !== deckId)
    filtered.unshift(deckId)
    const trimmed = filtered.slice(0, MAX_RECENT_DECKS)
    localStorage.setItem(RECENT_DECKS_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore
  }
}

export function getRecentDeckIds(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_DECKS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function setLastUsedDeck(deckId: string | null): void {
  try {
    if (deckId) {
      localStorage.setItem(LAST_DECK_KEY, deckId)
    } else {
      localStorage.removeItem(LAST_DECK_KEY)
    }
  } catch {
    // Ignore
  }
}

export function getLastUsedDeck(): string | null {
  try {
    return localStorage.getItem(LAST_DECK_KEY)
  } catch {
    return null
  }
}

export function useDecks() {
  return useQuery({
    queryKey: DECKS_KEY,
    queryFn: async () => {
      const res = await api.get<{ decks: Deck[] }>('/api/decks')
      return res.decks
    },
  })
}

export function useDeckDetail(id: string) {
  return useQuery({
    queryKey: [...DECKS_KEY, 'detail', id],
    queryFn: () => api.get<{ deck: Deck; items: DeckItem[] }>(`/api/decks/${id}`),
    enabled: !!id,
  })
}

export function useCreateDeck() {
  return useMutation({
    mutationFn: async (input: CreateDeckInput) => {
      const res = await api.post<{ deck: Deck }>('/api/decks', input)
      return res.deck
    },
    onSuccess: (deck) => {
      addRecentDeck(deck.id)
      setLastUsedDeck(deck.id)
    },
  })
}

export function useUpdateDeck() {
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDeckInput }) => {
      const res = await api.patch<{ deck: Deck }>(`/api/decks/${id}`, input)
      return res.deck
    },
  })
}

export function useDeleteDeck() {
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/decks/${id}`),
  })
}

export function useAddDeckItems() {
  return useMutation({
    mutationFn: ({ deckId, itemIds }: { deckId: string; itemIds: string[] }) =>
      api.post(`/api/decks/${deckId}/items`, { item_ids: itemIds }),
  })
}

export function useRemoveDeckItem() {
  return useMutation({
    mutationFn: ({ deckId, itemId }: { deckId: string; itemId: string }) =>
      api.del(`/api/decks/${deckId}/items/${itemId}`),
  })
}

export function usePublicDeck(slug: string) {
  return useQuery({
    queryKey: [...DECKS_KEY, 'public', slug],
    queryFn: () => api.get<{ deck: Deck; items: DeckItem[] }>(`/api/decks/${slug}/public`),
    enabled: !!slug,
  })
}

export function useImportDeck() {
  return useMutation({
    mutationFn: (deckId: string) =>
      api.post<{ imported: number }>(`/api/decks/${deckId}/import`, {}),
  })
}

export function useStarDeck() {
  return {
    star: (deckId: string) => api.post(`/api/decks/${deckId}/star`, {}),
    unstar: (deckId: string) => api.del(`/api/decks/${deckId}/star`),
  }
}
