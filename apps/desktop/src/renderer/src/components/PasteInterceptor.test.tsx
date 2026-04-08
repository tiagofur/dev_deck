import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PasteInterceptor } from './PasteInterceptor'

// Utility: dispatch a paste event on document.body so the global
// listener in PasteInterceptor sees it. React Testing Library's
// userEvent.paste only fires on focused elements, which is the opposite
// of what we want to test here.
function dispatchPaste(text: string, target: EventTarget = document.body) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
    clipboardData: DataTransfer
  }
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (format: string) => (format === 'text/plain' ? text : ''),
    },
  })
  target.dispatchEvent(event)
}

function renderWithQueryClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('<PasteInterceptor>', () => {
  beforeEach(() => {
    // Reset fetch mock between tests.
    vi.stubGlobal('fetch', vi.fn())
  })

  it('ignores pastes into editable targets', () => {
    renderWithQueryClient(
      <>
        <PasteInterceptor />
        <input data-testid="target" />
      </>,
    )
    const input = screen.getByTestId('target')
    dispatchPaste('https://github.com/foo/bar', input)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a floating card for URL pastes outside editable targets', async () => {
    renderWithQueryClient(<PasteInterceptor />)
    act(() => {
      dispatchPaste('https://github.com/charmbracelet/bubbletea')
    })
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    // Title chip shows "repo" label and the owner/repo derived title.
    expect(screen.getByText(/pegaste · repo/i)).toBeInTheDocument()
    expect(screen.getByText('charmbracelet/bubbletea')).toBeInTheDocument()
  })

  it('ignores very short pastes', () => {
    renderWithQueryClient(<PasteInterceptor />)
    dispatchPaste('hi')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('dismisses the card on Escape', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<PasteInterceptor />)
    act(() => {
      dispatchPaste('https://github.com/foo/bar')
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('fires POST /api/items/capture when Save is clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({
        item: {
          id: 'abc',
          item_type: 'repo',
          title: 'foo/bar',
          url: 'https://github.com/foo/bar',
          tags: [],
        },
        enrichment_status: 'queued',
        duplicate_of: null,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderWithQueryClient(<PasteInterceptor />)
    act(() => {
      dispatchPaste('https://github.com/foo/bar')
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/items/capture')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string) as {
      url: string
      source: string
    }
    expect(body.url).toBe('https://github.com/foo/bar')
    expect(body.source).toBe('web-paste')
  })
})
