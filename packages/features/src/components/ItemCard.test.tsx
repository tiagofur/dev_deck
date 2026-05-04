import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemCard } from './ItemCard'
import type { Item } from '@devdeck/api-client'

// Fixture factory. Anything not overridden picks a safe default so
// tests spell out only the fields they're asserting on.
function makeItem(patch: Partial<Item> = {}): Item {
  return {
    id: 'a1b2c3-id',
    item_type: 'repo',
    title: 'charmbracelet/bubbletea',
    url: 'https://github.com/charmbracelet/bubbletea',
    url_normalized: 'https://github.com/charmbracelet/bubbletea',
    description: 'A powerful TUI framework',
    notes: '',
    tags: ['tui', 'go'],
    why_saved: '',
    when_to_use: '',
    source_channel: 'manual',
    meta: { stars: 28400, language: 'Go', language_color: '#00ADD8' },
    ai_summary: '',
    ai_tags: [],
    enrichment_status: 'ok',
    archived: false,
    is_favorite: false,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
    last_seen_at: null,
    ...patch,
  }
}

describe('<ItemCard>', () => {
  it('renders title and description', () => {
    render(<ItemCard item={makeItem()} />)
    expect(screen.getByRole('heading')).toHaveTextContent('charmbracelet/bubbletea')
    expect(screen.getByText('A powerful TUI framework')).toBeInTheDocument()
  })

  it('prefers ai_summary over description when present', () => {
    render(
      <ItemCard
        item={makeItem({
          description: 'Raw upstream description',
          ai_summary: 'Human-friendly summary from local AI',
        })}
      />,
    )
    expect(screen.getByText('Human-friendly summary from local AI')).toBeInTheDocument()
    expect(screen.queryByText('Raw upstream description')).not.toBeInTheDocument()
  })

  it('renders the type ribbon for repos', () => {
    render(<ItemCard item={makeItem({ item_type: 'repo' })} />)
    expect(screen.getByText('REPO')).toBeInTheDocument()
  })

  it('renders a different ribbon for non-repo types', () => {
    render(
      <ItemCard
        item={makeItem({ item_type: 'cli', title: 'ripgrep', url: null, meta: {} })}
      />,
    )
    expect(screen.getByText('CLI')).toBeInTheDocument()
  })

  it('shows stars + language for repo items', () => {
    render(<ItemCard item={makeItem()} />)
    expect(screen.getByText(/28\.4k/)).toBeInTheDocument()
    expect(screen.getByText('Go')).toBeInTheDocument()
  })

  it('hides the stars row for non-repo items', () => {
    render(
      <ItemCard
        item={makeItem({
          item_type: 'article',
          title: 'How to write a TUI',
          url: 'https://dev.to/foo/tui-post',
          meta: {},
        })}
      />,
    )
    expect(screen.queryByText(/★/)).not.toBeInTheDocument()
  })

  it('renders why_saved as an inline blockquote when present', () => {
    render(
      <ItemCard
        item={makeItem({
          why_saved: 'para grep cuando estoy en codebases gigantes',
        })}
      />,
    )
    expect(
      screen.getByText(/para grep cuando estoy en codebases gigantes/),
    ).toBeInTheDocument()
  })

  it('renders all tags', () => {
    render(<ItemCard item={makeItem({ tags: ['alpha', 'beta', 'gamma'] })} />)
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.getByText('gamma')).toBeInTheDocument()
  })

  it('falls back to ai_tags when manual tags are empty', () => {
    render(<ItemCard item={makeItem({ tags: [], ai_tags: ['suggested', 'go'] })} />)
    expect(screen.getByText('suggested')).toBeInTheDocument()
    expect(screen.getByText('go')).toBeInTheDocument()
  })

  it('shows queued analysis status', () => {
    render(<ItemCard item={makeItem({ enrichment_status: 'queued' })} />)
    expect(screen.getByText(/analizando/i)).toBeInTheDocument()
  })

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ItemCard item={makeItem()} onClick={onClick} />)
    await user.click(screen.getByRole('heading'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('falls back to a placeholder title when empty', () => {
    render(<ItemCard item={makeItem({ title: '' })} />)
    expect(screen.getByText('(sin título)')).toBeInTheDocument()
  })

  it('renders a pretty URL (stripped scheme + www + trailing slash)', () => {
    render(
      <ItemCard
        item={makeItem({
          url: 'https://www.ripgrep.dev/docs/',
          item_type: 'tool',
          meta: {},
        })}
      />,
    )
    expect(screen.getByText('ripgrep.dev/docs')).toBeInTheDocument()
  })
})
