/**
 * MockRecommendationService — in-memory implementation of RecommendationService
 * for use in tests and the mock (non-Supabase) development environment.
 *
 * Delegates all data access to the injected BookRepository (a MockBookRepository
 * at runtime) and applies the identical scoring logic from scoring.ts so test
 * results are consistent with production behaviour.
 */
import type { Book } from '@/types/book'
import type { BookRepository } from '@/repositories/BookRepository'
import type { RecommendationService } from '../RecommendationService'
import { scoreAndRank, settledValues } from '../scoring'

export class MockRecommendationService implements RecommendationService {
  private readonly books: BookRepository

  constructor(bookRepository: BookRepository) {
    this.books = bookRepository
  }

  async getRecommendations(contextBook: Book, limit = 6): Promise<Book[]> {
    const categoryIds = (contextBook.categories ?? []).map((c) => c.id)

    const [sameCategoryResult, sameAuthorResult, samePublisherResult] =
      await Promise.allSettled([
        categoryIds.length > 0
          ? this.books.getRelatedBooks(contextBook.id, categoryIds)
          : Promise.resolve<Book[]>([]),

        this.books
          .getBooks({ search: contextBook.author_name, pageSize: limit * 2 })
          .then((r) =>
            r.books.filter(
              (b) =>
                b.author_name === contextBook.author_name &&
                b.id !== contextBook.id,
            ),
          ),

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
