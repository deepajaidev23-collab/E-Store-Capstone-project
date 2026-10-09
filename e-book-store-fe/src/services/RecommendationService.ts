/**
 * RecommendationService — the single interface all recommendation
 * implementations must satisfy.
 *
 * UI code and hooks import from this file only; they never import a
 * concrete implementation.  Swap the algorithm by providing a different
 * class in services/index.ts — no component changes required.
 */
import type { Book } from '@/types/book'

export interface RecommendationService {
  /**
   * Returns a scored, ranked list of books relevant to a given context book.
   * Used by BookDetailPage / RelatedReadsPanel.
   *
   * @param contextBook  The book currently being viewed.
   * @param limit        Maximum number of results to return. Defaults to 6.
   */
  getRecommendations(contextBook: Book, limit?: number): Promise<Book[]>

  /**
   * Returns recommendations when no context book is available.
   * Used by CataloguePage when no filters are active.
   * Falls back to global top-by-sales when no personalisation is possible.
   *
   * @param limit  Maximum number of results to return. Defaults to 6.
   */
  getFallbackRecommendations(limit?: number): Promise<Book[]>
}
