import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportVaultSection } from './ExportVaultSection'

const mocks = vi.hoisted(() => ({
  getBlob: vi.fn(),
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    api: { ...actual.api, getBlob: mocks.getBlob },
  }
})

describe('<ExportVaultSection>', () => {
  beforeEach(() => {
    mocks.getBlob.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
  })

  it('downloads the JSON export', async () => {
    const user = userEvent.setup()
    mocks.getBlob.mockResolvedValue(new Blob(['{}'], { type: 'application/json' }))

    render(<ExportVaultSection />)
    await user.click(screen.getByRole('button', { name: /export as json/i }))

    expect(mocks.getBlob).toHaveBeenCalledWith('/api/export/vault?format=json')
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('downloads the Markdown export', async () => {
    const user = userEvent.setup()
    mocks.getBlob.mockResolvedValue(new Blob(['# export'], { type: 'text/markdown' }))

    render(<ExportVaultSection />)
    await user.click(screen.getByRole('button', { name: /export as markdown/i }))

    expect(mocks.getBlob).toHaveBeenCalledWith('/api/export/vault?format=markdown')
  })
})
