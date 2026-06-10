import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IntegrationsList } from './IntegrationsList'

const mocks = vi.hoisted(() => ({
  useFeaturedPlugins: vi.fn(),
  useCustomEnrichers: vi.fn(),
  useWebhooks: vi.fn(),
  useCreateCustomEnricher: vi.fn(),
  useCreateWebhook: vi.fn(),
}))

vi.mock('@devdeck/api-client', async () => {
  const actual = await vi.importActual<typeof import('@devdeck/api-client')>('@devdeck/api-client')
  return {
    ...actual,
    useFeaturedPlugins: mocks.useFeaturedPlugins,
    useCustomEnrichers: mocks.useCustomEnrichers,
    useWebhooks: mocks.useWebhooks,
    useCreateCustomEnricher: mocks.useCreateCustomEnricher,
    useCreateWebhook: mocks.useCreateWebhook,
  }
})

const featured = [
  {
    id: 'npm-enricher',
    type: 'enricher',
    name: 'NPM Registry',
    description: 'Extracts npm package metadata.',
    author: 'DevDeck Team',
    icon_url: 'npm.svg',
    url_pattern: '^https://www\\.npmjs\\.com/package/([^/]+)',
    endpoint_url: 'https://plugins.example.dev/npm',
  },
  {
    id: 'slack-webhook',
    type: 'webhook',
    name: 'Slack Bridge',
    description: 'Notifies a Slack channel on capture.',
    author: 'DevDeck Team',
    icon_url: 'slack.png',
    events: ['item.created'],
  },
]

describe('<IntegrationsList>', () => {
  beforeEach(() => {
    mocks.useFeaturedPlugins.mockReturnValue({ data: { plugins: featured }, isLoading: false })
    mocks.useCustomEnrichers.mockReturnValue({ data: { enrichers: [] } })
    mocks.useWebhooks.mockReturnValue({ data: { webhooks: [] } })
    mocks.useCreateCustomEnricher.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mocks.useCreateWebhook.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  })

  it('renders one compact row per integration with install actions', () => {
    render(<IntegrationsList />)

    expect(screen.getByText('NPM Registry')).toBeInTheDocument()
    expect(screen.getByText('Slack Bridge')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /install/i })).toHaveLength(2)
  })

  it('marks already-configured integrations as installed', () => {
    mocks.useCustomEnrichers.mockReturnValue({
      data: { enrichers: [{ url_pattern: '^https://www\\.npmjs\\.com/package/([^/]+)' }] },
    })

    render(<IntegrationsList />)

    expect(screen.getByRole('button', { name: /installed/i })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /install/i })).toHaveLength(2)
  })
})
