/**
 * WishlistRepository — contract for all wishlist data operations.
 *
 * Kept separate from BookRepository because wishlist operations are
 * auth-gated (every method requires an authenticated user), while catalogue
 * queries are public. Mixing them would force BookRepository callers to
 * handle auth errors.
 *
 * The UI layer depends only on this interface. Swap the concrete
 * implementation (Supabase ↔ mock) by changing the singleton in
 * src/repositories/index.ts.
 */
import type { WishlistItem } from '@/types/cart'

export interface WishlistRepository {
  /**
   * All wishlist items for the given user, most recently added first.
   * Each item includes the full Book object embedded so callers can
   * render ProductCard without a second fetch.
   */
  getWishlist(userId: string): Promise<WishlistItem[]>

  /**
   * Add a book to the user's wishlist.
   * Idempotent — silently returns the existing item if the book is
   * already in the wishlist (duplicate prevented at DB level via
   * unique constraint on wishlist_id + book_id).
   */
  addToWishlist(userId: string, bookId: string): Promise<WishlistItem>

  /**
   * Remove a single wishlist item by its item id.
   * userId is used as a defence-in-depth ownership guard at the application
   * layer (the Supabase impl also enforces ownership via RLS join).
   */
  removeFromWishlist(itemId: string, userId: string): Promise<void>

  /**
   * Returns true if the given book is already in the user's wishlist.
   * Uses a lightweight count query — does not fetch the full item.
   */
  isInWishlist(userId: string, bookId: string): Promise<boolean>

  /**
   * Remove all items from the user's wishlist.
   */
  clearWishlist(userId: string): Promise<void>
}
