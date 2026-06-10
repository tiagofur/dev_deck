import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useNotifications: vi.fn(),
  useUnreadNotificationsCount: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useMarkAllNotificationsRead: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@devdeck/ui', async () => {
  const actual = await vi.importActual<object>('@devdeck/ui')
  return {
    ...actual,
    Button: ({
      children,
      onClick,
      ...props
    }: {
      children: ReactNode
      onClick?: () => void
      [key: string]: unknown
    }) => (
      <button data-testid="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
    showToast: vi.fn(),
  }
})

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<object>('@devdeck/api-client')
  return {
    ...actual,
    useNotifications: mocks.useNotifications,
    useUnreadNotificationsCount: mocks.useUnreadNotificationsCount,
    useMarkNotificationRead: mocks.useMarkNotificationRead,
    useMarkAllNotificationsRead: mocks.useMarkAllNotificationsRead,
  }
})

vi.mock('@devdeck/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithProviders(ui: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe('NotificationCenter empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useUnreadNotificationsCount.mockReturnValue({ data: { unread_count: 0 } })
    mocks.useNotifications.mockReturnValue({ data: { notifications: [] }, isLoading: false })
    mocks.useMarkNotificationRead.mockReturnValue({ mutateAsync: vi.fn() })
    mocks.useMarkAllNotificationsRead.mockReturnValue({ mutate: vi.fn() })
  })

  it('shows guided empty state with hint when no notifications exist', async () => {
    const { NotificationCenter } = await import('../components/NotificationCenter')
    renderWithProviders(<NotificationCenter />)

    // Open the notification dropdown
    const bellButton = document.querySelector('button[aria-label="Notificaciones"]')
    expect(bellButton).toBeInTheDocument()
    await userEvent.click(bellButton!)

    // Should show the empty state hint text
    expect(screen.getByText('notifications.empty_hint')).toBeInTheDocument()

    // Should show the empty title
    expect(screen.getByText('notifications.empty')).toBeInTheDocument()

    // Should NOT show the old "all_clear" text
    expect(screen.queryByText('notifications.all_clear')).not.toBeInTheDocument()
  })
})
