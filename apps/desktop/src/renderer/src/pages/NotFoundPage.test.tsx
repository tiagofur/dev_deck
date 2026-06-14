import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from './NotFoundPage'

describe('<NotFoundPage> (desktop)', () => {
  it('renders the 404 heading and a link back home', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/')
  })
})
