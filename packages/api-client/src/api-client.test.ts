import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api-client'
import { configureApiClient } from './config'
import { localStorageAdapter } from './auth/storage/localStorage'
import { setTokenStorage } from './auth/storage/types'

function mockJSONResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('api-client', () => {
  beforeEach(() => {
    localStorage.clear()
    setTokenStorage(localStorageAdapter)
    configureApiClient({ baseUrl: '', authMode: 'jwt', staticToken: undefined })
    vi.restoreAllMocks()
  })

  it('prefixes backend upload URLs in *_url response fields when an API base URL is configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJSONResponse({
      avatar_url: '/uploads/me.png',
      github_url: 'https://github.com/tiagofur',
      feed: [
        {
          curator_avatar_url: '/uploads/curator.png',
          item: {
            url: '/uploads/not-an-asset-url',
          },
        },
      ],
    })))

    configureApiClient({ baseUrl: 'https://api.example.test/', authMode: 'jwt' })

    const data = await api.get<{
      avatar_url: string
      github_url: string
      feed: Array<{ curator_avatar_url: string; item: { url: string } }>
    }>('/api/auth/me')

    expect(data.avatar_url).toBe('https://api.example.test/uploads/me.png')
    expect(data.github_url).toBe('https://github.com/tiagofur')
    expect(data.feed[0].curator_avatar_url).toBe('https://api.example.test/uploads/curator.png')
    expect(data.feed[0].item.url).toBe('/uploads/not-an-asset-url')
  })

  it('keeps backend upload URLs relative for same-origin web deployments', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockJSONResponse({
      avatar_url: '/uploads/me.png',
    })))

    configureApiClient({ baseUrl: '', authMode: 'jwt' })

    const data = await api.get<{ avatar_url: string }>('/api/auth/me')

    expect(data.avatar_url).toBe('/uploads/me.png')
  })
})
