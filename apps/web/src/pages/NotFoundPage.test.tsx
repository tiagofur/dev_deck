import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from './NotFoundPage'

describe('<NotFoundPage>', () => {
  it('renders the 404 heading and a link back home', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
    const homeLink = screen.getByRole('link')
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
