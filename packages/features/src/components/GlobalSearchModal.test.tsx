import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlobalSearchModal } from './GlobalSearchModal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  useGlobalSearch: vi.fn(),
  useSystemConfig: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('@devdeck/api-client', () => ({
  useGlobalSearch: mocks.useGlobalSearch,
  useSystemConfig: mocks.useSystemConfig,
}))

function renderModal(open = true, onClose = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GlobalSearchModal open={open} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('<GlobalSearchModal>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useGlobalSearch.mockReturnValue({ data: [], isLoading: false })
    mocks.useSystemConfig.mockReturnValue({ data: { ai_provider: 'openai', sync_enabled: true }, isLoading: false })
  })

  it('renders search input when open', () => {
    renderModal()
    expect(screen.getByPlaceholderText(/Search anything.../i)).toBeInTheDocument()
  })

  it('renders search mode selector when AI is enabled', () => {
    renderModal()
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('AI (Semantic)')).toBeInTheDocument()
    expect(screen.getByText('Hybrid')).toBeInTheDocument()
  })

  it('hides search mode selector when AI is disabled', () => {
    mocks.useSystemConfig.mockReturnValue({ data: { ai_provider: 'disabled', sync_enabled: true }, isLoading: false })
    renderModal()
    expect(screen.queryByText('Text')).not.toBeInTheDocument()
    expect(screen.queryByText('AI Semantic')).not.toBeInTheDocument()
    expect(screen.queryByText('Hybrid')).not.toBeInTheDocument()
  })
})
