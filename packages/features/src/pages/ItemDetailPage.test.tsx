import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ItemDetailPage } from './ItemDetailPage'

const mocks = vi.hoisted(() => ({
	useParams: vi.fn(),
	useNavigate: vi.fn(),
	useItem: vi.fn(),
	useUpdateItem: vi.fn(),
	useDeleteItem: vi.fn(),
	useAIEnrichItem: vi.fn(),
	useReviewItemAITags: vi.fn(),
	showToast: vi.fn(),
	confirm: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
	useParams: mocks.useParams,
	useNavigate: mocks.useNavigate,
}))

vi.mock('@devdeck/api-client', () => ({
	useItem: mocks.useItem,
	useUpdateItem: mocks.useUpdateItem,
	useDeleteItem: mocks.useDeleteItem,
	useAIEnrichItem: mocks.useAIEnrichItem,
	useReviewItemAITags: mocks.useReviewItemAITags,
}))

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
	why_saved: 'para codebases grandes',
	when_to_use: 'cuando necesito grep rápido',
	source_channel: 'manual',
	meta: {},
	ai_summary: 'Fast recursive search for huge codebases.',
	ai_tags: ['cli', 'search'],
	enrichment_status: 'ok',
	archived: false,
	created_at: '2026-04-30T00:00:00Z',
	updated_at: '2026-04-30T00:00:00Z',
	last_seen_at: null,
}

describe('<ItemDetailPage>', () => {
	beforeEach(() => {
		mocks.useParams.mockReturnValue({ id: 'item-1' })
		mocks.useNavigate.mockReturnValue(vi.fn())
		mocks.useItem.mockReturnValue({ data: item, isLoading: false, error: null })
		mocks.useUpdateItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useDeleteItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useAIEnrichItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
		mocks.useReviewItemAITags.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
	})

	it('renders AI summary and suggested tags', () => {
		render(<ItemDetailPage />)
		expect(screen.getByText('Fast recursive search for huge codebases.')).toBeInTheDocument()
		expect(screen.getAllByText('cli')).toHaveLength(2)
		expect(screen.getAllByText('search').length).toBeGreaterThan(0)
		expect(screen.getByText(/cuándo usarlo/i)).toBeInTheDocument()
	})

	it('triggers manual AI rerun', async () => {
		const mutateAsync = vi.fn().mockResolvedValue(item)
		mocks.useAIEnrichItem.mockReturnValue({ mutateAsync, isPending: false })
		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /re-ejecutar ia/i }))
		expect(mutateAsync).toHaveBeenCalledWith('item-1')
	})

	it('applies reviewed AI tags', async () => {
		const mutateAsync = vi.fn().mockResolvedValue(item)
		mocks.useReviewItemAITags.mockReturnValue({ mutateAsync, isPending: false })
		render(<ItemDetailPage />)
		fireEvent.click(screen.getByRole('button', { name: /aplicar a mis tags/i }))
		expect(mutateAsync).toHaveBeenCalledWith({
			id: 'item-1',
			input: { ai_tags: ['cli', 'search'], apply: true },
		})
	})
})
