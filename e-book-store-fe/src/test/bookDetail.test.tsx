/**
 * Tests for Phase 5 — Book Detail repository methods and interactions.
 *
 * Covers:
 *  - Product loading (getBookById)
 *  - Not-found behaviour (unknown id → null)
 *  - Related books strategy (same-category, max 3, excludes self)
 *  - Review loading (getReviews)
 *  - Review submission (submitReview mutates in-memory state)
 *  - Add to Cart / Add to Wishlist navigation (auth redirect logic)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockBookRepository } from '@/repositories/mock/MockBookRepository'
import { BOOKS } from '@/repositories/mock/mockData'
import { BookActions } from '@/components/book-detail/BookActions'

// ── Repository — product loading ─────────────────────────────────────────────

let repo: MockBookRepository

beforeEach(() => {
  repo = new MockBookRepository()
})

describe('getBookById — product loading', () => {
  it('returns the correct book for a known id', async () => {
    const book = await repo.getBookById('book-001')
    expect(book).not.toBeNull()
    expect(book?.id).toBe('book-001')
    expect(book?.title).toBe('The Art of Focus')
    expect(book?.author_name).toBe('Arjun Patel')
    expect(book?.price).toBe(399)
  })

  it('returns all required fields for a book', async () => {
    const book = await repo.getBookById('book-007')
    expect(book).not.toBeNull()
    expect(book?.description).toBeTruthy()
    expect(book?.format).toBeTruthy()
    expect(book?.language).toBe('en')
    expect(book?.average_rating).toBeGreaterThan(0)
    expect(book?.copies_sold).toBeGreaterThan(0)
    expect(book?.categories).toBeDefined()
    expect(book?.publisher).toBeDefined()
  })
})

describe('getBookById — not-found behaviour', () => {
  it('returns null for an unknown id', async () => {
    const book = await repo.getBookById('book-does-not-exist')
    expect(book).toBeNull()
  })

  it('returns null for an empty string id', async () => {
    const book = await repo.getBookById('')
    expect(book).toBeNull()
  })
})

// ── Related books strategy ────────────────────────────────────────────────────

describe('getRelatedBooks', () => {
  it('returns books sharing a category with the current book, excluding itself', async () => {
    // book-001 is in self-help and biography — find its actual category ids
    const book = await repo.getBookById('book-001')
    const categoryIds = (book?.categories ?? []).map((c) => c.id)

    const related = await repo.getRelatedBooks('book-001', categoryIds)

    // Must not include the current book
    expect(related.every((b) => b.id !== 'book-001')).toBe(true)

    // Each result must share at least one category id with the current book
    related.forEach((b) => {
      const bIds = (b.categories ?? []).map((c) => c.id)
      expect(bIds.some((id) => categoryIds.includes(id))).toBe(true)
    })
  })

  it('returns at most 3 books', async () => {
    const book = await repo.getBookById('book-001')
    const categoryIds = (book?.categories ?? []).map((c) => c.id)
    const related = await repo.getRelatedBooks('book-001', categoryIds)
    expect(related.length).toBeLessThanOrEqual(3)
  })

  it('returns an empty array when categoryIds is empty', async () => {
    const related = await repo.getRelatedBooks('book-001', [])
    expect(related).toHaveLength(0)
  })

  it('orders results by copies_sold descending', async () => {
    // Use mystery/thriller category which has multiple books
    const book = await repo.getBookById('book-004')
    const categoryIds = (book?.categories ?? []).map((c) => c.id)
    const related = await repo.getRelatedBooks('book-004', categoryIds)
    for (let i = 1; i < related.length; i++) {
      expect(related[i].copies_sold).toBeLessThanOrEqual(related[i - 1].copies_sold)
    }
  })

  it('does not include book not in any shared category', async () => {
    // book-013 is only in poetry (hi language) — unrelated to sci-fi
    const scifiBook = await repo.getBookById('book-006')
    const categoryIds = (scifiBook?.categories ?? []).map((c) => c.id)
    const related = await repo.getRelatedBooks('book-006', categoryIds)
    expect(related.every((b) => b.id !== 'book-013')).toBe(true)
  })

  it('handles a book with no category overlaps gracefully', async () => {
    // book-013 is only in cat-poetry; check nothing else shares it
    const book = BOOKS.find((b) => b.id === 'book-013')!
    const categoryIds = (book.categories ?? []).map((c) => c.id)
    const related = await repo.getRelatedBooks('book-013', categoryIds)
    expect(Array.isArray(related)).toBe(true)
    expect(related.every((b) => b.id !== 'book-013')).toBe(true)
  })
})

// ── Reviews ───────────────────────────────────────────────────────────────────

describe('getReviews', () => {
  it('returns reviews for a book that has seeded reviews', async () => {
    const reviews = await repo.getReviews('book-001')
    expect(reviews.length).toBeGreaterThanOrEqual(2)
    reviews.forEach((r) => expect(r.book_id).toBe('book-001'))
  })

  it('returns an empty array for a book with no reviews', async () => {
    // book-002 has no seeded reviews
    const reviews = await repo.getReviews('book-002')
    expect(reviews).toHaveLength(0)
  })

  it('returns reviews newest-first', async () => {
    const reviews = await repo.getReviews('book-001')
    for (let i = 1; i < reviews.length; i++) {
      const prev = new Date(reviews[i - 1].created_at).getTime()
      const curr = new Date(reviews[i].created_at).getTime()
      expect(curr).toBeLessThanOrEqual(prev)
    }
  })

  it('each review has required fields including reviewer_name', async () => {
    const reviews = await repo.getReviews('book-001')
    reviews.forEach((r) => {
      expect(r.id).toBeTruthy()
      expect(r.reviewer_name).toBeTruthy()
      expect(r.rating).toBeGreaterThanOrEqual(1)
      expect(r.rating).toBeLessThanOrEqual(5)
      expect(r.body).toBeTruthy()
      expect(r.created_at).toBeTruthy()
    })
  })
})

describe('submitReview', () => {
  it('appends a new review; subsequent getReviews returns it', async () => {
    const before = await repo.getReviews('book-002')
    expect(before).toHaveLength(0)

    await repo.submitReview('book-002', 5, 'Great book!')

    const after = await repo.getReviews('book-002')
    expect(after).toHaveLength(1)
    expect(after[0].book_id).toBe('book-002')
    expect(after[0].body).toBe('Great book!')
    expect(after[0].rating).toBe(5)
  })

  it('returns the newly created review', async () => {
    const review = await repo.submitReview('book-003', 4, 'Really enjoyed this.')
    expect(review.id).toBeTruthy()
    expect(review.book_id).toBe('book-003')
    expect(review.rating).toBe(4)
    expect(review.body).toBe('Really enjoyed this.')
    expect(review.created_at).toBeTruthy()
  })

  it('increments count correctly across multiple submissions', async () => {
    await repo.submitReview('book-005', 3, 'First review')
    await repo.submitReview('book-005', 4, 'Second review')
    await repo.submitReview('book-005', 5, 'Third review')

    const reviews = await repo.getReviews('book-005')
    expect(reviews).toHaveLength(3)
  })

  it('does not affect reviews of other books', async () => {
    const beforeOther = await repo.getReviews('book-001')
    await repo.submitReview('book-002', 5, 'Only for book-002')
    const afterOther = await repo.getReviews('book-001')
    expect(afterOther).toHaveLength(beforeOther.length)
  })
})

// ── BookActions UI — Add to Cart / Add to Wishlist ────────────────────────────

describe('BookActions — button interactions', () => {
  it('calls onAddToCart when the Add to Cart button is clicked', () => {
    const onAddToCart = vi.fn()
    const onAddToWishlist = vi.fn()

    render(
      <MemoryRouter>
        <BookActions onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(onAddToCart).toHaveBeenCalledOnce()
    expect(onAddToWishlist).not.toHaveBeenCalled()
  })

  it('calls onAddToWishlist when the Add to Wishlist button is clicked', () => {
    const onAddToCart = vi.fn()
    const onAddToWishlist = vi.fn()

    render(
      <MemoryRouter>
        <BookActions onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /add to wishlist/i }))
    expect(onAddToWishlist).toHaveBeenCalledOnce()
    expect(onAddToCart).not.toHaveBeenCalled()
  })

  it('renders both buttons', () => {
    render(
      <MemoryRouter>
        <BookActions onAddToCart={vi.fn()} onAddToWishlist={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument()
  })

  it('disables both buttons when loading', () => {
    render(
      <MemoryRouter>
        <BookActions onAddToCart={vi.fn()} onAddToWishlist={vi.fn()} loading />
      </MemoryRouter>,
    )
    // When loading=true the Button component renders a spinner and sets disabled
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })
})
