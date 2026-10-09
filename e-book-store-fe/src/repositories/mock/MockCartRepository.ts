/**
 * MockCartRepository — in-memory implementation of CartRepository.
 *
 * Used when VITE_USE_SUPABASE=false and in all tests.
 * Mirrors MockWishlistRepository patterns.
 */
import type { CartRepository } from '@/repositories/CartRepository'
import type { CartItem, Coupon } from '@/types/cart'
import { BOOKS } from './mockData'

const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms))

/** Seed coupons for dev/test */
const MOCK_COUPONS: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'SAVE100',
    discount_type: 'flat',
    discount_value: 100,
    min_order_value: 300,
    expires_at: null,
    is_active: true,
  },
  {
    id: 'coupon-2',
    code: 'TENOFF',
    discount_type: 'percent',
    discount_value: 10,
    min_order_value: null,
    expires_at: null,
    is_active: true,
  },
]

export class MockCartRepository implements CartRepository {
  /** userId → CartItem[] */
  private items: Map<string, CartItem[]> = new Map()

  private getUserItems(userId: string): CartItem[] {
    if (!this.items.has(userId)) this.items.set(userId, [])
    return this.items.get(userId)!
  }

  async getCart(userId: string): Promise<CartItem[]> {
    await delay()
    return [...this.getUserItems(userId)]
  }

  async addItem(userId: string, bookId: string): Promise<CartItem> {
    await delay()
    const list = this.getUserItems(userId)

    const existing = list.find((i) => i.book_id === bookId)
    if (existing) {
      existing.quantity += 1
      return existing
    }

    const book = BOOKS.find((b) => b.id === bookId)
    const item: CartItem = {
      id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      cart_id: `cart-${userId}`,
      book_id: bookId,
      quantity: 1,
      book,
    }
    list.push(item)
    return item
  }

  async updateQuantity(itemId: string, quantity: number): Promise<CartItem | null> {
    await delay()
    for (const list of this.items.values()) {
      const idx = list.findIndex((i) => i.id === itemId)
      if (idx !== -1) {
        if (quantity <= 0) {
          list.splice(idx, 1)
          return null
        }
        list[idx] = { ...list[idx], quantity }
        return list[idx]
      }
    }
    return null
  }

  async removeItem(itemId: string, userId: string): Promise<void> {
    await delay()
    const list = this.getUserItems(userId)
    const idx = list.findIndex((i) => i.id === itemId)
    if (idx !== -1) {
      list.splice(idx, 1)
      this.items.set(userId, list)
    }
  }

  async isInCart(userId: string, bookId: string): Promise<boolean> {
    await delay(30)
    return this.getUserItems(userId).some((i) => i.book_id === bookId)
  }

  async clearCart(userId: string): Promise<void> {
    await delay()
    this.items.set(userId, [])
  }

  async getCoupon(code: string): Promise<Coupon | null> {
    await delay(40)
    const coupon = MOCK_COUPONS.find(
      (c) => c.code.toUpperCase() === code.toUpperCase() && c.is_active,
    )
    return coupon ?? null
  }
}
