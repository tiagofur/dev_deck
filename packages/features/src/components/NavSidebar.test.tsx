import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NavSidebar } from './NavSidebar'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  usePreferences: vi.fn(),
  useMe: vi.fn(),
  useFeatureFlags: vi.fn(),
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
    useFeatureFlags: mocks.useFeatureFlags,
  }
})

describe('<NavSidebar>', () => {
  let onCloseMock: any

  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.usePreferences.mockReturnValue({ activeOrgId: null })
    mocks.useMe.mockReturnValue({ data: { role: 'user', username: 'tiago', avatar_url: 'avatar.png' } })
    mocks.useFeatureFlags.mockReturnValue({
      explore: false,
      reputation: false,
      team_review: true,
      realtime: false,
    })
    onCloseMock = vi.fn()
  })

  function renderSidebar(props: { isOpen?: boolean; reviewCount?: number } = {}) {
    return render(
      <MemoryRouter initialEntries={['/items']}>
        <NavSidebar
          isOpen={props.isOpen ?? false}
          onClose={onCloseMock}
          reviewCount={props.reviewCount}
        />
      </MemoryRouter>,
    )
  }

  it('renders Vault, Tools, Social and System navigation items', () => {
    renderSidebar()

    const sidebar = screen.getByTestId('desktop-sidebar')

    // Title / Logo
    expect(within(sidebar).getByRole('heading', { name: /devdeck/i })).toBeInTheDocument()

    // Sections
    expect(within(sidebar).getByText('Vault')).toBeInTheDocument()
    expect(within(sidebar).getByText('Tools')).toBeInTheDocument()
    expect(within(sidebar).getByText('Social')).toBeInTheDocument()
    expect(within(sidebar).getByText('System')).toBeInTheDocument()

    // Items
    expect(within(sidebar).getByRole('link', { name: /items/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /repos/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /cheatsheets/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /workbench/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /discovery/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /circles/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /following/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /settings/i })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: /profile/i })).toBeInTheDocument()
  })

  it('performs progressive disclosure on the Team section based on activeOrgId', () => {
    // 1. Without active organization: Team section must be hidden
    const { rerender } = renderSidebar()
    const sidebar = screen.getByTestId('desktop-sidebar')
    expect(within(sidebar).queryByText('Team')).not.toBeInTheDocument()

    // 2. With active organization: Team section must be visible
    mocks.usePreferences.mockReturnValue({ activeOrgId: 'org_123' })
    rerender(
      <MemoryRouter initialEntries={['/items']}>
        <NavSidebar isOpen={false} onClose={onCloseMock} />
      </MemoryRouter>,
    )
    const updatedSidebar = screen.getByTestId('desktop-sidebar')
    expect(within(updatedSidebar).getByText('Team')).toBeInTheDocument()
    expect(within(updatedSidebar).getByRole('link', { name: /activity/i })).toBeInTheDocument()
    expect(within(updatedSidebar).getByRole('link', { name: /review/i })).toBeInTheDocument()
  })

  it('hides the Review entry when the team_review feature flag is off', () => {
    mocks.usePreferences.mockReturnValue({ activeOrgId: 'org_123' })
    mocks.useFeatureFlags.mockReturnValue({
      explore: false,
      reputation: false,
      team_review: false,
      realtime: false,
    })
    renderSidebar()

    const sidebar = screen.getByTestId('desktop-sidebar')
    expect(within(sidebar).getByRole('link', { name: /activity/i })).toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: /review/i })).not.toBeInTheDocument()
  })

  it('renders a badge with the reviewCount on the Review item if present', () => {
    mocks.usePreferences.mockReturnValue({ activeOrgId: 'org_123' })
    renderSidebar({ reviewCount: 15 })

    const sidebar = screen.getByTestId('desktop-sidebar')
    expect(within(sidebar).getByText('15')).toBeInTheDocument()
  })

  it('performs role-based disclosure on Admin dashboard link', () => {
    // 1. Regular user: Admin dashboard must be hidden
    const { rerender } = renderSidebar()
    const sidebar = screen.getByTestId('desktop-sidebar')
    expect(within(sidebar).queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()

    // 2. Admin user: Admin dashboard must be visible
    mocks.useMe.mockReturnValue({ data: { role: 'admin', username: 'admin_user', avatar_url: 'avatar.png' } })
    rerender(
      <MemoryRouter initialEntries={['/items']}>
        <NavSidebar isOpen={false} onClose={onCloseMock} />
      </MemoryRouter>,
    )
    const updatedSidebar = screen.getByTestId('desktop-sidebar')
    expect(within(updatedSidebar).getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })

  it('highlights the active navigation link based on current path', () => {
    renderSidebar()
    
    const sidebar = screen.getByTestId('desktop-sidebar')
    const itemsLink = within(sidebar).getByRole('link', { name: /items/i })
    expect(itemsLink.className).toContain('bg-accent-lime') // Active styles
    
    const reposLink = within(sidebar).getByRole('link', { name: /repos/i })
    expect(reposLink.className).not.toContain('bg-accent-lime')
  })

  it('triggers onClose when an item is clicked', async () => {
    const user = userEvent.setup()
    renderSidebar({ isOpen: true })

    const mobileDrawer = screen.getByTestId('mobile-drawer')
    const reposLink = within(mobileDrawer).getByRole('link', { name: /repos/i })
    await user.click(reposLink)

    expect(onCloseMock).toHaveBeenCalledOnce()
  })
})
