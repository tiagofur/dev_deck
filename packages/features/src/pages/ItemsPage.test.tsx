import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemsPage } from './ItemsPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useItems: vi.fn(),
  useUpdateItem: vi.fn(),
  useCapture: vi.fn(),
  usePreview: vi.fn(),
  useDecks: vi.fn(),
  useCreateDeck: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useItems: mocks.useItems,
    useUpdateItem: mocks.useUpdateItem,
    useCapture: mocks.useCapture,
    usePreview: mocks.usePreview,
    useDecks: mocks.useDecks,
    useCreateDeck: mocks.useCreateDeck,
  }
})

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <ItemsPage />
    </QueryClientProvider>,
  )
}

describe('<ItemsPage>', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useItems.mockReset()
    mocks.useItems
      .mockReturnValueOnce({ data: { total: 0, items: [] }, isLoading: false, error: null })
      .mockReturnValueOnce({ data: { total: 7, items: [] }, isLoading: false, error: null })
    mocks.useUpdateItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCapture.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, reset: vi.fn(), error: null })
    mocks.usePreview.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDecks.mockReturnValue({ data: [], isLoading: false })
    mocks.useCreateDeck.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('shows pending team review count in the header button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /review 7/i })).toBeInTheDocument()
    expect(mocks.useItems).toHaveBeenNthCalledWith(2, {
      tag: 'team-review',
      limit: 1,
      sort: 'updated_desc',
    })
  })

  it('navigates to the review queue from the header', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /review 7/i }))
    expect(mocks.navigate).toHaveBeenCalledWith('/review')
  })
})
