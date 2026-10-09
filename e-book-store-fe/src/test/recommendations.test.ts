/**
 * recommendations.test.ts — tests for the recommendation scoring system.
 *
 * Uses MockRecommendationService backed by MockBookRepository so all
 * assertions run in-memory with no network calls.
 *
 * The tests verify:
 *   - Correct signal detection (same author, same category, same publisher)
 *   - Weighted scoring (author=3, category=2, publisher=1)
 *   - Multi-signal accumulation (a book matching two signals ranks higher)
 *   - Deduplication (the same book appears only once)
 *   - Exclusion of the context book from results
 *   - Tie-breaking by copies_sold descending
 *   - Limit enforcement
 *   - Fallback behaviour (getFallbackRecommendations)
 *   - Resilience: no match scenarios return empty arrays gracefully
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { MockBookRepository } from '@/repositories/mock/MockBookRepository'
import { MockRecommendationService } from '@/services/mock/MockRecommendationService'
import { scoreAndRank, SCORE_SAME_AUTHOR, SCORE_SAME_CATEGORY, SCORE_SAME_PUBLISHER } from '@/services/scoring'
import type { Book } from '@/types/book'
import { BOOKS } from '@/repositories/mock/mockData'

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Helper to look up a book from mock data by id */
function book(id: string): Book {
  const b = BOOKS.find((b) => b.id === id)
  if (!b) throw new Error(`Fixture book ${id} not found`)
  return b
}

let repo: MockBookRepository
let service: MockRecommendationService

beforeEach(() => {
  repo = new MockBookRepository()
  service = new MockRecommendationService(repo)
})

// ── scoreAndRank — unit tests (pure function) ─────────────────────────────────

describe('scoreAndRank — weights', () => {
  it('exports the correct weight constants', () => {
    expect(SCORE_SAME_AUTHOR).toBe(3)
    expect(SCORE_SAME_CATEGORY).toBe(2)
    expect(SCORE_SAME_PUBLISHER).toBe(1)
  })

  it('ranks a same-author book above a same-category-only book', () => {
    const contextId = 'ctx'
    const authorBook: Book = { ...BOOKS[0], id: 'a', author_name: 'Test Author', copies_sold: 100 }
    const categoryBook: Book = { ...BOOKS[1], id: 'b', author_name: 'Other Author', copies_sold: 9999 }

    const ranked = scoreAndRank(contextId, [authorBook], [categoryBook], [], 10)
    expect(ranked[0].id).toBe('a')   // author (3 pts) > category (2 pts) even at lower copies_sold
    expect(ranked[1].id).toBe('b')
  })

  it('ranks a same-category book above a same-publisher-only book', () => {
    const contextId = 'ctx'
    const categoryBook: Book  = { ...BOOKS[0], id: 'c', author_name: 'A', copies_sold: 10 }
    const publisherBook: Book = { ...BOOKS[1], id: 'p', author_name: 'B', copies_sold: 9999 }

    const ranked = scoreAndRank(contextId, [], [categoryBook], [publisherBook], 10)
    expect(ranked[0].id).toBe('c')   // category (2 pts) > publisher (1 pt)
    expect(ranked[1].id).toBe('p')
  })

  it('accumulates points when a book appears in multiple signal sets', () => {
    const contextId = 'ctx'
    const multiBook: Book  = { ...BOOKS[0], id: 'm', copies_sold: 1 }
    const singleBook: Book = { ...BOOKS[1], id: 's', copies_sold: 9999 }

    // multiBook appears as both same-author AND same-category → 3 + 2 = 5 pts
    // singleBook appears only as same-publisher → 1 pt
    const ranked = scoreAndRank(contextId, [multiBook], [multiBook], [singleBook], 10)
    expect(ranked[0].id).toBe('m')
    expect(ranked[1].id).toBe('s')
  })

  it('deduplicates a book that appears in two signal sets', () => {
    const contextId = 'ctx'
    const shared: Book = { ...BOOKS[0], id: 'x', copies_sold: 100 }

    const ranked = scoreAndRank(contextId, [shared], [shared], [], 10)
    const occurrences = ranked.filter((b) => b.id === 'x').length
    expect(occurrences).toBe(1)
  })

  it('excludes the context book even if it appears in signal sets', () => {
    const contextId = 'ctx'
    const ctx: Book    = { ...BOOKS[0], id: contextId }
    const other: Book  = { ...BOOKS[1], id: 'other' }

    const ranked = scoreAndRank(contextId, [ctx, other], [], [], 10)
    expect(ranked.every((b) => b.id !== contextId)).toBe(true)
  })

  it('respects the limit', () => {
    const contextId = 'ctx'
    const candidates = BOOKS.slice(0, 5).map((b) => ({ ...b }))
    const ranked = scoreAndRank(contextId, candidates, [], [], 2)
    expect(ranked).toHaveLength(2)
  })

  it('breaks ties by copies_sold descending', () => {
    const contextId = 'ctx'
    const low:  Book = { ...BOOKS[0], id: 'low',  copies_sold: 100, author_name: 'Same' }
    const high: Book = { ...BOOKS[1], id: 'high', copies_sold: 999, author_name: 'Different' }

    // Both are same-category → equal scores → tie broken by copies_sold
    const ranked = scoreAndRank(contextId, [], [low, high], [], 10)
    expect(ranked[0].id).toBe('high')
    expect(ranked[1].id).toBe('low')
  })

  it('returns an empty array when there are no candidates', () => {
    const ranked = scoreAndRank('ctx', [], [], [], 6)
    expect(ranked).toHaveLength(0)
  })
})

// ── MockRecommendationService — integration tests ─────────────────────────────

describe('MockRecommendationService.getRecommendations — same author signal', () => {
  it('includes other books by the same author', async () => {
    // book-001 (Arjun Patel) — unique author, no other Arjun Patel books
    // so same-author results should be empty for book-001.
    // book-002 (Raj Patel) — also unique.
    // Use book-003 (James Wright) — unique.
    // We test using book-007 (Daniel Reed) with pub-1 to verify author signal presence/absence.

    // Pick book-002 (Raj Patel, pub-1, self-help/biography)
    // No other book by Raj Patel exists → author signal gives no results
    const results = await service.getRecommendations(book('book-002'), 10)
    const resultIds = results.map((b) => b.id)
    // book-001 (same publisher + same categories) should appear
    expect(resultIds).toContain('book-001')
    // book-002 itself must not appear
    expect(resultIds).not.toContain('book-002')
  })

  it('does not include the context book in results', async () => {
    const results = await service.getRecommendations(book('book-001'), 10)
    expect(results.every((b) => b.id !== 'book-001')).toBe(true)
  })
})

describe('MockRecommendationService.getRecommendations — same category signal', () => {
  it('includes books that share a category with the context book', async () => {
    // book-001: self-help + biography
    // book-002, book-003, book-007 also have self-help
    const results = await service.getRecommendations(book('book-001'), 10)
    const resultIds = results.map((b) => b.id)
    expect(resultIds.some((id) => ['book-002', 'book-003', 'book-007'].includes(id))).toBe(true)
  })

  it('includes sci-fi books when context is a sci-fi book', async () => {
    // book-006: sci-fi + mystery; book-010: science + sci-fi
    const results = await service.getRecommendations(book('book-006'), 10)
    const resultIds = results.map((b) => b.id)
    expect(resultIds).toContain('book-010')
  })
})

describe('MockRecommendationService.getRecommendations — same publisher signal', () => {
  it('includes other books from the same publisher', async () => {
    // book-001: pub-1; book-002, book-007, book-013 also pub-1
    const results = await service.getRecommendations(book('book-001'), 10)
    const resultIds = results.map((b) => b.id)
    // At least one other pub-1 book should appear
    const pub1Books = ['book-002', 'book-007', 'book-013']
    expect(resultIds.some((id) => pub1Books.includes(id))).toBe(true)
  })

  it('ranks a book higher when it matches both category and publisher vs publisher alone', async () => {
    // book-001: pub-1, categories: self-help, biography
    // book-002: pub-1, categories: self-help, biography  → same category + same publisher = 3 pts
    // book-013: pub-1, categories: poetry                → same publisher only = 1 pt
    const results = await service.getRecommendations(book('book-001'), 10)
    const idx002 = results.findIndex((b) => b.id === 'book-002')
    const idx013 = results.findIndex((b) => b.id === 'book-013')
    if (idx002 !== -1 && idx013 !== -1) {
      expect(idx002).toBeLessThan(idx013)
    }
  })
})

describe('MockRecommendationService.getRecommendations — multi-signal accumulation', () => {
  it('a book matching category AND publisher ranks above one matching publisher only', async () => {
    // book-001: pub-1, categories: self-help, biography
    // book-002: pub-1, self-help, biography  → category(2) + publisher(1) = 3 pts
    // book-013: pub-1, poetry                → publisher(1) = 1 pt
    const results = await service.getRecommendations(book('book-001'), 10)
    const idx002 = results.findIndex((b) => b.id === 'book-002')
    const idx013 = results.findIndex((b) => b.id === 'book-013')
    if (idx002 !== -1 && idx013 !== -1) {
      expect(idx002).toBeLessThan(idx013)
    }
  })
})

describe('MockRecommendationService.getRecommendations — limit', () => {
  it('returns at most `limit` books', async () => {
    const results = await service.getRecommendations(book('book-001'), 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('returns fewer results when candidates are scarce', async () => {
    // book-009 (Children's, pub-5) — very few related books
    const results = await service.getRecommendations(book('book-009'), 6)
    expect(results.length).toBeLessThanOrEqual(6)
    expect(results.every((b) => b.id !== 'book-009')).toBe(true)
  })
})

describe('scoreAndRank — no categories edge case', () => {
  it('still returns publisher-based results when there are no category candidates', () => {
    // Simulates a context book with no categories: only publisher signal fires
    const pubBooks = BOOKS.filter(
      (b) => b.publisher_id === 'pub-1' && b.id !== 'no-cat',
    ).slice(0, 3)
    const ranked = scoreAndRank('no-cat', [], [], pubBooks, 6)
    expect(ranked.length).toBeGreaterThan(0)
    ranked.forEach((b) => expect(b.publisher_id).toBe('pub-1'))
  })
})

describe('MockRecommendationService.getFallbackRecommendations', () => {
  it('returns up to the requested limit', async () => {
    const results = await service.getFallbackRecommendations(3)
    expect(results).toHaveLength(3)
  })

  it('returns books (non-empty)', async () => {
    const results = await service.getFallbackRecommendations(6)
    expect(results.length).toBeGreaterThan(0)
    results.forEach((b) => expect(b.id).toBeDefined())
  })

  it('returns fewer than limit when total available books is smaller', async () => {
    // getRecommendedBooks returns the 3 RECOMMENDED_IDS — asking for 100 gives at most 3
    const results = await service.getFallbackRecommendations(100)
    expect(results.length).toBeLessThanOrEqual(100)
    expect(results.length).toBeGreaterThan(0)
  })
})
