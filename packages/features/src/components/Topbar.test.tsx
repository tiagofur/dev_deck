import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Topbar } from './Topbar'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useMe: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useMe: mocks.useMe,
  }
})

vi.mock('./WorkspaceSwitcher', () => ({
  WorkspaceSwitcher: () => <button type="button">Personal</button>,
}))

vi.mock('./SyncStatusIndicator', () => ({
  SyncStatusIndicator: () => <span>Synced</span>,
}))

vi.mock('./NotificationCenter', () => ({
  NotificationCenter: () => <button type="button" aria-label="Notifications">Bell</button>,
}))

describe('<Topbar>', () => {
  let onQueryChangeMock: any
  let onAddMock: any
  let onGlobalSearchMock: any
  let onMenuToggleMock: any

  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useMe.mockReturnValue({ data: undefined })

    onQueryChangeMock = vi.fn()
    onAddMock = vi.fn()
    onGlobalSearchMock = vi.fn()
    onMenuToggleMock = vi.fn()
  })

  function renderTopbar() {
    return render(
      <MemoryRouter>
        <Topbar
          query=""
          onQueryChange={onQueryChangeMock}
          onAdd={onAddMock}
          onGlobalSearch={onGlobalSearchMock}
          onMenuToggle={onMenuToggleMock}
          reviewCount={4}
        />
      </MemoryRouter>,
    )
  }

  it('renders essential controls and triggers menu toggle', async () => {
    const user = userEvent.setup()
    renderTopbar()

    // Workspace Switcher
    expect(screen.getByRole('button', { name: /personal/i })).toBeInTheDocument()

    // Sync Indicator & Notifications
    expect(screen.getByText('Synced')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()

    // Capture '+' Action
    const captureButton = screen.getByRole('button', { name: /capture/i })
    expect(captureButton).toBeInTheDocument()
    await user.click(captureButton)
    expect(onAddMock).toHaveBeenCalledOnce()

    // Menu Hamburger Trigger
    const menuToggle = screen.getByRole('button', { name: /open navigation menu/i })
    expect(menuToggle).toBeInTheDocument()
    await user.click(menuToggle)
    expect(onMenuToggleMock).toHaveBeenCalledOnce()
  })

  it('interacts with global search elements', async () => {
    const user = userEvent.setup()
    renderTopbar()

    // Search input (desktop view)
    const searchInput = screen.getByPlaceholderText(/search items, commands, prompts/i)
    expect(searchInput).toBeInTheDocument()
    await user.type(searchInput, 'hello')
    expect(onQueryChangeMock).toHaveBeenCalled()

    // Search button (mobile view)
    const searchButton = screen.getByRole('button', { name: /global search/i })
    expect(searchButton).toBeInTheDocument()
    await user.click(searchButton)
    expect(onGlobalSearchMock).toHaveBeenCalledOnce()
  })
})
