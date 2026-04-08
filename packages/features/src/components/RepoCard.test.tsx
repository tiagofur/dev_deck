import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoCard } from './RepoCard'
import type { Repo } from '@devdeck/api-client'

const baseRepo: Repo = {
  id: 'a1b2c3',
  url: 'https://github.com/charmbracelet/bubbletea',
  source: 'github',
  owner: 'charmbracelet',
  name: 'bubbletea',
  description: 'A powerful TUI framework',
  language: 'Go',
  language_color: '#00ADD8',
  stars: 28400,
  forks: 800,
  avatar_url: null,
  og_image_url: null,
  homepage: null,
  topics: [],
  notes: '',
  tags: ['tui', 'go'],
  archived: false,
  added_at: '2026-01-01T00:00:00Z',
  last_fetched_at: null,
  last_seen_at: null,
}

describe('<RepoCard>', () => {
  it('renders owner/name as the title', () => {
    render(<RepoCard repo={baseRepo} />)
    expect(screen.getByRole('heading')).toHaveTextContent('charmbracelet/bubbletea')
  })

  it('falls back to the name when there is no owner', () => {
    render(<RepoCard repo={{ ...baseRepo, owner: null, name: 'standalone' }} />)
    expect(screen.getByRole('heading')).toHaveTextContent('standalone')
  })

  it('renders the description', () => {
    render(<RepoCard repo={baseRepo} />)
    expect(screen.getByText('A powerful TUI framework')).toBeInTheDocument()
  })

  it('formats stars and forks via formatCount', () => {
    render(<RepoCard repo={baseRepo} />)
    // 28400 → 28.4k, 800 stays as-is.
    expect(screen.getByText('28.4k')).toBeInTheDocument()
    expect(screen.getByText('800')).toBeInTheDocument()
  })

  it('renders all tags', () => {
    render(<RepoCard repo={baseRepo} />)
    expect(screen.getByText('tui')).toBeInTheDocument()
    expect(screen.getByText('go')).toBeInTheDocument()
  })

  it('renders an avatar fallback initial when no avatar URL', () => {
    render(<RepoCard repo={baseRepo} />)
    // First letter of name uppercased.
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<RepoCard repo={baseRepo} onClick={onClick} />)
    await user.click(screen.getByRole('heading'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('hides star/fork counters when both are zero', () => {
    render(<RepoCard repo={{ ...baseRepo, stars: 0, forks: 0 }} />)
    expect(screen.queryByText('28.4k')).not.toBeInTheDocument()
    expect(screen.queryByText('800')).not.toBeInTheDocument()
  })
})
