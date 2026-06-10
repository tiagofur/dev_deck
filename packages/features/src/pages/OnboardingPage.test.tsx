import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingPage } from './OnboardingPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useMe: vi.fn(),
  useOnboardingKits: vi.fn(),
  useInstallStarterKit: vi.fn(),
  useCompleteOnboarding: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useMe: mocks.useMe,
    useOnboardingKits: mocks.useOnboardingKits,
    useInstallStarterKit: mocks.useInstallStarterKit,
    useCompleteOnboarding: mocks.useCompleteOnboarding,
  }
})

const demoKit = {
  id: 'devdeck-demo',
  name: 'DevDeck Launch Demo',
  description: 'A realistic demo vault.',
  icon: 'demo.ico',
  items: [],
}

describe('<OnboardingPage>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useMe.mockReturnValue({ data: { display_name: 'Tiago' } })
    mocks.useOnboardingKits.mockReturnValue({ data: { kits: [demoKit] }, isLoading: false })
    mocks.useInstallStarterKit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCompleteOnboarding.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  async function advanceToLoopStep(user: ReturnType<typeof userEvent.setup>, pickDemo = false) {
    await user.click(screen.getByRole('button', { name: /start/i }))
    // AnimatePresence transitions mount the next step asynchronously.
    if (pickDemo) {
      await user.click(await screen.findByText('DevDeck Launch Demo'))
    }
    await user.click(await screen.findByRole('button', { name: /continue/i }))
    await screen.findByText(/1\. Capture/i)
  }

  it('teaches the capture → retrieve → reuse loop honestly on the final step', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)

    await advanceToLoopStep(user)

    expect(screen.getByText(/1\. Capture/i)).toBeInTheDocument()
    expect(screen.getByText(/2\. Retrieve/i)).toBeInTheDocument()
    expect(screen.getByText(/3\. Reuse/i)).toBeInTheDocument()
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument()

    // The dishonest static claims are gone.
    expect(screen.queryByText(/sync active/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ai ready/i)).not.toBeInTheDocument()
  })

  it('suggests an intent search when the demo vault was picked', async () => {
    const user = userEvent.setup()
    render(<OnboardingPage />)

    await advanceToLoopStep(user, true)

    expect(screen.getByText(/You picked the demo vault/)).toBeInTheDocument()
  })

  it('installs the selected kit and completes onboarding on finish', async () => {
    const user = userEvent.setup()
    const install = vi.fn().mockResolvedValue(undefined)
    const complete = vi.fn().mockResolvedValue(undefined)
    mocks.useInstallStarterKit.mockReturnValue({ mutateAsync: install, isPending: false })
    mocks.useCompleteOnboarding.mockReturnValue({ mutateAsync: complete, isPending: false })

    render(<OnboardingPage />)
    await advanceToLoopStep(user, true)
    await user.click(screen.getByRole('button', { name: /enter|finish|go to/i }))

    expect(install).toHaveBeenCalledWith('devdeck-demo')
    expect(complete).toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith('/items')
  })
})
