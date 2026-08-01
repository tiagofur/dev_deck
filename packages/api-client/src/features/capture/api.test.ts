import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api-client'
import { configureApiClient } from '../../config'
import { localStorageAdapter } from '../../auth/storage/localStorage'
import { setTokenStorage } from '../../auth/storage/types'

// Mock preferences module to control activeOrgId
// vi.hoisted ensures the mock is available when vi.mock (hoisted) runs
const mockGetPreferences = vi.hoisted(() => vi.fn())
vi.mock('../../preferences', () => ({
  getPreferences: mockGetPreferences,
  setPreferences: vi.fn(),
}))

function mockJSONResponse(body: unknown): Response {
  return {
    ok: true,
    status: 201,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('api.post — X-Org-ID header', () => {
  beforeEach(() => {
    localStorage.clear()
    setTokenStorage(localStorageAdapter)
    configureApiClient({ baseUrl: '', authMode: 'jwt', staticToken: undefined })
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('sends X-Org-ID header when activeOrgId is set', async () => {
    mockGetPreferences.mockReturnValue({
      clientId: 'test-client',
      lastSyncAt: null,
      activeOrgId: 'org-123-abc',
    })

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(mockJSONResponse({
      item: { id: 'item-1', org_id: 'org-123-abc' },
      enrichment_status: 'pending',
      duplicate_of: null,
    }))

    await api.post('/api/items/capture', {
      url: 'https://github.com/test/repo',
      type_hint: 'repo',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['X-Org-ID']).toBe('org-123-abc')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('does NOT send X-Org-ID header when activeOrgId is null', async () => {
    mockGetPreferences.mockReturnValue({
      clientId: 'test-client',
      lastSyncAt: null,
      activeOrgId: null,
    })

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(mockJSONResponse({
      item: { id: 'item-2', org_id: null },
      enrichment_status: 'pending',
      duplicate_of: null,
    }))

    await api.post('/api/items/capture', {
      text: 'remember to check deployment',
      type_hint: 'note',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['X-Org-ID']).toBeUndefined()
  })

  it('sends correct X-Org-ID when switching workspaces', async () => {
    const fetchMock = vi.mocked(fetch)

    // First capture in workspace A
    mockGetPreferences.mockReturnValue({
      clientId: 'test-client',
      lastSyncAt: null,
      activeOrgId: 'workspace-alpha',
    })
    fetchMock.mockResolvedValueOnce(mockJSONResponse({
      item: { id: 'item-3', org_id: 'workspace-alpha' },
      enrichment_status: 'pending',
      duplicate_of: null,
    }))

    await api.post('/api/items/capture', {
      url: 'https://github.com/alpha/tool',
      type_hint: 'repo',
    })

    const [, options1] = fetchMock.mock.calls[0]
    expect(options1.headers['X-Org-ID']).toBe('workspace-alpha')

    // Switch to workspace B
    mockGetPreferences.mockReturnValue({
      clientId: 'test-client',
      lastSyncAt: null,
      activeOrgId: 'workspace-beta',
    })
    fetchMock.mockResolvedValueOnce(mockJSONResponse({
      item: { id: 'item-4', org_id: 'workspace-beta' },
      enrichment_status: 'pending',
      duplicate_of: null,
    }))

    await api.post('/api/items/capture', {
      url: 'https://github.com/beta/tool',
      type_hint: 'repo',
    })

    const [, options2] = fetchMock.mock.calls[1]
    expect(options2.headers['X-Org-ID']).toBe('workspace-beta')
  })
})
