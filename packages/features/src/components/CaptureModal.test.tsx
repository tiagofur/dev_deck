import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { CaptureModal } from './CaptureModal'

const mocks = vi.hoisted(() => ({
  captureMutateAsync: vi.fn(),
  captureReset: vi.fn(),
  previewMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    getLastUsedDeck: () => null,
    getRecentDeckIds: () => [],
    addRecentDeck: vi.fn(),
    setLastUsedDeck: vi.fn(),
    useDecks: () => ({ data: [], isLoading: false }),
    useCreateDeck: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCapture: () => ({
      mutateAsync: mocks.captureMutateAsync,
      reset: mocks.captureReset,
      isPending: false,
      error: null,
    }),
    usePreview: () => ({
      mutateAsync: mocks.previewMutateAsync,
      isPending: false,
    }),
    useUpdateItem: () => ({
      mutateAsync: mocks.updateMutateAsync,
      isPending: false,
    }),
  }
})

vi.mock('@devdeck/ui', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/ui')>('@devdeck/ui')
  return {
    ...actual,
    showToast: vi.fn(),
  }
})

function renderCaptureModal(onOpenItem = vi.fn(), props: Partial<ComponentProps<typeof CaptureModal>> = {}) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <CaptureModal open onClose={vi.fn()} onOpenItem={onOpenItem} source="manual" {...props} />
    </QueryClientProvider>,
  )
}

describe('<CaptureModal>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.previewMutateAsync.mockResolvedValue(null)
    mocks.captureMutateAsync.mockResolvedValue({
      item: {
        id: 'item-1',
        item_type: 'cli',
        title: 'ripgrep install',
        tags: ['cli'],
      },
      enrichment_status: 'queued',
      duplicate_of: null,
    })
  })

  it('auto-detects a GitHub repo and activates the Repo lane', async () => {
    const user = userEvent.setup()
    renderCaptureModal(vi.fn(), { initialUrl: 'https://github.com/paperclipai/paperclip' })

    await waitFor(() => {
      expect(screen.getByText(/auto: repo/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /repo \/ url/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switching to CLI forces type_hint cli on submit', async () => {
    const user = userEvent.setup()
    renderCaptureModal()

    await user.click(screen.getByRole('button', { name: /cli command/i }))
    await user.type(screen.getByLabelText(/^Name$/i), 'ripgrep install')
    await user.type(screen.getByLabelText(/^Command$/i), 'brew install ripgrep')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mocks.captureMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title_hint: 'ripgrep install',
          text: 'brew install ripgrep',
          type_hint: 'cli',
        }),
      )
    })
  })

  it('suggested tags can be applied without duplicating existing tags', async () => {
    const user = userEvent.setup()
    renderCaptureModal()

    await user.click(screen.getByRole('button', { name: /cli command/i }))
    const tags = screen.getByLabelText(/^Tags$/i)
    await user.clear(tags)
    await user.type(tags, 'cli')
    await user.click(screen.getByRole('button', { name: /^terminal$/i }))

    expect(tags).toHaveValue('cli, terminal')
  })

  it('keeps the success actions after capture', async () => {
    const user = userEvent.setup()
    renderCaptureModal()

    await user.click(screen.getByRole('button', { name: /cli command/i }))
    await user.type(screen.getByLabelText(/^Command$/i), 'brew install ripgrep')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open item/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /capture another/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /review with team/i })).toBeInTheDocument()
  })
})
