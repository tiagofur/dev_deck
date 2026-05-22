import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Topbar } from './Topbar'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  usePreferences: vi.fn(),
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
    usePreferences: mocks.usePreferences,
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

function renderTopbar() {
  return render(
    <MemoryRouter>
      <Topbar
        query=""
        onQueryChange={vi.fn()}
        onAdd={vi.fn()}
        onDiscovery={vi.fn()}
        onSettings={vi.fn()}
        onGlobalSearch={vi.fn()}
        reviewCount={4}
      />
    </MemoryRouter>,
  )
}

describe('<Topbar>', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.usePreferences.mockReturnValue({ activeOrgId: null })
    mocks.useMe.mockReturnValue({ data: undefined })
  })

  it('opens secondary navigation from the More disclosure', async () => {
    const user = userEvent.setup()
    renderTopbar()

    const more = screen.getByRole('button', { name: /more/i })
    expect(more).toHaveAttribute('aria-expanded', 'false')

    await user.click(more)

    expect(more).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('navigation', { name: /more navigation/i })
    expect(menu).toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: /cheats/i })).toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: /review 4/i })).toBeInTheDocument()
  })

  it('keeps primary navigation and actions directly reachable', () => {
    renderTopbar()

    expect(screen.getByRole('button', { name: /items/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /workbench/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discover/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })
})
