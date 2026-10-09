/**
 * SupabaseWishlistRepository — Supabase-backed implementation of WishlistRepository.
 *
 * Key design decisions:
 * - getOrCreateWishlist: upserts wishlists row on user_id to lazily create the
 *   wishlist on first use without requiring an explicit "create" action.
 * - addToWishlist: on unique-constraint violation (pg code 23505) it fetches
 *   the existing item rather than throwing — idempotent by design.
 * - getWishlist: embeds the full Book (with publisher + categories) in one
 *   round-trip so WishlistPage can render ProductCard without extra fetches.
 * - All methods cast raw Supabase data to explicit query-row interfaces
 *   (same pattern as SupabaseBookRepository) — throwOnError() is always
 *   called before any cast so we never cast an error result.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WishlistRepository } from '@/repositories/WishlistRepository'
import type { WishlistItem } from '@/types/cart'
import type { Book, Category, Publisher } from '@/types/book'
import { RepositoryError } from './errors'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

// ── Query row types ───────────────────────────────────────────────────────────

interface PublisherRow { id: string; name: string; description: string | null }
interface CategoryRow  { id: string; name: string; slug: string }

interface BookQueryRow {
  id: string; title: string; author_name: string; author_bio: string | null
  author_avatar_url: string | null; publisher_id: string | null
  description: string; cover_url: string
  format: 'paperback' | 'ebook' | 'hardcover'
  language: string; price: number; original_price: number | null
  copies_sold: number; average_rating: number
  is_bestseller: boolean; is_new_launch: boolean; created_at: string
  publisher: PublisherRow | null
  book_categories: Array<{ categories: CategoryRow | null }>
}

interface WishlistItemQueryRow {
  id: string
  wishlist_id: string
  book_id: string
  added_at: string
  books: BookQueryRow | null
}

interface WishlistRow { id: string; user_id: string; created_at: string }
interface CountRow    { count: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function throwOnError(error: { message: string; code?: string; hint?: string } | null): void {
  if (error) throw RepositoryError.fromPostgrest(error as import('@supabase/supabase-js').PostgrestError)
}

function mapBook(row: BookQueryRow): Book {
  const publisher: Publisher | undefined = row.publisher
    ? { id: row.publisher.id, name: row.publisher.name, description: row.publisher.description }
    : undefined

  const categories: Category[] = row.book_categories
    .map((bc) => bc.categories)
    .filter((c): c is CategoryRow => c !== null)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }))

  return {
    id: row.id, title: row.title, author_name: row.author_name,
    author_bio: row.author_bio, author_avatar_url: row.author_avatar_url,
    publisher_id: row.publisher_id, publisher, description: row.description,
    cover_url: row.cover_url, format: row.format, language: row.language,
    price: Number(row.price),
    original_price: row.original_price !== null ? Number(row.original_price) : null,
    copies_sold: row.copies_sold, average_rating: Number(row.average_rating),
    is_bestseller: row.is_bestseller, is_new_launch: row.is_new_launch,
    created_at: row.created_at, categories,
  }
}

function mapWishlistItem(row: WishlistItemQueryRow): WishlistItem {
  return {
    id: row.id,
    wishlist_id: row.wishlist_id,
    book_id: row.book_id,
    added_at: row.added_at,
    book: row.books ? mapBook(row.books) : undefined,
  }
}

/** Select string for wishlist_items that embeds the full Book shape */
const WISHLIST_ITEM_SELECT =
  '*, books(*, publisher:publishers(*), book_categories(categories(*)))'

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseWishlistRepository implements WishlistRepository {
  private client: AnySupabaseClient

  constructor(client: AnySupabaseClient) {
    this.client = client
  }

  /**
   * Upsert the wishlists row for this user and return its id.
   * Called before any write to wishlist_items.
   */
  private async getOrCreateWishlist(userId: string): Promise<string> {
    const { data, error } = await this.client
      .from('wishlists')
      .upsert({ user_id: userId } as Record<string, unknown>, { onConflict: 'user_id' })
      .select('id')
      .single()

    throwOnError(error)
    return (data as unknown as WishlistRow).id
  }

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    // Fetch via the wishlists join so RLS (user_id check on wishlists) is enforced
    const { data, error } = await this.client
      .from('wishlist_items')
      .select(`${WISHLIST_ITEM_SELECT}, wishlists!inner(user_id)`)
      .eq('wishlists.user_id', userId)
      .order('added_at', { ascending: false })

    throwOnError(error)
    return ((data ?? []) as unknown as WishlistItemQueryRow[]).map(mapWishlistItem)
  }

  async addToWishlist(userId: string, bookId: string): Promise<WishlistItem> {
    const wishlistId = await this.getOrCreateWishlist(userId)

    const { data, error } = await this.client
      .from('wishlist_items')
      .insert({ wishlist_id: wishlistId, book_id: bookId } as Record<string, unknown>)
      .select(WISHLIST_ITEM_SELECT)
      .single()

    // 23505 = unique_violation — book already in wishlist, fetch existing item
    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: fetchError } = await this.client
          .from('wishlist_items')
          .select(WISHLIST_ITEM_SELECT)
          .eq('wishlist_id', wishlistId)
          .eq('book_id', bookId)
          .single()
        throwOnError(fetchError)
        return mapWishlistItem(existing as unknown as WishlistItemQueryRow)
      }
      throwOnError(error)
    }

    return mapWishlistItem(data as unknown as WishlistItemQueryRow)
  }

  async removeFromWishlist(itemId: string, userId: string): Promise<void> {
    // Defence-in-depth: resolve the wishlist id for this user first, then
    // filter the delete by both item id and wishlist id.
    const { data: wl } = await this.client
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!wl) return  // user has no wishlist — nothing to delete

    const { error } = await this.client
      .from('wishlist_items')
      .delete()
      .eq('id', itemId)
      .eq('wishlist_id', (wl as { id: string }).id)

    throwOnError(error)
  }

  async isInWishlist(userId: string, bookId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('wishlist_items')
      .select('wishlist_items.id, wishlists!inner(user_id)', { count: 'exact', head: true })
      .eq('wishlists.user_id', userId)
      .eq('book_id', bookId)

    throwOnError(error)
    const countData = data as unknown as CountRow | null
    return (countData?.count ?? 0) > 0
  }

  async clearWishlist(userId: string): Promise<void> {
    // Find the wishlist id first so we can delete only this user's items
    const { data: wl, error: wlError } = await this.client
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    throwOnError(wlError)
    if (!wl) return // no wishlist exists — nothing to clear

    const wishlistId = (wl as unknown as WishlistRow).id

    const { error } = await this.client
      .from('wishlist_items')
      .delete()
      .eq('wishlist_id', wishlistId)

    throwOnError(error)
  }
}
