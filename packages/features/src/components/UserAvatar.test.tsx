import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getAvatarImageCandidates, UserAvatar } from './UserAvatar'

describe('getAvatarImageCandidates', () => {
  it('adds the API upload host for web origins', () => {
    expect(
      getAvatarImageCandidates('/uploads/avatars/me.png', 'https://dev-deck.creapolis.dev'),
    ).toEqual([
      '/uploads/avatars/me.png',
      'https://api.dev-deck.creapolis.dev/uploads/avatars/me.png',
    ])
  })

  it('keeps localhost upload URLs local', () => {
    expect(
      getAvatarImageCandidates('/uploads/avatars/me.png', 'http://localhost:5173'),
    ).toEqual(['/uploads/avatars/me.png'])
  })

  it('does not rewrite non-upload URLs', () => {
    expect(
      getAvatarImageCandidates('https://cdn.example.com/avatar.png', 'https://dev-deck.creapolis.dev'),
    ).toEqual(['https://cdn.example.com/avatar.png'])
  })
})

describe('<UserAvatar>', () => {
  it('shows an accessible fallback when the avatar image fails to load', () => {
    const { container } = render(
      <UserAvatar src="https://cdn.example.com/missing.png" alt="Ada Lovelace" />,
    )

    fireEvent.error(screen.getByAltText('Ada Lovelace'))

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeInTheDocument()
  })
})
