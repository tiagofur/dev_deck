import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CircleDetailPage } from './CircleDetailPage'

const mocks = vi.hoisted(() => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
  useCircleDetail: vi.fn(),
  useCircleItems: vi.fn(),
  useCircleMembers: vi.fn(),
  useLeaveCircle: vi.fn(),
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
    useCircleDetail: mocks.useCircleDetail,
    useCircleItems: mocks.useCircleItems,
    useCircleMembers: mocks.useCircleMembers,
    useLeaveCircle: mocks.useLeaveCircle,
    useUpdateItem: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useAIEnrichItem: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useReviewItemAITags: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useCircles: vi.fn(() => ({ data: [], isLoading: false })),
    useShareToCircle: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  }
})

const sharedItem = {
  id: 'item-1',
  user_id: 'user-1',
  item_type: 'repo',
  title: 'Useful Auth Repo',
  url: 'https://github.com/example/auth',
  url_normalized: 'https://github.com/example/auth',
  description: 'Reference implementation',
  notes: '',
  tags: ['auth'],
  why_saved: '',
  when_to_use: '',
  source_channel: 'manual',
  meta: {
    circle_share_context: 'Use this when explaining JWT refresh token rotation.',
    circle_shared_by_name: 'Ada Lovelace',
    circle_shared_by_username: 'ada',
    circle_shared_at: '2026-05-23T21:00:00Z',
  },
  ai_summary: '',
  ai_tags: [],
  enrichment_status: 'ok',
  archived: false,
  is_favorite: false,
  created_at: '2026-05-23T00:00:00Z',
  updated_at: '2026-05-23T00:00:00Z',
  last_seen_at: null,
}

describe('<CircleDetailPage>', () => {
  const navigate = vi.fn()

  beforeEach(() => {
    mocks.useParams.mockReturnValue({ id: 'circle-1' })
    navigate.mockReset()
    mocks.useNavigate.mockReturnValue(navigate)
    mocks.useCircleDetail.mockReturnValue({
      data: {
        id: 'circle-1',
        name: 'Frontend Guild',
        description: 'Shared frontend memory',
        invite_code: 'ABC123',
      },
      isLoading: false,
      error: null,
    })
    mocks.useCircleItems.mockReturnValue({ data: [sharedItem], isLoading: false })
    mocks.useCircleMembers.mockReturnValue({ data: [], isLoading: false })
    mocks.useLeaveCircle.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('shows the context note stored with a shared Circle item', () => {
    render(<CircleDetailPage />)

    expect(screen.getByText('Why this was shared')).toBeInTheDocument()
    expect(screen.getByText('Use this when explaining JWT refresh token rotation.')).toBeInTheDocument()
    expect(screen.getByText(/Shared by Ada Lovelace/i)).toBeInTheDocument()
    expect(screen.getByText('Type: repo')).toBeInTheDocument()
    expect(screen.getByText('Source: manual')).toBeInTheDocument()
    expect(screen.getByText('#auth')).toBeInTheDocument()
    expect(screen.getByText('Useful Auth Repo')).toBeInTheDocument()
  })

  it('guides members to contribute when the shared vault is empty', () => {
    mocks.useCircleItems.mockReturnValue({ data: [], isLoading: false })

    render(<CircleDetailPage />)

    expect(screen.getByText('Start the shared vault')).toBeInTheDocument()
    expect(screen.getByText('1. Find signal')).toBeInTheDocument()
    expect(screen.getByText('2. Add context')).toBeInTheDocument()
    expect(screen.getByText('3. Share to Circle')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /open workbench/i }))
    expect(navigate).toHaveBeenCalledWith('/workbench')
  })
})
