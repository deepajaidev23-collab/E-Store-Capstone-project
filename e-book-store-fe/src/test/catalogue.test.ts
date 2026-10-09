/**
 * Tests for MockBookRepository filtering and sorting logic.
 *
 * These tests exercise the pure data-layer functions that the UI depends on.
 * They run entirely in-memory and never touch the DOM, so they are fast and
 * deterministic.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { MockBookRepository } from '@/repositories/mock/MockBookRepository'
import { BOOKS } from '@/repositories/mock/mockData'

let repo: MockBookRepository

beforeEach(() => {
  repo = new MockBookRepository()
})

describe('MockBookRepository.getBooks — search', () => {
  it('returns all books when no filters are supplied', async () => {
    const { books, total } = await repo.getBooks({})
    expect(books).toHaveLength(BOOKS.length)
    expect(total).toBe(BOOKS.length)
  })

  it('filters by title substring (case-insensitive)', async () => {
    const { books } = await repo.getBooks({ search: 'minimalism' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => {
      expect(b.title.toLowerCase()).toContain('minimalism')
    })
  })

  it('filters by author name (case-insensitive)', async () => {
    const { books } = await repo.getBooks({ search: 'arjun' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => {
      expect(b.author_name.toLowerCase()).toContain('arjun')
    })
  })

  it('returns empty list when no book matches the search term', async () => {
    const { books, total } = await repo.getBooks({ search: 'zzzznotabookatall' })
    expect(books).toHaveLength(0)
    expect(total).toBe(0)
  })
})

describe('MockBookRepository.getBooks — category', () => {
  it('returns all books for slug "all"', async () => {
    const { books } = await repo.getBooks({ categorySlug: 'all' })
    expect(books).toHaveLength(BOOKS.length)
  })

  it('filters books by category slug', async () => {
    const { books } = await repo.getBooks({ categorySlug: 'self-help' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => {
      const slugs = (b.categories ?? []).map((c) => c.slug)
      expect(slugs).toContain('self-help')
    })
  })

  it('returns empty when no books belong to the given category', async () => {
    const { books } = await repo.getBooks({ categorySlug: 'nonexistent-category' })
    expect(books).toHaveLength(0)
  })
})

describe('MockBookRepository.getBooks — language', () => {
  it('filters to English books only', async () => {
    const { books } = await repo.getBooks({ language: 'en' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => expect(b.language).toBe('en'))
  })

  it('filters to Hindi books only', async () => {
    const { books } = await repo.getBooks({ language: 'hi' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => expect(b.language).toBe('hi'))
  })
})

describe('MockBookRepository.getBooks — format', () => {
  it('filters to ebook format', async () => {
    const { books } = await repo.getBooks({ format: 'ebook' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => expect(b.format).toBe('ebook'))
  })

  it('filters to paperback format', async () => {
    const { books } = await repo.getBooks({ format: 'paperback' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => expect(b.format).toBe('paperback'))
  })
})

describe('MockBookRepository.getBooks — price range', () => {
  it('returns only books within the given price range', async () => {
    const { books } = await repo.getBooks({ priceRange: [100, 300] })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => {
      expect(b.price).toBeGreaterThanOrEqual(100)
      expect(b.price).toBeLessThanOrEqual(300)
    })
  })

  it('excludes books outside the range', async () => {
    // Only very cheap books
    const { books } = await repo.getBooks({ priceRange: [0, 150] })
    books.forEach((b) => expect(b.price).toBeLessThanOrEqual(150))
  })
})

describe('MockBookRepository.getBooks — publisher', () => {
  it('filters by publisher id', async () => {
    const { books } = await repo.getBooks({ publisherId: 'pub-1' })
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => expect(b.publisher_id).toBe('pub-1'))
  })

  it('returns empty for an unknown publisher id', async () => {
    const { books } = await repo.getBooks({ publisherId: 'pub-999' })
    expect(books).toHaveLength(0)
  })
})

describe('MockBookRepository.getBooks — combined filters', () => {
  it('can combine search and category', async () => {
    const { books } = await repo.getBooks({ search: 'a', categorySlug: 'self-help' })
    books.forEach((b) => {
      const slugs = (b.categories ?? []).map((c) => c.slug)
      expect(slugs).toContain('self-help')
    })
  })

  it('can combine format and price range', async () => {
    const { books } = await repo.getBooks({ format: 'paperback', priceRange: [0, 400] })
    books.forEach((b) => {
      expect(b.format).toBe('paperback')
      expect(b.price).toBeLessThanOrEqual(400)
    })
  })
})

describe('MockBookRepository.getBooks — sorting', () => {
  it('sorts price_asc: first price ≤ last price', async () => {
    const { books } = await repo.getBooks({ sort: 'price_asc' })
    for (let i = 1; i < books.length; i++) {
      expect(books[i].price).toBeGreaterThanOrEqual(books[i - 1].price)
    }
  })

  it('sorts price_desc: first price ≥ last price', async () => {
    const { books } = await repo.getBooks({ sort: 'price_desc' })
    for (let i = 1; i < books.length; i++) {
      expect(books[i].price).toBeLessThanOrEqual(books[i - 1].price)
    }
  })

  it('sorts by rating desc', async () => {
    const { books } = await repo.getBooks({ sort: 'rating' })
    for (let i = 1; i < books.length; i++) {
      expect(books[i].average_rating).toBeLessThanOrEqual(books[i - 1].average_rating)
    }
  })

  it('sorts newest: created_at descending', async () => {
    const { books } = await repo.getBooks({ sort: 'newest' })
    for (let i = 1; i < books.length; i++) {
      const prev = new Date(books[i - 1].created_at).getTime()
      const curr = new Date(books[i].created_at).getTime()
      expect(curr).toBeLessThanOrEqual(prev)
    }
  })
})

describe('MockBookRepository — curated lists', () => {
  it('getRecommendedBooks returns only the 3 editorial picks', async () => {
    const books = await repo.getRecommendedBooks()
    expect(books).toHaveLength(3)
  })

  it('getBestsellerBooks returns only is_bestseller=true entries', async () => {
    const books = await repo.getBestsellerBooks()
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => expect(b.is_bestseller).toBe(true))
  })

  it('getNewLaunchBooks returns only is_new_launch=true entries', async () => {
    const books = await repo.getNewLaunchBooks()
    expect(books.length).toBeGreaterThan(0)
    books.forEach((b) => expect(b.is_new_launch).toBe(true))
  })

  it('getCategories returns at least the expected category count', async () => {
    const cats = await repo.getCategories()
    expect(cats.length).toBeGreaterThanOrEqual(10)
    expect(cats.some((c) => c.slug === 'all')).toBe(true)
  })

  it('getPublishers returns all seeded publishers', async () => {
    const pubs = await repo.getPublishers()
    expect(pubs.length).toBe(5)
  })
})
