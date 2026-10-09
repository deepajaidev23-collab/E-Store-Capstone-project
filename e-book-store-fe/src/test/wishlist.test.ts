/**
 * Tests for MockWishlistRepository — covers the main wishlist behaviours.
 *
 * All tests run entirely in-memory via MockWishlistRepository so no network
 * or Supabase connection is required.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { MockWishlistRepository } from '@/repositories/mock/MockWishlistRepository'
import { BOOKS } from '@/repositories/mock/mockData'

const USER_A = 'user-a'
const USER_B = 'user-b'
const BOOK_ID = BOOKS[0].id   // 'book-001'
const BOOK_ID_2 = BOOKS[1].id // 'book-002'

let repo: MockWishlistRepository

beforeEach(() => {
  repo = new MockWishlistRepository()
})

// ── getWishlist ───────────────────────────────────────────────────────────────

describe('getWishlist', () => {
  it('returns an empty array for a new user', async () => {
    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(0)
  })

  it('returns items after they are added', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(1)
    expect(items[0].book_id).toBe(BOOK_ID)
  })

  it('returns items newest-first', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.addToWishlist(USER_A, BOOK_ID_2)
    const items = await repo.getWishlist(USER_A)
    const times = items.map((i) => new Date(i.added_at).getTime())
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeLessThanOrEqual(times[i - 1])
    }
  })

  it('returns items with embedded book object', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    const items = await repo.getWishlist(USER_A)
    expect(items[0].book).toBeDefined()
    expect(items[0].book?.id).toBe(BOOK_ID)
    expect(items[0].book?.title).toBeTruthy()
  })

  it('isolates wishlists between different users', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    const itemsB = await repo.getWishlist(USER_B)
    expect(itemsB).toHaveLength(0)
  })
})

// ── addToWishlist ─────────────────────────────────────────────────────────────

describe('addToWishlist', () => {
  it('returns a WishlistItem with correct fields', async () => {
    const item = await repo.addToWishlist(USER_A, BOOK_ID)
    expect(item.id).toBeTruthy()
    expect(item.book_id).toBe(BOOK_ID)
    expect(item.added_at).toBeTruthy()
    expect(item.book).toBeDefined()
  })

  it('is idempotent — calling twice returns the same item without duplicate', async () => {
    const first  = await repo.addToWishlist(USER_A, BOOK_ID)
    const second = await repo.addToWishlist(USER_A, BOOK_ID)
    expect(first.id).toBe(second.id)

    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(1)
  })

  it('allows adding different books', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.addToWishlist(USER_A, BOOK_ID_2)
    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(2)
  })

  it('does not add books to another user\'s wishlist', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    const itemsB = await repo.getWishlist(USER_B)
    expect(itemsB).toHaveLength(0)
  })
})

// ── removeFromWishlist ────────────────────────────────────────────────────────

describe('removeFromWishlist', () => {
  it('removes the specified item', async () => {
    const item = await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.removeFromWishlist(item.id, USER_A)
    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(0)
  })

  it('removes only the specified item, leaving others intact', async () => {
    const item1 = await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.addToWishlist(USER_A, BOOK_ID_2)
    await repo.removeFromWishlist(item1.id, USER_A)
    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(1)
    expect(items[0].book_id).toBe(BOOK_ID_2)
  })

  it('is a no-op for an unknown item id', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.removeFromWishlist('nonexistent-item-id', USER_A)
    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(1)
  })
})

// ── isInWishlist ──────────────────────────────────────────────────────────────

describe('isInWishlist', () => {
  it('returns false when the wishlist is empty', async () => {
    const result = await repo.isInWishlist(USER_A, BOOK_ID)
    expect(result).toBe(false)
  })

  it('returns true after adding the book', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    const result = await repo.isInWishlist(USER_A, BOOK_ID)
    expect(result).toBe(true)
  })

  it('returns false after removing the book', async () => {
    const item = await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.removeFromWishlist(item.id, USER_A)
    const result = await repo.isInWishlist(USER_A, BOOK_ID)
    expect(result).toBe(false)
  })

  it('returns false for a different user even if they have the same book', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    const result = await repo.isInWishlist(USER_B, BOOK_ID)
    expect(result).toBe(false)
  })
})

// ── clearWishlist ─────────────────────────────────────────────────────────────

describe('clearWishlist', () => {
  it('removes all items for the user', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.addToWishlist(USER_A, BOOK_ID_2)
    await repo.clearWishlist(USER_A)
    const items = await repo.getWishlist(USER_A)
    expect(items).toHaveLength(0)
  })

  it('does not affect another user\'s wishlist', async () => {
    await repo.addToWishlist(USER_A, BOOK_ID)
    await repo.addToWishlist(USER_B, BOOK_ID)
    await repo.clearWishlist(USER_A)
    const itemsB = await repo.getWishlist(USER_B)
    expect(itemsB).toHaveLength(1)
  })

  it('is safe to call on an empty wishlist', async () => {
    await expect(repo.clearWishlist(USER_A)).resolves.toBeUndefined()
  })
})
