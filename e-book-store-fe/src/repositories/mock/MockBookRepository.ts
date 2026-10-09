/**
 * MockBookRepository — in-memory implementation of BookRepository.
 *
 * All filtering and sorting is pure in-process logic so tests can run without
 * a network.  Replace this with a SupabaseBookRepository later by providing a
 * different value through RepositoryContext — the UI code never changes.
 */
import type { BookRepository, BookFilters, BooksResult, SortField } from '@/repositories/BookRepository'
import type { Book, Category, Publisher } from '@/types/book'
import type { Review } from '@/types/review'
import { BOOKS, CATEGORIES, PUBLISHERS, RECOMMENDED_IDS, REVIEWS } from './mockData'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulated async latency — keeps the UX realistic while developing */
const delay = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms))

function matchesSearch(book: Book, search: string): boolean {
  const q = search.toLowerCase()
  return (
    book.title.toLowerCase().includes(q) ||
    book.author_name.toLowerCase().includes(q)
  )
}

function matchesCategory(book: Book, categorySlug: string): boolean {
  if (categorySlug === 'all') return true
  return (book.categories ?? []).some((c) => c.slug === categorySlug)
}

function sortBooks(books: Book[], sort: SortField): Book[] {
  const copy = [...books]
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.price - b.price)
    case 'price_desc':
      return copy.sort((a, b) => b.price - a.price)
    case 'rating':
      return copy.sort((a, b) => b.average_rating - a.average_rating)
    case 'newest':
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    case 'relevance':
    default:
      return copy
  }
}

// ── Implementation ────────────────────────────────────────────────────────────

export class MockBookRepository implements BookRepository {
  private books: Book[] = BOOKS
  private categories: Category[] = CATEGORIES
  private publishers: Publisher[] = PUBLISHERS
  // Mutable copy so submitReview can append without mutating the module-level constant
  private reviews: Review[] = [...REVIEWS]

  async getBooks(filters: BookFilters): Promise<BooksResult> {
    await delay()

    let result = [...this.books]

    if (filters.search) {
      result = result.filter((b) => matchesSearch(b, filters.search!))
    }

    if (filters.categorySlug && filters.categorySlug !== 'all') {
      result = result.filter((b) => matchesCategory(b, filters.categorySlug!))
    }

    if (filters.language) {
      result = result.filter((b) => b.language === filters.language)
    }

    if (filters.format) {
      result = result.filter((b) => b.format === filters.format)
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange
      result = result.filter((b) => b.price >= min && b.price <= max)
    }

    if (filters.publisherId) {
      result = result.filter((b) => b.publisher_id === filters.publisherId)
    }

    if (filters.sort) {
      result = sortBooks(result, filters.sort)
    }

    const total = result.length
    if (filters.page || filters.pageSize) {
      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 50
      const from = (page - 1) * pageSize
      result = result.slice(from, from + pageSize)
    }

    return { books: result, total }
  }

  async getBookById(id: string): Promise<Book | null> {
    await delay()
    return this.books.find((b) => b.id === id) ?? null
  }

  async getCategories(): Promise<Category[]> {
    await delay(60)
    return this.categories
  }

  async getPublishers(): Promise<Publisher[]> {
    await delay(60)
    return this.publishers
  }

  async getRecommendedBooks(): Promise<Book[]> {
    await delay()
    return RECOMMENDED_IDS.map((id) => this.books.find((b) => b.id === id)).filter(
      (b): b is Book => b !== undefined,
    )
  }

  async getBestsellerBooks(limit?: number): Promise<Book[]> {
    await delay()
    const list = this.books.filter((b) => b.is_bestseller)
    return limit && limit > 0 ? list.slice(0, limit) : list
  }

  async getNewLaunchBooks(limit?: number): Promise<Book[]> {
    await delay()
    const list = this.books.filter((b) => b.is_new_launch)
    return limit && limit > 0 ? list.slice(0, limit) : list
  }

  async getReviews(bookId: string): Promise<Review[]> {
    await delay()
    return [...this.reviews]
      .filter((r) => r.book_id === bookId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async submitReview(bookId: string, rating: number, body: string): Promise<Review> {
    await delay()
    const review: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      book_id: bookId,
      user_id: 'current-user',
      reviewer_name: 'You',
      rating,
      body,
      created_at: new Date().toISOString(),
    }
    this.reviews.push(review)
    return review
  }

  async getRelatedBooks(bookId: string, categoryIds: string[]): Promise<Book[]> {
    await delay()
    if (categoryIds.length === 0) return []
    return this.books
      .filter((b) => {
        if (b.id === bookId) return false
        const slugs = (b.categories ?? []).map((c) => c.id)
        return slugs.some((s) => categoryIds.includes(s))
      })
      .sort((a, b) => b.copies_sold - a.copies_sold)
      .slice(0, 3)
  }
}
