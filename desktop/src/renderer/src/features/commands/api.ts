import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api-client'
import type {
  CreateCommandInput,
  PackageScript,
  RepoCommand,
  UpdateCommandInput,
} from './types'

const commandsKey = (repoId: string) => ['commands', repoId] as const

export function useCommands(repoId: string | undefined) {
  return useQuery({
    queryKey: repoId ? commandsKey(repoId) : ['commands', 'noop'],
    queryFn: () => api.get<RepoCommand[]>(`/api/repos/${repoId}/commands`),
    enabled: !!repoId,
  })
}

export function useAddCommand(repoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCommandInput) =>
      api.post<RepoCommand>(`/api/repos/${repoId}/commands`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: commandsKey(repoId) }),
  })
}

export function useUpdateCommand(repoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cmdId, input }: { cmdId: string; input: UpdateCommandInput }) =>
      api.patch<RepoCommand>(`/api/repos/${repoId}/commands/${cmdId}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: commandsKey(repoId) }),
  })
}

export function useDeleteCommand(repoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cmdId: string) =>
      api.del<void>(`/api/repos/${repoId}/commands/${cmdId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: commandsKey(repoId) }),
  })
}

export function useReorderCommands(repoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) =>
      api.post<void>(`/api/repos/${repoId}/commands/reorder`, { order }),
    // Optimistic update — reorder feels instant.
    onMutate: async (order) => {
      await qc.cancelQueries({ queryKey: commandsKey(repoId) })
      const prev = qc.getQueryData<RepoCommand[]>(commandsKey(repoId))
      if (prev) {
        const byId = new Map(prev.map((c) => [c.id, c]))
        const next = order
          .map((id) => byId.get(id))
          .filter((c): c is RepoCommand => !!c)
        qc.setQueryData(commandsKey(repoId), next)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(commandsKey(repoId), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: commandsKey(repoId) }),
  })
}

// ─── Phase 9: Package scripts import ───

const scriptsKey = (repoId: string) => ['package-scripts', repoId] as const

export function usePackageScripts(repoId: string | undefined) {
  return useQuery({
    queryKey: repoId ? scriptsKey(repoId) : ['package-scripts', 'noop'],
    queryFn: async () => {
      const res = await api.get<{ scripts: PackageScript[] }>(
        `/api/repos/${repoId}/package-scripts`,
      )
      return res.scripts
    },
    enabled: !!repoId,
    // Don't cache aggressively — this is a one-time fetch per import attempt.
    staleTime: 0,
  })
}

export function useBatchCreateCommands(repoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inputs: CreateCommandInput[]) =>
      api.post<RepoCommand[]>(`/api/repos/${repoId}/commands/batch`, {
        commands: inputs,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commandsKey(repoId) })
      qc.invalidateQueries({ queryKey: scriptsKey(repoId) })
    },
  })
}
