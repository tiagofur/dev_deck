import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepoDetailPage } from './RepoDetailPage'
import type { Repo } from '@devdeck/api-client'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  confirm: vi.fn(),
  showToast: vi.fn(),
  useRepo: vi.fn(),
  useUpdateRepo: vi.fn(),
  useDeleteRepo: vi.fn(),
  useRefreshRepo: vi.fn(),
  useCommands: vi.fn(),
  useAddCommand: vi.fn(),
  useUpdateCommand: vi.fn(),
  useDeleteCommand: vi.fn(),
  useReorderCommands: vi.fn(),
  usePackageScripts: vi.fn(),
  useBatchCreateCommands: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: 'repo-1' }),
}))

vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@devdeck/ui', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/ui')>('@devdeck/ui')
  return {
    ...actual,
    confirm: mocks.confirm,
    showToast: mocks.showToast,
  }
})

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useRepo: mocks.useRepo,
    useUpdateRepo: mocks.useUpdateRepo,
    useDeleteRepo: mocks.useDeleteRepo,
    useRefreshRepo: mocks.useRefreshRepo,
    useCommands: mocks.useCommands,
    useAddCommand: mocks.useAddCommand,
    useUpdateCommand: mocks.useUpdateCommand,
    useDeleteCommand: mocks.useDeleteCommand,
    useReorderCommands: mocks.useReorderCommands,
    usePackageScripts: mocks.usePackageScripts,
    useBatchCreateCommands: mocks.useBatchCreateCommands,
  }
})

const repo: Repo = {
  id: 'repo-1',
  url: 'https://github.com/devdeck/app',
  source: 'github',
  owner: 'devdeck',
  name: 'app',
  description: 'Developer utility belt',
  language: 'TypeScript',
  language_color: '#3178c6',
  stars: 10,
  forks: 2,
  avatar_url: null,
  og_image_url: null,
  homepage: null,
  topics: ['devtools'],
  notes: '',
  tags: [],
  archived: false,
  added_at: '2026-05-20T00:00:00Z',
  last_fetched_at: null,
  last_seen_at: null,
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <RepoDetailPage />
    </QueryClientProvider>,
  )
}

describe('<RepoDetailPage>', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.confirm.mockResolvedValue(true)
    mocks.useUpdateRepo.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteRepo.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false })
    mocks.useRefreshRepo.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCommands.mockReturnValue({ data: [] })
    mocks.useAddCommand.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null })
    mocks.useUpdateCommand.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null })
    mocks.useDeleteCommand.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useReorderCommands.mockReturnValue({ mutate: vi.fn() })
    mocks.usePackageScripts.mockReturnValue({ data: [], isLoading: false, error: null })
    mocks.useBatchCreateCommands.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null })
  })

  it('renders a friendly deleted/not-found state', async () => {
    const user = userEvent.setup()
    mocks.useRepo.mockReturnValue({ data: undefined, isLoading: false, error: new Error('not found') })

    renderPage()

    expect(screen.getByText('Repo no encontrado o borrado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /volver a items/i }))
    expect(mocks.navigate).toHaveBeenCalledWith('/items', { replace: true })
  })

  it('navigates away with replace after deleting a repo', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    mocks.useRepo.mockReturnValue({ data: repo, isLoading: false, error: null })
    mocks.useDeleteRepo.mockReturnValue({ mutateAsync, isPending: false })

    renderPage()
    await user.click(screen.getByRole('button', { name: /^borrar$/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('repo-1'))
    expect(mocks.navigate).toHaveBeenCalledWith('/items', { replace: true })
  })
})
