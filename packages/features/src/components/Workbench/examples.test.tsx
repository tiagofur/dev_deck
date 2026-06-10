import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonTool } from './JsonTool'
import { RegexTool } from './RegexTool'

const mocks = vi.hoisted(() => ({
  useCapture: vi.fn(),
  useCircles: vi.fn(),
  useShareToCircle: vi.fn(),
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useCapture: mocks.useCapture,
    useCircles: mocks.useCircles,
    useShareToCircle: mocks.useShareToCircle,
  }
})

describe('Workbench tool examples', () => {
  beforeEach(() => {
    mocks.useCapture.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCircles.mockReturnValue({ data: [] })
    mocks.useShareToCircle.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('loads and formats the JSON example with one click', async () => {
    const user = userEvent.setup()
    render(<JsonTool />)

    await user.click(screen.getByRole('button', { name: /try an example/i }))

    const [input, output] = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    expect(input.value).toContain('"name":"devdeck"')
    expect(output.value).toContain('"name": "devdeck"')
  })

  it('loads the regex example and shows matches immediately', async () => {
    const user = userEvent.setup()
    render(<RegexTool />)

    await user.click(screen.getByRole('button', { name: /try an example/i }))

    expect(screen.getByDisplayValue('(\\w+)@(\\w+)\\.dev')).toBeInTheDocument()
    const matches = screen.getAllByRole('textbox').at(-1) as HTMLTextAreaElement
    expect(matches.value).toContain('"count": 2')
    expect(matches.value).toContain('ana@devdeck.dev')
  })
})
