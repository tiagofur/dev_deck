import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ItemDetailPage } from './ItemDetailPage'

const mocks = vi.hoisted(() => ({
	useParams: vi.fn(),
	useNavigate: vi.fn(),
	useItem: vi.fn(),
	useUpdateItem: vi.fn(),
	useDeleteItem: vi.fn(),
	useAIEnrichItem: vi.fn(),
	useReviewItemAITags: vi.fn(),
	useUserTags: vi.fn(),
	useRelatedItems: vi.fn(),
	useItemRunbooks: vi.fn(),
	useCreateRunbook: vi.fn(),
	useAddRunbookStep: vi.fn(),
	useUpdateRunbookStep: vi.fn(),
	useDeleteRunbook: vi.fn(),
	useCapture: vi.fn(),
	useCircles: vi.fn(),
	useShareToCircle: vi.fn(),
	showToast: vi.fn(),
	confirm: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
	useParams: mocks.useParams,
	useNavigate: mocks.useNavigate,
}))

vi.mock('../components/AppShell', () => ({
	AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@devdeck/api-client', async () => {
	const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
	return {
		...actual,
		useItem: mocks.useItem,
		useUpdateItem: mocks.useUpdateItem,
		useDeleteItem: mocks.useDeleteItem,
		useAIEnrichItem: mocks.useAIEnrichItem,
		useReviewItemAITags: mocks.useReviewItemAITags,
		useUserTags: mocks.useUserTags,
		useRelatedItems: mocks.useRelatedItems,
		useItemRunbooks: mocks.useItemRunbooks,
		useCreateRunbook: mocks.useCreateRunbook,
		useAddRunbookStep: mocks.useAddRunbookStep,
		useUpdateRunbookStep: mocks.useUpdateRunbookStep,
		useDeleteRunbook: mocks.useDeleteRunbook,
		useCapture: mocks.useCapture,
		useCircles: mocks.useCircles,
		useShareToCircle: mocks.useShareToCircle,
	}
})

vi.mock('@devdeck/ui', async () => {
	const actual = await vi.importActual<typeof import('@devdeck/ui')>('@devdeck/ui')
	return {
		...actual,
		showToast: mocks.showToast,
		confirm: mocks.confirm,
	}
})

const item = {
	id: 'item-1',
	item_type: 'tool',
	title: 'ripgrep',
	url: 'https://ripgrep.dev',
	url_normalized: 'https://ripgrep.dev',
	description: 'Fast search tool',
	notes: 'some notes',
	tags: ['search'],
	why_saved: 'for large codebases',
	when_to_use: 'when I need fast grep',
	source_channel: 'manual',
	meta: {},
	ai_summary: 'Fast recursive search for huge codebases.',
	ai_tags: ['cli', 'search'],
	enrichment_status: 'ok',
	archived: false,
	is_favorite: false,
	created_at: '2026-04-30T00:00:00Z',
	updated_at: '2026-04-30T00:00:00Z',
	last_seen_at: null,
}

describe('<ItemDetailPage>', () => {
	beforeEach(() => {
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		})
		mocks.useParams.mockReturnValue({ id: 'item-1' })
		mocks.useNavigate.mockReturnValue(vi.fn())
		mocks.useItem.mockReturnValue({ data: item, isLoading: false, error: null })
		mocks.useUpdateItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useDeleteItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useAIEnrichItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useReviewItemAITags.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useUserTags.mockReturnValue({ data: ['cli', 'search'], isLoading: false })
		mocks.useRelatedItems.mockReturnValue({ data: [], isLoading: false, error: null })
		mocks.useItemRunbooks.mockReturnValue({ data: [], isLoading: false })
		mocks.useCreateRunbook.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useAddRunbookStep.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useUpdateRunbookStep.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useDeleteRunbook.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useCapture.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useCircles.mockReturnValue({ data: [], isLoading: false })
		mocks.useShareToCircle.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
	})

	it('renders AI summary and suggested tags', () => {
		render(<ItemDetailPage />)
		expect(screen.getByText('Fast recursive search for huge codebases.')).toBeInTheDocument()
		expect(screen.getAllByText('cli').length).toBeGreaterThan(0)
		expect(screen.getAllByText('search').length).toBeGreaterThan(0)
		expect(screen.getByText(/when to use it/i)).toBeInTheDocument()
	})

	it('triggers manual AI rerun', async () => {
		const mutateAsync = vi.fn().mockResolvedValue(item)
		mocks.useAIEnrichItem.mockReturnValue({ mutateAsync, isPending: false })
		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /rerun ai analysis/i }))
		expect(mutateAsync).toHaveBeenCalledWith('item-1')
	})

	it('applies reviewed AI tags', async () => {
		const mutateAsync = vi.fn().mockResolvedValue(item)
		mocks.useReviewItemAITags.mockReturnValue({ mutateAsync, isPending: false })
		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /accept and apply/i }))
		expect(mutateAsync).toHaveBeenCalledWith({
			id: 'item-1',
			input: { ai_tags: ['cli', 'search'], apply: true },
		})
	})

	it('marks an item for team review', async () => {
		const mutateAsync = vi.fn().mockResolvedValue(item)
		mocks.useUpdateItem.mockReturnValue({ mutateAsync, isPending: false })
		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /mark for review/i }))
		expect(mutateAsync).toHaveBeenCalledWith({
			id: 'item-1',
			input: { tags: ['search', 'team-review'] },
		})
	})

	it('approves an item already in team review', async () => {
		const mutateAsync = vi.fn().mockResolvedValue(item)
		mocks.useUpdateItem.mockReturnValue({ mutateAsync, isPending: false })
		mocks.useItem.mockReturnValue({
			data: { ...item, tags: ['search', 'team-review'] },
			isLoading: false,
			error: null,
		})
		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /approve/i }))
		expect(mutateAsync).toHaveBeenCalledWith({
			id: 'item-1',
			input: { tags: ['search'], is_favorite: true },
		})
	})



	it('shares a runbook to a Circle with persisted context', async () => {
		const capture = vi.fn().mockResolvedValue({
			item: { id: 'captured-runbook' },
			duplicate_of: null,
			enrichment_status: 'ok',
		})
		const shareToCircle = vi.fn().mockResolvedValue({})
		mocks.useItemRunbooks.mockReturnValue({
			data: [
				{
					id: 'runbook-1',
					item_id: 'item-1',
					title: 'Deploy API',
					created_at: '2026-04-30T00:00:00Z',
					steps: [
						{
							id: 'step-1',
							runbook_id: 'runbook-1',
							position: 1,
							label: 'Restart API',
							command: 'docker compose up -d api',
							description: 'Restart only the API service.',
							created_at: '2026-04-30T00:00:00Z',
						},
					],
				},
			],
			isLoading: false,
		})
		mocks.useCapture.mockReturnValue({ mutateAsync: capture, isPending: false })
		mocks.useCircles.mockReturnValue({
			data: [{ id: 'circle-1', name: 'Ops Guild' }],
			isLoading: false,
		})
		mocks.useShareToCircle.mockReturnValue({ mutateAsync: shareToCircle, isPending: false })

		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /runbooks/i }))
		fireEvent.click(screen.getByTitle('Share runbook to Circle'))

		const saveAndShare = screen.getByRole('button', { name: /save and share runbook/i })
		expect(saveAndShare).toBeDisabled()

		fireEvent.change(screen.getByLabelText('Circle'), { target: { value: 'circle-1' } })
		fireEvent.change(screen.getByLabelText('Why this matters'), {
			target: { value: 'Useful for production deploy handoffs.' },
		})
		fireEvent.click(saveAndShare)

		await waitFor(() => {
			expect(capture).toHaveBeenCalledWith({
				source: 'manual',
				text: expect.stringContaining('docker compose up -d api'),
				title_hint: 'Runbook: Deploy API',
				type_hint: 'workflow',
				tags: ['runbook', 'circle-share'],
				why_saved: 'Useful for production deploy handoffs.',
			})
			expect(shareToCircle).toHaveBeenCalledWith({
				circleId: 'circle-1',
				itemId: 'captured-runbook',
				shareContext: 'Useful for production deploy handoffs.',
			})
		})
	})

	it('copies a shareable review summary', async () => {
		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /copy summary/i }))
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('# ripgrep'))
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Why it matters: for large codebases'))
	})
})
