import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { APIError } from '@heapdeck/api-client'
import { GitHubDiscoveryTab } from './GitHubDiscoveryTab'

const mocks = vi.hoisted(() => ({
  useGitHubDiscovery: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

// Partial mock: keep the real isProRequired + APIError so the paywall
// branch exercises production logic end to end.
vi.mock('@heapdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@heapdeck/api-client')>('@heapdeck/api-client')
  return {
    ...actual,
    useGitHubDiscovery: mocks.useGitHubDiscovery,
  }
})

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GitHubDiscoveryTab />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('<GitHubDiscoveryTab>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the need form and does not query before submit', () => {
    mocks.useGitHubDiscovery.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: vi.fn() })
    renderTab()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(mocks.useGitHubDiscovery).toHaveBeenCalledWith({ need: '', language: '', limit: 10 })
  })

  it('shows the Pro upsell on 402 instead of results', () => {
    mocks.useGitHubDiscovery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new APIError(402, 'PRO_REQUIRED', 'semantic search requires the Pro plan'),
      refetch: vi.fn(),
    })
    renderTab()
    expect(screen.getByText('This one needs Pro')).toBeInTheDocument()
    expect(screen.getByText('Upgrade — $5/mo')).toBeInTheDocument()
    expect(screen.queryByText(/github:/i)).not.toBeInTheDocument()
  })

  it('renders ranked results with save action dispatching capture event', async () => {
    const refetch = vi.fn()
    mocks.useGitHubDiscovery.mockReturnValue({
      data: {
        query: 'go image resize',
        github_query: 'image resize language:go stars:>50',
        results: [
          {
            full_name: 'disintegration/imaging',
            url: 'https://github.com/disintegration/imaging',
            description: 'Simple Go imaging',
            language: 'Go',
            stars: 4200,
            topics: ['go'],
            pushed_at: '2026-09-01T00:00:00Z',
            avatar_url: '',
            score: 9.5,
            match_reason: 'maintained · matches go',
          },
        ],
        cached: false,
      },
      isLoading: false,
      error: null,
      refetch,
    })
    renderTab()

    expect(screen.getByText(/disintegration\/imaging/i)).toBeInTheDocument()
    expect(screen.getByText(/maintained · matches go/i)).toBeInTheDocument()
    expect(screen.getByText(/image resize language:go/i)).toBeInTheDocument()

    const listener = vi.fn()
    window.addEventListener('heapdeck:open-capture', listener)
    fireEvent.click(screen.getByRole('button', { name: /capture/i }))
    await waitFor(() => {
      expect(listener).toHaveBeenCalledTimes(1)
    })
    const detail = (listener.mock.calls[0][0] as CustomEvent).detail
    expect(detail).toEqual({
      url: 'https://github.com/disintegration/imaging',
      title: 'disintegration/imaging',
    })
    window.removeEventListener('heapdeck:open-capture', listener)
  })

  it('shows retry on non-402 errors', () => {
    const refetch = vi.fn()
    mocks.useGitHubDiscovery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new APIError(500, 'INTERNAL', 'boom'),
      refetch,
    })
    renderTab()
    expect(screen.queryByText('This one needs Pro')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })
})
