import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import type { CaptureInput, CaptureResponse } from './types'
import { ITEMS_KEY } from '../items/api'

/**
 * useCapture wraps POST /api/items/capture. On success we invalidate
 * both legacy repos and the polymorphic items cache so every current
 * vault view reflects the new capture without a manual refresh.
 */
export function useCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CaptureInput) =>
      api.post<CaptureResponse>('/api/items/capture', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repos'] })
      qc.invalidateQueries({ queryKey: ITEMS_KEY })
    },
  })
}
