import { useMutation } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface PreviewInput {
  url: string
  type_hint?: string
}

export interface PreviewResponse {
  url: string
  title: string
  description: string
  image: string
  type: string
}

/**
 * usePreview fetches instant metadata for a URL without persisting.
 * Used to show preview while the user types in the capture modal.
 */
export function usePreview() {
  return useMutation({
    mutationFn: (input: PreviewInput) =>
      api.post<PreviewResponse>('/api/items/preview', input),
  })
}