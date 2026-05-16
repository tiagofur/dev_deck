import { useMutation } from '@tanstack/react-query'
import { api } from '../../api-client'
import type { SearchResult } from '../cheatsheets/types'

export interface AskCitation {
  id: string
  title: string
  url?: string
}

export interface AskResponse {
  answer: string
  sources: SearchResult[]
  citations: AskCitation[]
}

export interface AskRequest {
  question: string
}

export function useAsk() {
  return useMutation({
    mutationFn: (req: AskRequest) =>
      api.post<AskResponse>('/api/ask', req),
  })
}
