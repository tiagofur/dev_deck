import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportStarsSection } from './ImportStarsSection'

const mocks = vi.hoisted(() => ({
  useMe: vi.fn(),
  useImportGithubStars: vi.fn(),
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useMe: mocks.useMe,
    useImportGithubStars: mocks.useImportGithubStars,
  }
})

describe('<ImportStarsSection>', () => {
  beforeEach(() => {
    mocks.useMe.mockReturnValue({ data: { login: 'tiagofur' } })
  })

  it('imports with the OAuth login by default and shows the summary', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi
      .fn()
      .mockResolvedValue({ username: 'tiagofur', total: 42, imported: 40, skipped: 2 })
    mocks.useImportGithubStars.mockReturnValue({ mutateAsync, isPending: false })

    render(<ImportStarsSection />)

    await user.click(screen.getByRole('button', { name: /import my stars/i }))

    expect(mutateAsync).toHaveBeenCalledWith({})
    expect(await screen.findByText(/Imported 40 repos from @tiagofur/)).toBeInTheDocument()
  })

  it('passes an explicit username when typed', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi
      .fn()
      .mockResolvedValue({ username: 'octocat', total: 1, imported: 1, skipped: 0 })
    mocks.useImportGithubStars.mockReturnValue({ mutateAsync, isPending: false })

    render(<ImportStarsSection />)

    await user.type(screen.getByRole('textbox', { name: /github username/i }), 'octocat')
    await user.click(screen.getByRole('button', { name: /import my stars/i }))

    expect(mutateAsync).toHaveBeenCalledWith({ username: 'octocat' })
  })

  it('disables the action without any username available', () => {
    mocks.useMe.mockReturnValue({ data: { login: '' } })
    mocks.useImportGithubStars.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

    render(<ImportStarsSection />)

    expect(screen.getByRole('button', { name: /import my stars/i })).toBeDisabled()
  })
})
