/**
 * SupabaseBookRepository — live implementation of BookRepository backed by
 * a Supabase/Postgres database.
 *
 * Query design decisions:
 * - books + publisher are embedded in a single round-trip via PostgREST FK join
 * - categories are fetched via the book_categories join table
 * - reviews embed the reviewer display_name via a profiles join
 * - getBooks uses ilike for search (falls back gracefully if FTS index absent)
 * - getBooks uses count:'exact' for the total field in BooksResult
 * - Pagination params (page / pageSize) are accepted but optional; the UI
 *   does not use them yet — adding them does not break existing callers
 *
 * Error handling:
 * - Every Supabase error is wrapped in RepositoryError and thrown so
 *   React Query's isError state fires correctly
 * - submitReview throws UnauthenticatedError when no session is present
 * - getBookById returns null (not throws) for a missing book — BookDetailPage
 *   already handles this with NotFoundState
 *
 * Type casting strategy:
 * - Supabase JS v2's generic type inference cannot resolve nested select()
 *   strings at compile time. We define explicit BookQueryRow / ReviewQueryRow
 *   shapes and cast raw query data to them. throwOnError() is always called
 *   before any cast so we never cast an error result.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookRepository, BookFilters, BooksResult, SortField } from '@/repositories/BookRepository'
import type { Book, Category, Publisher } from '@/types/book'
import type { Review } from '@/types/review'
import { RepositoryError, UnauthenticatedError } from './errors'

// ── Supabase client type ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

// ── Query result row types ────────────────────────────────────────────────────
// PostgREST returns nested objects for FK / join-table embeds.
// We define the exact shapes we expect from our SELECT strings so mapBook()
// and mapReview() are type-safe without `any` casts on individual fields.

interface PublisherRow {
  id: string
  name: string
  description: string | null
}

interface CategoryRow {
  id: string
  name: string
  slug: string
}

/** Shape returned by the books SELECT that embeds publisher + categories */
interface BookQueryRow {
  id: string
  title: string
  author_name: string
  author_bio: string | null
  author_avatar_url: string | null
  publisher_id: string | null
  description: string
  cover_url: string
  format: 'paperback' | 'ebook' | 'hardcover'
  language: string
  price: number
  original_price: number | null
  copies_sold: number
  average_rating: number
  is_bestseller: boolean
  is_new_launch: boolean
  created_at: string
  /** Embedded FK join — null when publisher_id is null */
  publisher: PublisherRow | null
  /** Join via book_categories — each row wraps a categories row */
  book_categories: Array<{ categories: CategoryRow | null }>
}

/** Shape returned by the reviews SELECT that joins profiles */
interface ReviewQueryRow {
  id: string
  book_id: string
  user_id: string
  rating: number
  body: string
  created_at: string
  profiles: { display_name: string } | null
}

/** Shape returned by book_categories SELECT 'book_id' */
interface BookCategoryRow {
  book_id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Throw a RepositoryError if Supabase returned an error object */
function throwOnError(error: { message: string; code?: string; hint?: string } | null): void {
  if (error) {
    throw RepositoryError.fromPostgrest(error as import('@supabase/supabase-js').PostgrestError)
  }
}

/** Map a DB row (with embeds) to the domain Book type */
function mapBook(row: BookQueryRow): Book {
  const publisher: Publisher | undefined =
    row.publisher
      ? { id: row.publisher.id, name: row.publisher.name, description: row.publisher.description }
      : undefined

  const categories: Category[] = row.book_categories
    .map((bc) => bc.categories)
    .filter((c): c is CategoryRow => c !== null)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }))

  return {
    id: row.id,
    title: row.title,
    author_name: row.author_name,
    author_bio: row.author_bio,
    author_avatar_url: row.author_avatar_url,
    publisher_id: row.publisher_id,
    publisher,
    description: row.description,
    cover_url: row.cover_url,
    format: row.format,
    language: row.language,
    price: Number(row.price),
    original_price: row.original_price !== null ? Number(row.original_price) : null,
    copies_sold: row.copies_sold,
    average_rating: Number(row.average_rating),
    is_bestseller: row.is_bestseller,
    is_new_launch: row.is_new_launch,
    created_at: row.created_at,
    categories,
  }
}

/** Map a DB review row (with profiles join) to the domain Review type */
function mapReview(row: ReviewQueryRow): Review {
  return {
    id: row.id,
    book_id: row.book_id,
    user_id: row.user_id,
    reviewer_name: row.profiles?.display_name ?? 'Anonymous',
    rating: row.rating,
    body: row.body,
    created_at: row.created_at,
  }
}

/**
 * The SELECT string used whenever we fetch full book rows.
 * Embeds: publisher (FK), book_categories → categories (join table).
 */
const BOOK_SELECT = '*, publisher:publishers(*), book_categories(categories(*))'

/** Maps SortField → Supabase .order() params */
const SORT_MAP: Record<SortField, { column: string; ascending: boolean }> = {
  relevance:  { column: 'copies_sold',    ascending: false },
  price_asc:  { column: 'price',          ascending: true  },
  price_desc: { column: 'price',          ascending: false },
  rating:     { column: 'average_rating', ascending: false },
  newest:     { column: 'created_at',     ascending: false },
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseBookRepository implements BookRepository {
  private client: AnySupabaseClient

  constructor(client: AnySupabaseClient) {
    this.client = client
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('*')
      .order('name')

    throwOnError(error)
    const rows = (data ?? []) as CategoryRow[]
    return rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
  }

  // ── Publishers ─────────────────────────────────────────────────────────────

  async getPublishers(): Promise<Publisher[]> {
    const { data, error } = await this.client
      .from('publishers')
      .select('*')
      .order('name')

    throwOnError(error)
    const rows = (data ?? []) as PublisherRow[]
    return rows.map((p) => ({ id: p.id, name: p.name, description: p.description }))
  }

  // ── Single book ────────────────────────────────────────────────────────────

  async getBookById(id: string): Promise<Book | null> {
    if (!id) return null

    const { data, error } = await this.client
      .from('books')
      .select(BOOK_SELECT)
      .eq('id', id)
      .maybeSingle()

    throwOnError(error)
    if (!data) return null
    return mapBook(data as unknown as BookQueryRow)
  }

  // ── Curated sections ───────────────────────────────────────────────────────

  async getRecommendedBooks(): Promise<Book[]> {
    const { data, error } = await this.client
      .from('books')
      .select(BOOK_SELECT)
      .order('copies_sold', { ascending: false })
      .limit(3)

    throwOnError(error)
    return ((data ?? []) as unknown as BookQueryRow[]).map(mapBook)
  }

  async getBestsellerBooks(limit?: number): Promise<Book[]> {
    let query = this.client
      .from('books')
      .select(BOOK_SELECT)
      .eq('is_bestseller', true)
      .order('copies_sold', { ascending: false })

    if (limit && limit > 0) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    throwOnError(error)
    return ((data ?? []) as unknown as BookQueryRow[]).map(mapBook)
  }

  async getNewLaunchBooks(limit?: number): Promise<Book[]> {
    let query = this.client
      .from('books')
      .select(BOOK_SELECT)
      .eq('is_new_launch', true)
      .order('created_at', { ascending: false })

    if (limit && limit > 0) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    throwOnError(error)
    return ((data ?? []) as unknown as BookQueryRow[]).map(mapBook)
  }

  // ── getBooks — full catalogue query ───────────────────────────────────────

  async getBooks(filters: BookFilters): Promise<BooksResult> {
    // Pagination defaults: page 1, 50 per page
    const page = (filters as BookFilters & { page?: number }).page ?? 1
    const pageSize = (filters as BookFilters & { pageSize?: number }).pageSize ?? 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = this.client
      .from('books')
      .select(BOOK_SELECT, { count: 'exact' })

    // ── Filters ──────────────────────────────────────────────────────────────

    if (filters.search) {
      const term = `%${filters.search}%`
      query = query.or(`title.ilike.${term},author_name.ilike.${term}`)
    }

    if (filters.categorySlug && filters.categorySlug !== 'all') {
      // Filter via the join table: restrict to books linked to this category slug
      query = query.eq('book_categories.categories.slug', filters.categorySlug)
    }

    if (filters.language) {
      query = query.eq('language', filters.language)
    }

    if (filters.format) {
      query = query.eq('format', filters.format)
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange
      query = query.gte('price', min)
      if (isFinite(max)) {
        query = query.lte('price', max)
      }
    }

    if (filters.publisherId) {
      query = query.eq('publisher_id', filters.publisherId)
    }

    // ── Sort ─────────────────────────────────────────────────────────────────

    const sort = SORT_MAP[filters.sort ?? 'relevance']
    query = query.order(sort.column, { ascending: sort.ascending })

    // ── Pagination ────────────────────────────────────────────────────────────

    query = query.range(from, to)

    const { data, error, count } = await query

    throwOnError(error)

    const books = ((data ?? []) as unknown as BookQueryRow[]).map(mapBook)
    return { books, total: count ?? books.length }
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  async getReviews(bookId: string): Promise<Review[]> {
    const { data, error } = await this.client
      .from('reviews')
      .select('*, profiles(display_name)')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })

    throwOnError(error)
    return ((data ?? []) as unknown as ReviewQueryRow[]).map(mapReview)
  }

  async submitReview(bookId: string, rating: number, body: string): Promise<Review> {
    const { data: userData, error: authError } = await this.client.auth.getUser()
    if (authError || !userData.user) {
      throw new UnauthenticatedError()
    }

    const userId = userData.user.id

    const { data, error } = await this.client
      .from('reviews')
      .upsert(
        [{ book_id: bookId, user_id: userId, rating, body }] as unknown[],
        { onConflict: 'book_id,user_id' },
      )
      .select('*, profiles(display_name)')
      .single()

    throwOnError(error)
    return mapReview(data as unknown as ReviewQueryRow)
  }

  // ── Related books ──────────────────────────────────────────────────────────

  async getRelatedBooks(bookId: string, categoryIds: string[]): Promise<Book[]> {
    if (categoryIds.length === 0) return []

    // Two-step approach: first find book_ids via book_categories, then fetch
    // those books. More reliable than nested PostgREST filter semantics.
    const { data: bcData, error: bcError } = await this.client
      .from('book_categories')
      .select('book_id')
      .in('category_id', categoryIds)
      .neq('book_id', bookId)

    throwOnError(bcError)

    const bcRows = (bcData ?? []) as unknown as BookCategoryRow[]
    const relatedIds = [...new Set(bcRows.map((r) => r.book_id))]

    if (relatedIds.length === 0) return []

    const { data, error } = await this.client
      .from('books')
      .select(BOOK_SELECT)
      .in('id', relatedIds)
      .order('copies_sold', { ascending: false })
      .limit(3)

    throwOnError(error)
    return ((data ?? []) as unknown as BookQueryRow[]).map(mapBook)
  }
}
