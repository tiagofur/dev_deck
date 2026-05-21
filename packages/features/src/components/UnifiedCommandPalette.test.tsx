import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UnifiedCommandPalette } from './UnifiedCommandPalette'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  useGlobalSearch: vi.fn(),
  useAsk: vi.fn(),
  useCapture: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('@devdeck/api-client', () => ({
  useGlobalSearch: mocks.useGlobalSearch,
  useAsk: mocks.useAsk,
  useCapture: mocks.useCapture,
}))

vi.mock('@devdeck/ui', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/ui')>('@devdeck/ui')
  return {
    ...actual,
    showToast: mocks.showToast,
  }
})

function renderPalette(open = true, onClose = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UnifiedCommandPalette open={open} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('<UnifiedCommandPalette>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useGlobalSearch.mockReturnValue({ data: [], isLoading: false })
    mocks.useAsk.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCapture.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    // Mock ResizeObserver for cmdk in JSDOM
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))

    // Mock scrollIntoView for cmdk
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renders search input and actions when open', () => {
    renderPalette()
    expect(screen.getByPlaceholderText(/Search or run a command/)).toBeInTheDocument()
    expect(screen.getByText(/Ask AI/i)).toBeInTheDocument()
    expect(screen.getByText(/Capture new item/i)).toBeInTheDocument()
  })

  it('triggers AI Ask flow', async () => {
    renderPalette()
    
    const input = screen.getByPlaceholderText(/Search or run a command/)
    fireEvent.change(input, { target: { value: 'Ask' } })
    
    const askButton = screen.getByText(/Ask AI/i)
    fireEvent.click(askButton)

    await waitFor(() => {
      expect(screen.getByText('Knowledge Agent')).toBeInTheDocument()
      expect(screen.getByText('Ask')).toBeInTheDocument()
    })
  })

  it('can return to command mode from ask results', async () => {
    mocks.useAsk.mockReturnValue({ 
      mutateAsync: vi.fn().mockResolvedValue({ answer: '...', citations: [], sources: [] }), 
      isPending: false 
    })

    renderPalette()
    fireEvent.change(screen.getByPlaceholderText(/Search or run a command/), { target: { value: 'Ask' } })
    fireEvent.click(screen.getByText(/Ask AI/i))

    await waitFor(() => expect(screen.getByText(/\[Back\]/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/\[Back\]/))

    expect(screen.queryByText('Knowledge Agent')).not.toBeInTheDocument()
  })

  it('copies command search results directly', async () => {
    const onClose = vi.fn()
    mocks.useGlobalSearch.mockReturnValue({
      data: [
        {
          type: 'entry',
          id: 'cmd-1',
          title: 'Run tests',
          subtitle: 'Node',
          extra: 'pnpm test',
        },
      ],
      isLoading: false,
    })

    renderPalette(true, onClose)

    fireEvent.click(screen.getByText('Run tests'))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('pnpm test')
      expect(mocks.showToast).toHaveBeenCalledWith('Copied to clipboard', 'success')
      expect(onClose).toHaveBeenCalled()
    })
  })
})
