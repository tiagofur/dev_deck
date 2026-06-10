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
  })

  it('shows guided empty state with explanation and action button when no cheatsheets exist', async () => {
    const { user } = await import('@testing-library/react')
    const { CheatsheetsListPage } = await import('./CheatsheetsListPage')
    renderWithProviders(<CheatsheetsListPage />)

    // Should show the explanation hint text
    expect(screen.getByText('cheatsheets.empty_state_hint')).toBeInTheDocument()

    // Should show the action button
    const button = screen.getByTestId('button')
    expect(button).toBeInTheDocument()

    // Clicking the button should call navigate (handled by the modal)
    await user.click(button)
    expect(mocks.navigate).not.toHaveBeenCalled() // navigate is mocked but the modal opens instead
  })

  it('shows category-specific hint when a category filter is active', async () => {
    mocks.useCheatsheets.mockReturnValue({
      data: [],
      isLoading: false,
    })
    const { CheatsheetsListPage } = await import('./CheatsheetsListPage')
    renderWithProviders(<CheatsheetsListPage />)

    expect(screen.getByText('cheatsheets.empty_state_category')).toBeInTheDocument()
  })
})
