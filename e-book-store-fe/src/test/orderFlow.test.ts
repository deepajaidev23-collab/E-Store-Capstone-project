/**
 * orderFlow.test.ts — Integration-style unit tests for the order creation flow.
 *
 * Tests:
 *  - validateCartItems() — missing book, invalid price
 *  - MockOrderRepository.createOrder() — success, price snapshot, items
 *  - MockOrderRepository.createOrder() failure scenarios
 *  - MockOrderRepository.confirmPayment() — idempotency key param (pass-through)
 *  - Full flow: createOrder → confirmPayment success → order confirmed
 *  - Full flow: createOrder → confirmPayment failure → order remains pending
 *  - Full flow: createOrder → cancelOrder → order cancelled
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { MockOrderRepository } from '@/repositories/mock/MockOrderRepository'
import { validateCartItems } from '@/lib/validateCartItems'
import type { CartItem } from '@/types/cart'
import type { Book } from '@/types/book'

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = 'test-user-flow'

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Test Book',
    author_name: 'Author',
    author_bio: null,
    author_avatar_url: null,
    publisher_id: null,
    description: 'A test book',
    cover_url: 'https://example.com/cover.jpg',
    format: 'paperback',
    language: 'English',
    price: 299,
    original_price: null,
    copies_sold: 0,
    average_rating: 0,
    is_bestseller: false,
    is_new_launch: false,
    created_at: '2024-01-01T00:00:00Z',
    categories: [],
    ...overrides,
  }
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'ci-1',
    cart_id: 'cart-1',
    book_id: 'book-1',
    quantity: 1,
    book: makeBook(),
    ...overrides,
  }
}

function validOrderPayload() {
  return {
    address: {
      first_name: 'Ravi', last_name: 'Kumar',
      email: 'ravi@example.com', phone: '9876543210',
      address_line: '42 MG Road', city: 'Bengaluru',
      state: 'Karnataka', country: 'India', pin: '560001',
    },
    coupon: null,
    rewardPointsRedeemed: 0,
    items: [
      { book_id: 'book-1', title: 'Test Book', cover_url: 'cover.jpg', price: 299, quantity: 1 },
      { book_id: 'book-2', title: 'Another Book', cover_url: 'cover2.jpg', price: 149, quantity: 2 },
    ],
  }
}

// ── validateCartItems ─────────────────────────────────────────────────────────

describe('validateCartItems', () => {
  it('returns no errors for a valid cart', () => {
    const items = [makeCartItem(), makeCartItem({ id: 'ci-2', book_id: 'book-2', book: makeBook({ id: 'book-2', price: 149 }) })]
    const errors = validateCartItems(items)
    expect(errors).toHaveLength(0)
  })

  it('returns an error for an item whose book is missing (null)', () => {
    const items = [makeCartItem({ book: undefined })]
    const errors = validateCartItems(items)
    expect(errors).toHaveLength(1)
    expect(errors[0].book_id).toBe('book-1')
    expect(errors[0].message).toMatch(/no longer available/)
  })

  it('returns errors for multiple missing books', () => {
    const items = [
      makeCartItem({ id: 'ci-1', book_id: 'b1', book: undefined }),
      makeCartItem({ id: 'ci-2', book_id: 'b2', book: undefined }),
    ]
    const errors = validateCartItems(items)
    expect(errors).toHaveLength(2)
  })

  it('returns an error for a book with zero price', () => {
    const items = [makeCartItem({ book: makeBook({ price: 0 }) })]
    const errors = validateCartItems(items)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/invalid price/)
  })

  it('returns an error for a book with negative price', () => {
    const items = [makeCartItem({ book: makeBook({ price: -10 }) })]
    const errors = validateCartItems(items)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/invalid price/)
  })

  it('returns no error for a book with a positive price', () => {
    const items = [makeCartItem({ book: makeBook({ price: 0.01 }) })]
    const errors = validateCartItems(items)
    expect(errors).toHaveLength(0)
  })

  it('returns title in error for an invalid-price book', () => {
    const items = [makeCartItem({ book: makeBook({ title: 'Bad Book', price: 0 }) })]
    const errors = validateCartItems(items)
    expect(errors[0].title).toBe('Bad Book')
  })

  it('returns empty title for a missing book', () => {
    const items = [makeCartItem({ book: undefined })]
    const errors = validateCartItems(items)
    expect(errors[0].title).toBe('')
  })
})

// ── MockOrderRepository — createOrder ────────────────────────────────────────

describe('MockOrderRepository — createOrder', () => {
  let repo: MockOrderRepository

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  it('creates an order with status pending', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    expect(order.status).toBe('pending')
  })

  it('returns an order with a generated id', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    expect(order.id).toBeTruthy()
    expect(typeof order.id).toBe('string')
  })

  it('snapshots item prices — total is computed server-side', async () => {
    // items: 299*1 + 149*2 = 597
    const order = await repo.createOrder(USER, validOrderPayload())
    expect(order.subtotal).toBe(597)
  })

  it('snapshots item titles in order_items', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const titles = (order.items ?? []).map((i) => i.title)
    expect(titles).toContain('Test Book')
    expect(titles).toContain('Another Book')
  })

  it('snapshots item prices in order_items', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const item = (order.items ?? []).find((i) => i.book_id === 'book-2')
    expect(item?.price).toBe(149)
  })

  it('calculates tax on the subtotal after coupon discount', async () => {
    const coupon = {
      id: 'c1', code: 'SAVE100', discount_type: 'flat' as const,
      discount_value: 100, min_order_value: null,
      expires_at: null, is_active: true,
    }
    const order = await repo.createOrder(USER, { ...validOrderPayload(), coupon })
    // subtotal=597, discount=100, discountedSubtotal=497
    // tax = 497 * 0.12 = 59.64
    expect(order.discount).toBe(100)
    expect(order.tax).toBeCloseTo(59.64, 1)
  })

  it('stores shipping address snapshot', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    expect(order.shipping_address.city).toBe('Bengaluru')
    expect(order.shipping_address.pin).toBe('560001')
  })

  it('sets user_id correctly', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    expect(order.user_id).toBe(USER)
  })

  it('getOrder returns null for a different user', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const result = await repo.getOrder(order.id, 'other-user')
    expect(result).toBeNull()
  })
})

// ── MockOrderRepository — full flow: success ─────────────────────────────────

describe('MockOrderRepository — full success flow', () => {
  let repo: MockOrderRepository

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  it('order status becomes confirmed after successful payment', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    expect(order.status).toBe('pending')

    const payment = await repo.confirmPayment(order.id, USER, 'upi', order.total, 'success')
    expect(payment.status).toBe('success')

    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('confirmed')
  })

  it('payment record contains correct order_id and amount', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const payment = await repo.confirmPayment(order.id, USER, 'wallet', order.total)
    expect(payment.order_id).toBe(order.id)
    expect(payment.amount).toBe(order.total)
    expect(payment.method).toBe('wallet')
  })

  it('payment created_at is a valid ISO timestamp', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const payment = await repo.confirmPayment(order.id, USER, 'wallet', order.total)
    expect(() => new Date(payment.created_at)).not.toThrow()
    expect(new Date(payment.created_at).getFullYear()).toBeGreaterThan(2020)
  })
})

// ── MockOrderRepository — full flow: payment failure ─────────────────────────

describe('MockOrderRepository — payment failure flow', () => {
  let repo: MockOrderRepository

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  it('order remains pending after failed payment', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    await repo.confirmPayment(order.id, USER, 'credit_card', order.total, 'failure')
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('pending')
  })

  it('failed payment record has status failed', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const payment = await repo.confirmPayment(order.id, USER, 'credit_card', order.total, 'failure')
    expect(payment.status).toBe('failed')
  })

  it('order can be confirmed after a previous failure', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    // First attempt fails
    await repo.confirmPayment(order.id, USER, 'credit_card', order.total, 'failure')
    // Retry succeeds
    await repo.confirmPayment(order.id, USER, 'upi', order.total, 'success')
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('confirmed')
  })
})

// ── MockOrderRepository — idempotency key pass-through ────────────────────────

describe('MockOrderRepository — idempotency key', () => {
  let repo: MockOrderRepository

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  it('accepts an idempotencyKey parameter without error', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const key = crypto.randomUUID()
    const payment = await repo.confirmPayment(order.id, USER, 'wallet', order.total, 'success', key)
    expect(payment.status).toBe('success')
  })

  it('accepts undefined idempotencyKey without error', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const payment = await repo.confirmPayment(order.id, USER, 'wallet', order.total, 'success', undefined)
    expect(payment.status).toBe('success')
  })
})

// ── MockOrderRepository — cancel flow ────────────────────────────────────────

describe('MockOrderRepository — cancel flow', () => {
  let repo: MockOrderRepository

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  it('order status becomes cancelled after cancelOrder', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    await repo.cancelOrder(order.id, USER)
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('cancelled')
  })

  it('cancelOrder by different user does not cancel the order', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    await repo.cancelOrder(order.id, 'attacker')
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('pending')
  })

  it('cancelOrder on non-existent order is a no-op', async () => {
    await expect(repo.cancelOrder('ghost-id', USER)).resolves.toBeUndefined()
  })
})
