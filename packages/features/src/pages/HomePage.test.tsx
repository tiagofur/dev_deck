import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { HomePage } from './HomePage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useItems: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../components/AppShell', () => ({
  AppShell: ({
    children,
    query,
    onQueryChange,
  }: {
    children: ReactNode
    query?: string
    onQueryChange?: (value: string) => void
  }) => (
    <div data-testid="app-shell">
      <input
        id="topbar-search"
        aria-label="Search"
        value={query ?? ''}
        onChange={(event) => onQueryChange?.(event.target.value)}
      />
      {children}
    </div>
  ),
}))

vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar" />,
}))

vi.mock('../components/Mascot/Mascot', () => ({
  Mascot: () => <div data-testid="mascot" />,
}))

vi.mock('../components/ItemGrid', () => ({
  ItemGrid: () => <div data-testid="item-grid" />,
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<object>('@devdeck/api-client')
  return {
    ...actual,
    useItems: mocks.useItems,
  }
})

describe('<HomePage>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useItems.mockReturnValue({
      data: { total: 0, items: [] },
      isLoading: false,
      error: null,
    })
  })

  it('shows actionable guidance for an empty repos list', async () => {
    const user = userEvent.setup()
    const captureListener = vi.fn()
    window.addEventListener('devdeck:open-capture', captureListener)

    render(<HomePage />)

    expect(screen.getByText('No repos saved yet')).toBeInTheDocument()
    expect(screen.getByText(/paste a github url/i)).toBeInTheDocument()
    expect(screen.getByText(/import github stars/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /capture your first repo/i }))
    expect(captureListener).toHaveBeenCalledTimes(1)

    window.removeEventListener('devdeck:open-capture', captureListener)
  })
})
