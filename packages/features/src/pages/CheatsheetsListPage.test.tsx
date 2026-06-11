import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useCheatsheets: vi.fn(),
  useCreateCheatsheet: vi.fn(),
  useDeleteCheatsheet: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
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
    useCheatsheets: mocks.useCheatsheets,
    useCreateCheatsheet: mocks.useCreateCheatsheet,
    useDeleteCheatsheet: mocks.useDeleteCheatsheet,
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

describe('CheatsheetsListPage empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useCheatsheets.mockReturnValue({ data: [], isLoading: false })
    mocks.useCreateCheatsheet.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteCheatsheet.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('shows guided empty state and opens the create modal from its action', async () => {
    const user = userEvent.setup()
    const { CheatsheetsListPage } = await import('./CheatsheetsListPage')
    renderWithProviders(<CheatsheetsListPage />)

    expect(screen.getByText('cheatsheets.empty_state_title')).toBeInTheDocument()
    expect(screen.getByText('cheatsheets.empty_state')).toBeInTheDocument()
    expect(screen.getByText('cheatsheets.empty_state_hint')).toBeInTheDocument()

    // No form inputs until the create modal opens.
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    await user.click(screen.getByText('cheatsheets.empty_state_action'))
    expect(screen.queryAllByRole('textbox').length).toBeGreaterThan(0)
  })

  it('shows the category-specific hint when a category filter is active', async () => {
    const user = userEvent.setup()
    const { CheatsheetsListPage } = await import('./CheatsheetsListPage')
    renderWithProviders(<CheatsheetsListPage />)

    await user.click(screen.getByText('cheatsheets.categories.vcs'))

    expect(screen.getByText('cheatsheets.empty_state_category_title')).toBeInTheDocument()
    expect(screen.getByText('cheatsheets.empty_state_category')).toBeInTheDocument()
  })
})
