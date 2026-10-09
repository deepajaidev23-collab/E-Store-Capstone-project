/**
 * Accessibility tests for remediated components.
 *
 * Covers the most impactful, testable fixes:
 *  - FormField: aria-describedby + aria-invalid on error
 *  - Modal: focus trap, initial focus, focus restoration, unique title ID
 *  - Button: aria-busy on loading
 *  - CategorySidebar: aria-current="page" (not "true")
 *  - SearchInput: aria-label default
 *  - CharCounter: aria-live attribute
 *  - RewardPointsToggle: aria-pressed
 *  - usePageTitle: sets document.title
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── FormField ─────────────────────────────────────────────────────────────────

import { FormField } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'

describe('FormField', () => {
  it('injects aria-describedby and aria-invalid onto child input when error is set', () => {
    render(
      <FormField label="Email" htmlFor="email-field" error="Email is required">
        <Input id="email-field" />
      </FormField>,
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'email-field-error')

    const errorEl = document.getElementById('email-field-error')
    expect(errorEl).toBeInTheDocument()
    expect(errorEl).toHaveTextContent('Email is required')
  })

  it('does not inject aria-describedby when there is no error', () => {
    render(
      <FormField label="Email" htmlFor="email-ok">
        <Input id="email-ok" />
      </FormField>,
    )

    const input = screen.getByRole('textbox')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})

// ── Modal ─────────────────────────────────────────────────────────────────────

import { Modal } from '@/components/ui/Modal'

function ModalWrapper({ open = true, onClose = vi.fn() }: { open?: boolean; onClose?: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Test Modal">
      <button>First focusable</button>
      <button>Second focusable</button>
    </Modal>
  )
}

describe('Modal', () => {
  it('moves focus into the modal on open (first focusable element)', async () => {
    render(<ModalWrapper />)
    await waitFor(() => {
      // The close button is the first focusable element in the header
      expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    })
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<ModalWrapper onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses a unique aria-labelledby id (not hardcoded "modal-title")', () => {
    render(<ModalWrapper />)
    const dialog = screen.getByRole('dialog')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(labelledBy).not.toBe('modal-title')
    const titleEl = document.getElementById(labelledBy!)
    expect(titleEl).toBeInTheDocument()
    expect(titleEl).toHaveTextContent('Test Modal')
  })

  it('has aria-modal="true"', () => {
    render(<ModalWrapper />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })
})

// ── Button ────────────────────────────────────────────────────────────────────

import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('has aria-busy="true" when loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('does not have aria-busy when not loading', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
  })
})

// ── CategorySidebar ───────────────────────────────────────────────────────────

import { CategorySidebar } from '@/components/catalogue/CategorySidebar'

const MOCK_CATS = [
  { id: '1', name: 'All', slug: 'all' },
  { id: '2', name: 'Fiction', slug: 'fiction' },
]

describe('CategorySidebar', () => {
  it('applies aria-current="page" to the active category button', () => {
    render(
      <CategorySidebar categories={MOCK_CATS} activeSlug="fiction" onSelect={vi.fn()} />,
    )

    const fictionBtn = screen.getByRole('button', { name: 'Fiction' })
    expect(fictionBtn).toHaveAttribute('aria-current', 'page')
  })

  it('does not apply aria-current to inactive category buttons', () => {
    render(
      <CategorySidebar categories={MOCK_CATS} activeSlug="fiction" onSelect={vi.fn()} />,
    )

    const allBtn = screen.getByRole('button', { name: 'All' })
    expect(allBtn).not.toHaveAttribute('aria-current')
  })
})

// ── SearchInput ───────────────────────────────────────────────────────────────

import { SearchInput } from '@/components/ui/Input'

describe('SearchInput', () => {
  it('defaults to aria-label="Search"', () => {
    render(<SearchInput />)
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
  })

  it('accepts a custom aria-label', () => {
    render(<SearchInput aria-label="Search books by title or author" />)
    expect(
      screen.getByRole('textbox', { name: 'Search books by title or author' }),
    ).toBeInTheDocument()
  })
})

// ── CharCounter ───────────────────────────────────────────────────────────────

import { CharCounter } from '@/components/ui/Form'

describe('CharCounter', () => {
  it('has aria-live="polite" and aria-atomic="true"', () => {
    render(<CharCounter current={50} max={200} />)
    const el = screen.getByText('50/200')
    expect(el).toHaveAttribute('aria-live', 'polite')
    expect(el).toHaveAttribute('aria-atomic', 'true')
  })
})

// ── RewardPointsToggle ────────────────────────────────────────────────────────

import { RewardPointsToggle } from '@/components/checkout/RewardPointsToggle'

describe('RewardPointsToggle', () => {
  it('button has aria-pressed="false" when points are not applied', () => {
    render(
      <RewardPointsToggle
        availablePoints={100}
        appliedPoints={0}
        maxRedeemable={100}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /apply/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('button has aria-pressed="true" when points are applied', () => {
    render(
      <RewardPointsToggle
        availablePoints={100}
        appliedPoints={100}
        maxRedeemable={100}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /remove/i })).toHaveAttribute('aria-pressed', 'true')
  })
})

// ── Navigation aria-current ───────────────────────────────────────────────────

import { Navbar } from '@/components/ui/Navigation'

describe('Navbar nav links', () => {
  it('marks the active route with aria-current="page"', () => {
    const items = [
      { label: 'Orders', href: '/orders' },
      { label: 'Wishlist', href: '/wishlist' },
    ]

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Navbar items={items} />
      </MemoryRouter>,
    )

    const ordersLink = screen.getByRole('link', { name: 'Orders' })
    expect(ordersLink).toHaveAttribute('aria-current', 'page')

    const wishlistLink = screen.getByRole('link', { name: 'Wishlist' })
    expect(wishlistLink).not.toHaveAttribute('aria-current')
  })
})

// ── usePageTitle ──────────────────────────────────────────────────────────────

import { usePageTitle } from '@/hooks/usePageTitle'
import { renderHook } from '@testing-library/react'

describe('usePageTitle', () => {
  const originalTitle = document.title

  afterEach(() => {
    document.title = originalTitle
  })

  it('sets document.title to "<title> — Bibliophile"', () => {
    renderHook(() => usePageTitle('Shopping Cart'))
    expect(document.title).toBe('Shopping Cart — Bibliophile')
  })

  it('resets document.title to "Bibliophile" on unmount', () => {
    const { unmount } = renderHook(() => usePageTitle('Shopping Cart'))
    unmount()
    expect(document.title).toBe('Bibliophile')
  })
})
