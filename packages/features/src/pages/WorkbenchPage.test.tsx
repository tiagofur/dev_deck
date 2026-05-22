import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { WorkbenchPage } from './WorkbenchPage'

const mocks = vi.hoisted(() => ({
  useCapture: vi.fn(),
  useGlobalSearch: vi.fn(),
  useItem: vi.fn(),
  useUpdateItem: vi.fn(),
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useCapture: mocks.useCapture,
    useGlobalSearch: mocks.useGlobalSearch,
    useItem: mocks.useItem,
    useUpdateItem: mocks.useUpdateItem,
  }
})

vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function renderWorkbench(route = '/workbench') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <WorkbenchPage />
    </MemoryRouter>
  )
}

describe('<WorkbenchPage>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    mocks.useCapture.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useGlobalSearch.mockReturnValue({ data: [], isLoading: false })
    mocks.useItem.mockReturnValue({ data: undefined, isLoading: false })
    mocks.useUpdateItem.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('formats JSON locally in the Workbench UI', async () => {
    renderWorkbench()

    fireEvent.change(screen.getByLabelText('Input'), { target: { value: '{"name":"DevDeck"}' } })

    expect(screen.getByLabelText('Output')).toHaveValue('{\n  "name": "DevDeck"\n}')
  })

  it('opens a specific tool from the Workbench deep link', () => {
    renderWorkbench('/workbench?tool=secrets')

    expect(screen.getByRole('heading', { name: /secret scanner/i })).toBeInTheDocument()
  })

  it('sends an API request with mocked network and shows the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderWorkbench('/workbench?tool=api')

    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://api.example.test/health' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send request/i }))

    expect(await screen.findByText('200 OK')).toBeInTheDocument()
    expect(screen.getByLabelText('Response')).toHaveValue(
      '{\n  "content-type": "application/json"\n}\n\n{"ok":true}'
    )
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      body: undefined,
    })
  })

  it('copies related project commands from the project context surface', async () => {
    mocks.useGlobalSearch.mockReturnValue({
      data: [
        {
          type: 'entry',
          id: 'cmd-1',
          title: 'Run tests',
          subtitle: 'package scripts',
          extra: 'pnpm test',
        },
      ],
      isLoading: false,
    })

    renderWorkbench('/workbench?tool=project')

    fireEvent.click(screen.getByRole('button', { name: /copy command/i }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('pnpm test')
    })
  })

  it('links an existing item to the current project with a project tag', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    mocks.useGlobalSearch.mockReturnValue({
      data: [
        {
          type: 'item',
          id: 'item-1',
          title: 'Deploy checklist',
          subtitle: 'workflow',
          extra: '',
        },
      ],
      isLoading: false,
    })
    mocks.useItem.mockReturnValue({
      data: { id: 'item-1', tags: ['workflow'] },
      isLoading: false,
    })
    mocks.useUpdateItem.mockReturnValue({ mutateAsync, isPending: false })

    renderWorkbench('/workbench?tool=project')

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'dev_deck' } })
    fireEvent.click(screen.getByRole('button', { name: /link project/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'item-1',
        input: { tags: ['workflow', 'project:dev_deck'] },
      })
    })
  })

  it('keeps snippet aliases disabled by default and expands only after explicit enable', async () => {
    renderWorkbench('/workbench?tool=expander')

    expect(screen.getByLabelText('Expansion preview')).toHaveValue('Snippet aliases are disabled.')
    expect(screen.getByLabelText('Expanded text')).toHaveValue('Snippet aliases are disabled.')

    fireEvent.click(screen.getByRole('checkbox', { name: /enabled/i }))
    fireEvent.click(screen.getByRole('button', { name: /save alias locally/i }))

    expect(screen.getByLabelText('Expansion preview')).toHaveValue('docker run --rm -it IMAGE sh')
    expect(screen.getByLabelText('Expanded text')).toHaveValue('Deploy with docker run --rm -it IMAGE sh')
  })
})
