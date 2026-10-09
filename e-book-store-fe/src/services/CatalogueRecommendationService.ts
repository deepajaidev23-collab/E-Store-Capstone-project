/**
 * CatalogueRecommendationService — production implementation of
 * RecommendationService backed by a BookRepository (Supabase in production).
 *
 * Algorithm:
 *   1. Fire three parallel queries against the book repository.
 *   2. Score each candidate book: same-author = 3 pts, same-category = 2 pts,
 *      same-publisher = 1 pt.  A book matching multiple signals accumulates
 *      all applicable points.
 *   3. Deduplicate, exclude the context book, sort by score then copies_sold.
 *   4. Return the top `limit` results.
 *
 * The `orderRepository` parameter is injected but intentionally unused until
 * a future sub-task adds purchase-history signals.  To add that signal, add
 * a `getOrders(userId)` method to OrderRepository and call it here.
 */
import type { Book } from '@/types/book'
import type { BookRepository } from '@/repositories/BookRepository'
import type { OrderRepository } from '@/repositories/OrderRepository'
import type { RecommendationService } from './RecommendationService'
import { scoreAndRank, settledValues } from './scoring'

export class CatalogueRecommendationService implements RecommendationService {
  private readonly books: BookRepository
  // Reserved for future purchase-history signals (orderRepository stored for future use)
  protected readonly orders: OrderRepository | undefined

  constructor(bookRepository: BookRepository, orderRepository?: OrderRepository) {
    this.books = bookRepository
    this.orders = orderRepository
  }

  async getRecommendations(contextBook: Book, limit = 6): Promise<Book[]> {
    const categoryIds = (contextBook.categories ?? []).map((c) => c.id)

    // ── Parallel signal fetches ─────────────────────────────────────────────
    const [sameCategoryResult, sameAuthorResult, samePublisherResult] =
      await Promise.allSettled([
        // Signal 1: same category (reuses existing getRelatedBooks query)
        categoryIds.length > 0
          ? this.books.getRelatedBooks(contextBook.id, categoryIds)
          : Promise.resolve<Book[]>([]),

        // Signal 2: same author (exact name match against search results)
        this.books
          .getBooks({ search: contextBook.author_name, pageSize: limit * 2 })
          .then((r) =>
            r.books.filter(
              (b) =>
                b.author_name === contextBook.author_name &&
                b.id !== contextBook.id,
            ),
          ),

        // Signal 3: same publisher (only when publisher_id is set)
        contextBook.publisher_id
          ? this.books
              .getBooks({ publisherId: contextBook.publisher_id, pageSize: limit * 2 })
              .then((r) => r.books.filter((b) => b.id !== contextBook.id))
          : Promise.resolve<Book[]>([]),
      ])

    const [sameCategoryBooks, sameAuthorBooks, samePublisherBooks] =
      settledValues([sameCategoryResult, sameAuthorResult, samePublisherResult])

    return scoreAndRank(
      contextBook.id,
      sameAuthorBooks,
      sameCategoryBooks,
      samePublisherBooks,
      limit,
    )
  }

  async getFallbackRecommendations(limit = 6): Promise<Book[]> {
    const books = await this.books.getRecommendedBooks()
    return books.slice(0, limit)
  }
}
