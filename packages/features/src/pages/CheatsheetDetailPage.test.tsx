import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CheatsheetDetailPage } from './CheatsheetDetailPage'

const mocks = vi.hoisted(() => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
  useCheatsheet: vi.fn(),
  useCreateEntry: vi.fn(),
  useDeleteCheatsheet: vi.fn(),
  useDeleteEntry: vi.fn(),
  useUpdateEntry: vi.fn(),
  useCapture: vi.fn(),
  useCircles: vi.fn(),
  useShareToCircle: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: mocks.useParams,
  useNavigate: mocks.useNavigate,
}))

vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useCheatsheet: mocks.useCheatsheet,
    useCreateEntry: mocks.useCreateEntry,
    useDeleteCheatsheet: mocks.useDeleteCheatsheet,
    useDeleteEntry: mocks.useDeleteEntry,
    useUpdateEntry: mocks.useUpdateEntry,
    useCapture: mocks.useCapture,
    useCircles: mocks.useCircles,
    useShareToCircle: mocks.useShareToCircle,
  }
})

vi.mock('@devdeck/ui', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/ui')>('@devdeck/ui')
  return {
    ...actual,
    showToast: mocks.showToast,
  }
})

const cheatsheet = {
  id: 'cheat-1',
  slug: 'git-basics',
  title: 'Git Basics',
  category: 'vcs',
  icon: '🌿',
  color: '#00ff99',
  description: 'Commands we use every day.',
  is_seed: false,
  created_at: '2026-05-23T00:00:00Z',
  updated_at: '2026-05-23T00:00:00Z',
  entries: [
    {
      id: 'entry-1',
      cheatsheet_id: 'cheat-1',
      label: 'Status',
      command: 'git status --short',
      description: 'Check concise working tree status.',
      tags: ['git', 'daily'],
      position: 0,
    },
  ],
}

describe('<CheatsheetDetailPage>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useParams.mockReturnValue({ id: 'cheat-1' })
    mocks.useNavigate.mockReturnValue(vi.fn())
    mocks.useCheatsheet.mockReturnValue({ data: cheatsheet, isLoading: false, error: null })
    mocks.useCreateEntry.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null })
    mocks.useDeleteCheatsheet.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useDeleteEntry.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, error: null })
    mocks.useCapture.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCircles.mockReturnValue({ data: [], isLoading: false })
    mocks.useShareToCircle.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('shares a cheatsheet to a Circle with required context', async () => {
    const capture = vi.fn().mockResolvedValue({
      item: { id: 'item-1' },
      duplicate_of: null,
      enrichment_status: 'ok',
    })
    const shareToCircle = vi.fn().mockResolvedValue({})
    mocks.useCapture.mockReturnValue({ mutateAsync: capture, isPending: false })
    mocks.useCircles.mockReturnValue({
      data: [{ id: 'circle-1', name: 'Backend Circle' }],
      isLoading: false,
    })
    mocks.useShareToCircle.mockReturnValue({ mutateAsync: shareToCircle, isPending: false })

    render(<CheatsheetDetailPage />)

    fireEvent.click(screen.getByRole('button', { name: /share cheatsheet to circle/i }))
    const saveAndShare = screen.getByRole('button', { name: /save and share cheatsheet/i })
    expect(saveAndShare).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Circle'), { target: { value: 'circle-1' } })
    fireEvent.change(screen.getByLabelText('Why this matters'), {
      target: { value: 'Useful baseline commands for onboarding.' },
    })
    fireEvent.click(saveAndShare)

    await waitFor(() => {
      expect(capture).toHaveBeenCalledWith({
        source: 'manual',
        text: expect.stringContaining('git status --short'),
        title_hint: 'Cheatsheet: Git Basics',
        type_hint: 'snippet',
        tags: ['cheatsheet', 'vcs', 'circle-share'],
        why_saved: 'Useful baseline commands for onboarding.',
      })
      expect(shareToCircle).toHaveBeenCalledWith({ circleId: 'circle-1', itemId: 'item-1' })
    })
  })
})
