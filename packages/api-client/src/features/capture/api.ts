import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import type { CaptureInput, CaptureResponse } from './types'

/**
 * useCapture wraps POST /api/items/capture. On success we invalidate
 * the repos cache so a newly captured repo shows up on HomePage without
 * a manual refresh. Once the items list endpoint lands in Ola 5 we'll
 * also invalidate its key here.
 */
export function useCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CaptureInput) =>
      api.post<CaptureResponse>('/api/items/capture', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repos'] })
    },
  })
}
