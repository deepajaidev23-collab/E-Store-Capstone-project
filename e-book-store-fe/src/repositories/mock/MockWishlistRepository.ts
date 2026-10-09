/**
 * MockWishlistRepository — in-memory implementation of WishlistRepository.
 *
 * Used when VITE_USE_SUPABASE=false and in all tests. Holds per-user state
 * in a Map so multiple users can have independent wishlists in the same
 * process without interference.
 */
import type { WishlistRepository } from '@/repositories/WishlistRepository'
import type { WishlistItem } from '@/types/cart'
import { BOOKS } from './mockData'

/** Simulated async latency */
const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms))

export class MockWishlistRepository implements WishlistRepository {
  /** userId → WishlistItem[] */
  private items: Map<string, WishlistItem[]> = new Map()

  private getUserItems(userId: string): WishlistItem[] {
    if (!this.items.has(userId)) this.items.set(userId, [])
    return this.items.get(userId)!
  }

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    await delay()
    // Return newest-first
    return [...this.getUserItems(userId)].sort(
      (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime(),
    )
  }

  async addToWishlist(userId: string, bookId: string): Promise<WishlistItem> {
    await delay()
    const list = this.getUserItems(userId)

    // Idempotent — return existing item if already present
    const existing = list.find((i) => i.book_id === bookId)
    if (existing) return existing

    const book = BOOKS.find((b) => b.id === bookId)
    const item: WishlistItem = {
      id: `wi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      wishlist_id: `wl-${userId}`,
      book_id: bookId,
      added_at: new Date().toISOString(),
      book,
    }
    list.push(item)
    return item
  }

  async removeFromWishlist(itemId: string, userId: string): Promise<void> {
    await delay()
    const list = this.getUserItems(userId)
    const idx = list.findIndex((i) => i.id === itemId)
    if (idx !== -1) {
      list.splice(idx, 1)
      this.items.set(userId, list)
    }
  }

  async isInWishlist(userId: string, bookId: string): Promise<boolean> {
    await delay(30)
    return this.getUserItems(userId).some((i) => i.book_id === bookId)
  }

  async clearWishlist(userId: string): Promise<void> {
    await delay()
    this.items.set(userId, [])
  }
}
