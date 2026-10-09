/**
 * scoring.ts — pure, framework-free helpers for recommendation scoring.
 *
 * Extracted here so both CatalogueRecommendationService and
 * MockRecommendationService share identical logic without duplication.
 * These functions have no side-effects and are trivially testable.
 */
import type { Book } from '@/types/book'

// ── Signal weights ────────────────────────────────────────────────────────────

export const SCORE_SAME_AUTHOR    = 3
export const SCORE_SAME_CATEGORY  = 2
export const SCORE_SAME_PUBLISHER = 1

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoredBook {
  book: Book
  score: number
}

// ── Core scoring ──────────────────────────────────────────────────────────────

/**
 * Merges three candidate lists into a single deduplicated, ranked list.
 *
 * Books appearing in more than one signal set accumulate points from each.
 * The context book is excluded from the results.
 * Ties are broken by copies_sold descending.
 *
 * @param contextBookId     The id of the book being used as context (excluded from results).
 * @param sameAuthorBooks   Candidates that share the author — each worth SCORE_SAME_AUTHOR pts.
 * @param sameCategoryBooks Candidates that share a category — each worth SCORE_SAME_CATEGORY pts.
 * @param samePublisherBooks Candidates that share the publisher — each worth SCORE_SAME_PUBLISHER pts.
 * @param limit             Maximum number of results returned.
 */
export function scoreAndRank(
  contextBookId: string,
  sameAuthorBooks: Book[],
  sameCategoryBooks: Book[],
  samePublisherBooks: Book[],
  limit: number,
): Book[] {
  const scoreMap = new Map<string, ScoredBook>()

  function award(books: Book[], pts: number): void {
    for (const book of books) {
      if (book.id === contextBookId) continue
      const entry = scoreMap.get(book.id)
      if (entry) {
        entry.score += pts
      } else {
        scoreMap.set(book.id, { book, score: pts })
      }
    }
  }

  award(sameAuthorBooks,    SCORE_SAME_AUTHOR)
  award(sameCategoryBooks,  SCORE_SAME_CATEGORY)
  award(samePublisherBooks, SCORE_SAME_PUBLISHER)

  return [...scoreMap.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.book.copies_sold - a.book.copies_sold
    })
    .slice(0, limit)
    .map((e) => e.book)
}

/**
 * Extracts fulfilled results from a Promise.allSettled call.
 * Rejected settlements are silently ignored and treated as empty arrays.
 */
export function settledValues<T>(
  results: PromiseSettledResult<T[]>[],
): T[][] {
  return results.map((r) => (r.status === 'fulfilled' ? r.value : []))
}
