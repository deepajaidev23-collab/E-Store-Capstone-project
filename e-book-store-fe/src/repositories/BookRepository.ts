/**
 * BookRepository — the single interface that all data access goes through.
 *
 * The UI layer depends only on this contract, never on any concrete
 * implementation (mock, Supabase, REST, …).  Swap the implementation
 * by providing a different object via the RepositoryContext.
 */
import type { Book, Category, Publisher } from '@/types/book'
import type { Review } from '@/types/review'

// ── Query & filter types ─────────────────────────────────────────────────────

export type SortField = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'

export interface BookFilters {
  /** Free-text search across title and author */
  search?: string
  /** Category slug — undefined means "All" */
  categorySlug?: string
  /** ISO 639-1 language code e.g. "en", "hi" */
  language?: string
  /** BookFormat values */
  format?: string
  /** Price range inclusive [min, max] in ₹ */
  priceRange?: [number, number]
  /** Publisher id */
  publisherId?: string
  sort?: SortField
  /** Page number (1-based) */
  page?: number
  /** Items per page */
  pageSize?: number
}

// ── Result shape ─────────────────────────────────────────────────────────────

export interface BooksResult {
  books: Book[]
  total: number
}

// ── The repository contract ──────────────────────────────────────────────────

export interface BookRepository {
  /**
   * Fetch a filtered, sorted page of books.
   * Always returns the full matching set (pagination is out-of-scope for now).
   */
  getBooks(filters: BookFilters): Promise<BooksResult>

  /** Fetch a single book by its id; returns null when not found. */
  getBookById(id: string): Promise<Book | null>

  /** All available categories ordered for display. */
  getCategories(): Promise<Category[]>

  /** All publishers. */
  getPublishers(): Promise<Publisher[]>

  /**
   * Curated "Recommended for You" list.
   * In a real implementation this could be personalised; here it is static.
   */
  getRecommendedBooks(): Promise<Book[]>

  /** Books flagged as bestsellers. */
  getBestsellerBooks(limit?: number): Promise<Book[]>

  /** Books flagged as new launches. */
  getNewLaunchBooks(limit?: number): Promise<Book[]>

  /**
   * All reviews for a given book, ordered newest first.
   */
  getReviews(bookId: string): Promise<Review[]>

  /**
   * Append a new review for a book.
   * In the mock this is in-memory only; in production it writes to the DB.
   */
  submitReview(bookId: string, rating: number, body: string): Promise<Review>

  /**
   * Up to 3 books that share any category with the current book,
   * excluding the book itself, ordered by popularity (copies_sold desc).
   */
  getRelatedBooks(bookId: string, categoryIds: string[]): Promise<Book[]>
}
