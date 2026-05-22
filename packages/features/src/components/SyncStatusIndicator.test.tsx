import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mocks = vi.hoisted(() => ({
  getPendingCount: vi.fn(),
  syncNow: vi.fn(),
  useSystemConfig: vi.fn(),
}))

vi.mock('@devdeck/api-client', () => ({
  getPendingCount: mocks.getPendingCount,
  syncNow: mocks.syncNow,
  useSystemConfig: mocks.useSystemConfig,
}))

function renderIndicator() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <SyncStatusIndicator />
    </QueryClientProvider>
  )
}

describe('<SyncStatusIndicator>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPendingCount.mockResolvedValue(0)
    mocks.useSystemConfig.mockReturnValue({ data: { ai_provider: 'openai', sync_enabled: true }, isLoading: false })
    
    // Mock navigator.onLine as true by default
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    })
  })

  it('renders Synced state when online and sync is enabled', async () => {
    renderIndicator()
    await waitFor(() => {
      expect(screen.getByText(/Synced/i)).toBeInTheDocument()
    })
  })

  it('renders Offline state when offline and sync is enabled', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false })
    renderIndicator()
    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument()
    })
  })

  it('renders Pending count button when pending count > 0', async () => {
    mocks.getPendingCount.mockResolvedValue(3)
    renderIndicator()
    await waitFor(() => {
      expect(screen.getByText(/3 pending/i)).toBeInTheDocument()
    })
  })

  it('renders Cloud Mode badge when sync is disabled, ignoring pending/offline states', async () => {
    mocks.useSystemConfig.mockReturnValue({ data: { ai_provider: 'openai', sync_enabled: false }, isLoading: false })
    mocks.getPendingCount.mockResolvedValue(3)
    Object.defineProperty(window.navigator, 'onLine', { value: false })

    renderIndicator()
    await waitFor(() => {
      expect(screen.getByText(/Cloud Mode/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/Offline/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/3 pending/i)).not.toBeInTheDocument()
  })
})
