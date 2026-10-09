import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from '@/pages/NotFoundPage'

describe('NotFoundPage', () => {
  it('renders a 404 heading', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('has a button to go to homepage', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: /go to homepage/i })
    expect(button).toBeInTheDocument()
  })
})
