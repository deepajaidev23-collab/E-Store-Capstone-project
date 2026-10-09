/**
 * cart.test.ts — Unit + integration tests for the cart feature.
 *
 * Tests:
 *  - MockCartRepository (CRUD behaviour, idempotency, coupon lookup)
 *  - useCart / useAddToCart / useRemoveFromCart / useUpdateCartQty (hook behaviour)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { MockCartRepository } from '@/repositories/mock/MockCartRepository'
import { useCart, useIsInCart } from '@/hooks/useCart'
import { BOOKS } from '@/repositories/mock/mockData'

// ── Test helpers ──────────────────────────────────────────────────────────────

const USER_A = 'user-a'
const USER_B = 'user-b'
const BOOK_1 = BOOKS[0].id
const BOOK_2 = BOOKS[1].id

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

// ── MockCartRepository ────────────────────────────────────────────────────────

describe('MockCartRepository', () => {
  let repo: MockCartRepository

  beforeEach(() => {
    repo = new MockCartRepository()
  })

  it('returns an empty cart for a new user', async () => {
    const items = await repo.getCart(USER_A)
    expect(items).toEqual([])
  })

  it('adds a single item to the cart', async () => {
    const item = await repo.addItem(USER_A, BOOK_1)
    expect(item.book_id).toBe(BOOK_1)
    expect(item.quantity).toBe(1)
    expect(item.book).toBeDefined()
  })

  it('increments quantity when the same book is added again (idempotent)', async () => {
    await repo.addItem(USER_A, BOOK_1)
    const item2 = await repo.addItem(USER_A, BOOK_1)
    expect(item2.quantity).toBe(2)
    const cart = await repo.getCart(USER_A)
    expect(cart).toHaveLength(1)
  })

  it('adds two different books independently', async () => {
    await repo.addItem(USER_A, BOOK_1)
    await repo.addItem(USER_A, BOOK_2)
    const cart = await repo.getCart(USER_A)
    expect(cart).toHaveLength(2)
  })

  it('isInCart returns true after adding a book', async () => {
    await repo.addItem(USER_A, BOOK_1)
    expect(await repo.isInCart(USER_A, BOOK_1)).toBe(true)
  })

  it('isInCart returns false for a book not added', async () => {
    expect(await repo.isInCart(USER_A, BOOK_1)).toBe(false)
  })

  it('isInCart is user-scoped — other users do not see the item', async () => {
    await repo.addItem(USER_A, BOOK_1)
    expect(await repo.isInCart(USER_B, BOOK_1)).toBe(false)
  })

  it('removeItem removes the correct book', async () => {
    const item = await repo.addItem(USER_A, BOOK_1)
    await repo.removeItem(item.id, USER_A)
    const cart = await repo.getCart(USER_A)
    expect(cart).toHaveLength(0)
  })

  it('removeItem on non-existent id is a no-op', async () => {
    await expect(repo.removeItem('does-not-exist', USER_A)).resolves.toBeUndefined()
  })

  it('updateQuantity updates the quantity', async () => {
    const item = await repo.addItem(USER_A, BOOK_1)
    const updated = await repo.updateQuantity(item.id, 3)
    expect(updated?.quantity).toBe(3)
  })

  it('updateQuantity with quantity ≤ 0 removes the item', async () => {
    const item = await repo.addItem(USER_A, BOOK_1)
    const result = await repo.updateQuantity(item.id, 0)
    expect(result).toBeNull()
    const cart = await repo.getCart(USER_A)
    expect(cart).toHaveLength(0)
  })

  it('clearCart empties the cart', async () => {
    await repo.addItem(USER_A, BOOK_1)
    await repo.addItem(USER_A, BOOK_2)
    await repo.clearCart(USER_A)
    const cart = await repo.getCart(USER_A)
    expect(cart).toHaveLength(0)
  })

  it('clearCart only affects the target user', async () => {
    await repo.addItem(USER_A, BOOK_1)
    await repo.addItem(USER_B, BOOK_2)
    await repo.clearCart(USER_A)
    const cartB = await repo.getCart(USER_B)
    expect(cartB).toHaveLength(1)
  })

  it('getCoupon returns a valid coupon by code (case-insensitive)', async () => {
    const coupon = await repo.getCoupon('save100')
    expect(coupon).not.toBeNull()
    expect(coupon?.code).toBe('SAVE100')
    expect(coupon?.is_active).toBe(true)
  })

  it('getCoupon returns a percent coupon', async () => {
    const coupon = await repo.getCoupon('TENOFF')
    expect(coupon?.discount_type).toBe('percent')
    expect(coupon?.discount_value).toBe(10)
  })

  it('getCoupon returns null for an unknown code', async () => {
    const coupon = await repo.getCoupon('DOESNOTEXIST')
    expect(coupon).toBeNull()
  })
})

// ── useCart hooks — disabled state ────────────────────────────────────────────

describe('useCart disabled state', () => {
  it('useCart returns undefined data when userId is empty (query disabled)', () => {
    const { result } = renderHook(() => useCart(''), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useIsInCart returns undefined data when userId is empty', () => {
    const { result } = renderHook(() => useIsInCart('', BOOK_1), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
    expect(result.current.fetchStatus).toBe('idle')
  })
})

// ── Additional repository edge-case tests ─────────────────────────────────────

describe('MockCartRepository — additional edge cases', () => {
  let repo: MockCartRepository

  beforeEach(() => {
    repo = new MockCartRepository()
  })

  it('getCart returns items in insertion order', async () => {
    await repo.addItem(USER_A, BOOK_1)
    await repo.addItem(USER_A, BOOK_2)
    const cart = await repo.getCart(USER_A)
    expect(cart[0].book_id).toBe(BOOK_1)
    expect(cart[1].book_id).toBe(BOOK_2)
  })

  it('addItem embeds the book object when BOOKS contains the book', async () => {
    const item = await repo.addItem(USER_A, BOOK_1)
    expect(item.book).toBeDefined()
    expect(item.book?.id).toBe(BOOK_1)
    expect(item.book?.price).toBeGreaterThan(0)
  })

  it('addItem third call increments quantity to 3', async () => {
    await repo.addItem(USER_A, BOOK_1)
    await repo.addItem(USER_A, BOOK_1)
    const item = await repo.addItem(USER_A, BOOK_1)
    expect(item.quantity).toBe(3)
  })

  it('updateQuantity to 1 from 3 works correctly', async () => {
    const item = await repo.addItem(USER_A, BOOK_1)
    await repo.updateQuantity(item.id, 3)
    const updated = await repo.updateQuantity(item.id, 1)
    expect(updated?.quantity).toBe(1)
  })
})
