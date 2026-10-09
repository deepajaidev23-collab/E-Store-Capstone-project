/**
 * CartRepository — contract for all shopping cart data operations.
 *
 * Auth-gated: every method requires an authenticated user.
 * Follows the same patterns as WishlistRepository.
 *
 * Design decisions:
 * - Each user has one cart (upserted lazily on first write).
 * - addItem is idempotent: if the book is already in the cart, it increments
 *   the quantity instead of throwing.
 * - updateQuantity(itemId, 0) is equivalent to removeItem.
 * - Coupon validation is a read-only lookup — no side effects.
 */
import type { CartItem, Coupon } from '@/types/cart'

export interface CartRepository {
  /**
   * All cart items for the given user, oldest-first.
   * Each item includes the full Book object embedded.
   */
  getCart(userId: string): Promise<CartItem[]>

  /**
   * Add a book to the cart with quantity 1.
   * Idempotent — increments quantity if the book is already in the cart.
   */
  addItem(userId: string, bookId: string): Promise<CartItem>

  /**
   * Update the quantity of a specific cart item.
   * Passing quantity ≤ 0 removes the item.
   */
  updateQuantity(itemId: string, quantity: number): Promise<CartItem | null>

  /**
   * Remove a single cart item by its item id.
   * userId is used as a defence-in-depth ownership guard at the application
   * layer (the Supabase impl also enforces ownership via RLS join).
   */
  removeItem(itemId: string, userId: string): Promise<void>

  /**
   * Returns true if the given book is already in the user's cart.
   */
  isInCart(userId: string, bookId: string): Promise<boolean>

  /**
   * Remove all items from the user's cart.
   */
  clearCart(userId: string): Promise<void>

  /**
   * Look up a coupon by code.
   * Returns null if the code does not exist or is inactive / expired.
   */
  getCoupon(code: string): Promise<Coupon | null>
}
