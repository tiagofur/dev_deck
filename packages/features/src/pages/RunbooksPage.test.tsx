import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { RunbooksPage } from './RunbooksPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useRunbooks: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useRunbooks: mocks.useRunbooks,
  }
})

function makeRunbook(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rb-1',
    user_id: 'user-1',
    item_id: 'item-1',
    title: 'Install ripgrep',
    description: 'Setup steps for ripgrep',
    steps: [
      {
        id: 'step-1',
        runbook_id: 'rb-1',
        label: 'Install',
        command: 'brew install ripgrep',
        position: 0,
        is_completed: false,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ],
    item_title: 'ripgrep',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('<RunbooksPage>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists runbooks with their parent item and opens the item detail', async () => {
    const user = userEvent.setup()
    mocks.useRunbooks.mockReturnValue({ data: [makeRunbook()], isLoading: false, error: null })

    render(<RunbooksPage />)

    expect(screen.getByText('Install ripgrep')).toBeInTheDocument()
    expect(screen.getByText('from ripgrep')).toBeInTheDocument()

    await user.click(screen.getByText('Install ripgrep'))
    expect(mocks.navigate).toHaveBeenCalledWith('/items/item-1')
  })

  it('renders a guided empty state with a path to items', async () => {
    const user = userEvent.setup()
    mocks.useRunbooks.mockReturnValue({ data: [], isLoading: false, error: null })

    render(<RunbooksPage />)

    expect(screen.getByText('No runbooks yet')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button', { name: 'Go to items' })
    await user.click(buttons[buttons.length - 1])
    expect(mocks.navigate).toHaveBeenCalledWith('/items')
  })

  it('shows an error state when loading fails', () => {
    mocks.useRunbooks.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    })

    render(<RunbooksPage />)

    expect(screen.getByText('Could not load runbooks')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
