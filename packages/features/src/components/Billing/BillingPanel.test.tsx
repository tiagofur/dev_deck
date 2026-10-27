import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { BillingPanel } from './BillingPanel'

const mocks = vi.hoisted(() => ({
  useMe: vi.fn(),
  useSystemConfig: vi.fn(),
  useAIUsage: vi.fn(),
  useCheckout: vi.fn(),
  usePortal: vi.fn(),
}))

vi.mock('@heapdeck/api-client', () => ({
  useMe: mocks.useMe,
  useSystemConfig: mocks.useSystemConfig,
  useAIUsage: mocks.useAIUsage,
  useCheckout: mocks.useCheckout,
  usePortal: mocks.usePortal,
}))

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BillingPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function defaults() {
  mocks.useAIUsage.mockReturnValue({
    data: { used_cents: 42.5, cap_cents: 300, resets_at: '2026-11-01T00:00:00Z', by_action: [] },
    isLoading: false,
  })
  mocks.useCheckout.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({ checkout_url: 'https://checkout/x' }), isPending: false })
  mocks.usePortal.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({ portal_url: 'https://portal/x' }), isPending: false })
}

describe('<BillingPanel>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    defaults()
  })

  it('shows the self-hosted banner when billing is off', () => {
    mocks.useMe.mockReturnValue({ data: { plan: 'free' } })
    mocks.useSystemConfig.mockReturnValue({ data: { billing_enabled: false } })
    renderPanel()
    expect(screen.getByText('Self-hosted')).toBeInTheDocument()
    expect(screen.queryByText('Upgrade — $5/mo')).not.toBeInTheDocument()
  })

  it('shows the free plan comparison and triggers checkout', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ checkout_url: 'https://checkout/x' })
    mocks.useCheckout.mockReturnValue({ mutateAsync, isPending: false })
    mocks.useMe.mockReturnValue({ data: { plan: 'free' } })
    mocks.useSystemConfig.mockReturnValue({ data: { billing_enabled: true } })
    renderPanel()

    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /upgrade/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
  })

  it('shows the Pro meter with spend and manage action', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ portal_url: 'https://portal/x' })
    mocks.usePortal.mockReturnValue({ mutateAsync, isPending: false })
    mocks.useMe.mockReturnValue({ data: { plan: 'pro' } })
    mocks.useSystemConfig.mockReturnValue({ data: { billing_enabled: true } })
    mocks.useAIUsage.mockReturnValue({
      data: {
        used_cents: 240,
        cap_cents: 300,
        resets_at: '2026-11-01T00:00:00Z',
        by_action: [{ action: 'enrich', events: 120, cents: 30.1 }],
      },
      isLoading: false,
    })
    renderPanel()

    expect(screen.getByText('Current plan')).toBeInTheDocument()
    // 240/300 = 80% — rendered via style width on the progress bar.
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveStyle({ width: '80%' })
    expect(screen.getByText(/enrich/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /manage/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
  })
})
