import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { TeamReviewPage } from './TeamReviewPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useItems: vi.fn(),
  useUpdateItem: vi.fn(),
  usePreferences: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useItems: mocks.useItems,
    useUpdateItem: mocks.useUpdateItem,
    usePreferences: mocks.usePreferences,
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
      <TeamReviewPage />
    </QueryClientProvider>,
  )
}

function makeItem() {
  return {
    id: 'item-1',
    item_type: 'tool',
    title: 'ripgrep',
    url: 'https://ripgrep.dev',
    url_normalized: 'https://ripgrep.dev',
    description: 'Fast search tool',
    notes: '',
    tags: ['team-review', 'search'],
    why_saved: '',
    when_to_use: '',
    source_channel: 'manual',
    meta: {},
    ai_summary: '',
    ai_tags: [],
    enrichment_status: 'ok',
    archived: false,
    is_favorite: false,
    created_at: '2026-04-30T00:00:00Z',
    updated_at: '2026-04-30T00:00:00Z',
    last_seen_at: null,
  }
}

describe('<TeamReviewPage>', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useItems.mockReset()
    mocks.usePreferences.mockReset()
    mocks.usePreferences.mockReturnValue({ activeOrgId: 'org_123' })
    mocks.useUpdateItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('loads items tagged for team review', () => {
    mocks.useItems.mockReturnValue({
      data: { total: 1, items: [makeItem()] },
      isLoading: false,
      error: null,
    })
    renderPage()
    expect(mocks.useItems).toHaveBeenCalledWith({
      tag: 'team-review',
      limit: 200,
      sort: 'updated_desc',
    })
    expect(screen.getByText('ripgrep')).toBeInTheDocument()
    expect(screen.getByText('1 items waiting for review')).toBeInTheDocument()
  })

  it('opens an item detail from the review queue', async () => {
    const user = userEvent.setup()
    mocks.useItems.mockReturnValue({
      data: { total: 1, items: [makeItem()] },
      isLoading: false,
      error: null,
    })
    renderPage()
    await user.click(screen.getByRole('heading', { name: 'ripgrep' }))
    expect(mocks.navigate).toHaveBeenCalledWith('/items/item-1')
  })

  it('renders guided org-required state if there is no active org configured', async () => {
    const user = userEvent.setup()
    mocks.usePreferences.mockReturnValue({ activeOrgId: null })
    mocks.useItems.mockReturnValue({
      data: { total: 0, items: [] },
      isLoading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('No Active Team')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Team Review is a shared curation queue where your organization triages items marked for review. It needs an active team workspace.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create a Team/i })).toBeInTheDocument()

    const backButton = screen.getByRole('button', { name: 'Back to Personal Vault' })
    expect(backButton).toBeInTheDocument()

    await user.click(backButton)
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })
})
