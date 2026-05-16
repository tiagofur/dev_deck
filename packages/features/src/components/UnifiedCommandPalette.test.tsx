import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UnifiedCommandPalette } from './UnifiedCommandPalette'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  useGlobalSearch: vi.fn(),
  useAsk: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('@devdeck/api-client', () => ({
  useGlobalSearch: mocks.useGlobalSearch,
  useAsk: mocks.useAsk,
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
    expect(screen.getByPlaceholderText(/Buscá o tirá un comando/)).toBeInTheDocument()
    expect(screen.getByText(/Preguntar a la IA/i)).toBeInTheDocument()
    expect(screen.getByText(/Capturar nuevo item/i)).toBeInTheDocument()
  })

  it('triggers AI Ask flow', async () => {
    const askMutate = vi.fn().mockResolvedValue({
      answer: 'Esta es una respuesta con citas.',
      citations: [{ id: '1', title: 'Fuente 1', url: 'https://src1.com' }],
      sources: []
    })
    mocks.useAsk.mockReturnValue({ mutateAsync: askMutate, isPending: false })

    renderPalette()
    
    const input = screen.getByPlaceholderText(/Buscá o tirá un comando/)
    fireEvent.change(input, { target: { value: 'Preguntar' } })
    
    const askButton = screen.getByText(/Preguntar a la IA/i)
    fireEvent.click(askButton)

    await waitFor(() => {
      expect(askMutate).toHaveBeenCalledWith({ question: 'Preguntar' })
      expect(screen.getByText('Esta es una respuesta con citas.')).toBeInTheDocument()
      expect(screen.getByText('Fuente 1')).toBeInTheDocument()
    })
  })

  it('can return to command mode from ask results', async () => {
    mocks.useAsk.mockReturnValue({ 
      mutateAsync: vi.fn().mockResolvedValue({ answer: '...', citations: [], sources: [] }), 
      isPending: false 
    })

    renderPalette()
    fireEvent.change(screen.getByPlaceholderText(/Buscá o tirá un comando/), { target: { value: 'Preguntar' } })
    fireEvent.click(screen.getByText(/Preguntar a la IA/i))

    await waitFor(() => expect(screen.getByText(/\[volver\]/)).toBeInTheDocument())
    fireEvent.click(screen.getByText(/\[volver\]/))

    expect(screen.queryByText('Respuesta de DevDeck')).not.toBeInTheDocument()
  })
})
