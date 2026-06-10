import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface StarsImportInput {
	username?: string
	max?: number
}

export interface StarsImportResult {
	username: string
	total: number
	imported: number
	skipped: number
}

/** POST /api/import/github-stars — import public GitHub stars into the vault. */
export function useImportGithubStars() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: StarsImportInput = {}) =>
			api.post<StarsImportResult>('/api/import/github-stars', input),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['items'] })
			qc.invalidateQueries({ queryKey: ['stats'] })
		},
	})
}
