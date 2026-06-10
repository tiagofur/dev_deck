import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DemoDataSection } from './DemoDataSection'

const mocks = vi.hoisted(() => ({
  useInstallStarterKit: vi.fn(),
  useRemoveDemoData: vi.fn(),
  confirm: vi.fn(),
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useInstallStarterKit: mocks.useInstallStarterKit,
    useRemoveDemoData: mocks.useRemoveDemoData,
  }
})

vi.mock('@devdeck/ui', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/ui')>('@devdeck/ui')
  return {
    ...actual,
    confirm: mocks.confirm,
  }
})

describe('<DemoDataSection>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('installs the demo kit', async () => {
    const user = userEvent.setup()
    const install = vi.fn().mockResolvedValue(undefined)
    mocks.useInstallStarterKit.mockReturnValue({ mutateAsync: install, isPending: false })
    mocks.useRemoveDemoData.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

    render(<DemoDataSection />)
    await user.click(screen.getByRole('button', { name: /load demo data/i }))

    expect(install).toHaveBeenCalledWith('devdeck-demo')
  })

  it('removes demo data only after confirmation', async () => {
    const user = userEvent.setup()
    const remove = vi.fn().mockResolvedValue({ removed: 17 })
    mocks.useInstallStarterKit.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useRemoveDemoData.mockReturnValue({ mutateAsync: remove, isPending: false })

    mocks.confirm.mockResolvedValueOnce(false)
    render(<DemoDataSection />)
    await user.click(screen.getByRole('button', { name: /remove demo data/i }))
    expect(remove).not.toHaveBeenCalled()

    mocks.confirm.mockResolvedValueOnce(true)
    await user.click(screen.getByRole('button', { name: /remove demo data/i }))
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
