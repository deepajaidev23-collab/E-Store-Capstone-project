import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test crash inside component')
  }
  return <div>Rendered successfully</div>
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Rendered successfully')).toBeInTheDocument()
  })

  it('renders default fallback UI when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    spy.mockRestore()
  })

  it('renders custom function fallback and allows recovery', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function TestContainer() {
      const [shouldThrow, setShouldThrow] = React.useState(true)
      return (
        <ErrorBoundary
          fallback={(err, reset) => (
            <div>
              <p>Custom Error: {err.message}</p>
              <button
                onClick={() => {
                  setShouldThrow(false)
                  reset()
                }}
              >
                Reset
              </button>
            </div>
          )}
        >
          <ProblemChild shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )
    }

    render(<TestContainer />)

    expect(screen.getByText('Custom Error: Test crash inside component')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Reset'))

    expect(screen.getByText('Rendered successfully')).toBeInTheDocument()
    spy.mockRestore()
  })
})
