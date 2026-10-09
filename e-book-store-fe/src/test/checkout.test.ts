/**
 * checkout.test.ts — Unit tests for checkout validation and order repository.
 *
 * Tests:
 *  - validateAddressForm() — all field rules
 *  - MockOrderRepository — createOrder, getOrder, confirmPayment
 *  - MockAddressRepository — CRUD, setDefault
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { validateAddressForm } from '@/lib/validateAddress'
import { MockOrderRepository } from '@/repositories/mock/MockOrderRepository'
import { MockAddressRepository } from '@/repositories/mock/MockAddressRepository'
import type { ShippingAddressSnapshot } from '@/types/order'

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = 'test-user-1'

function validAddress(): ShippingAddressSnapshot {
  return {
    first_name: 'Ravi',
    last_name: 'Kumar',
    email: 'ravi@example.com',
    phone: '9876543210',
    address_line: '42 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pin: '560001',
  }
}

function validOrderPayload(overrides?: Partial<Parameters<MockOrderRepository['createOrder']>[1]>) {
  return {
    address: validAddress(),
    coupon: null,
    rewardPointsRedeemed: 0,
    items: [
      { book_id: 'b1', title: 'Book One', cover_url: '', price: 149, quantity: 1 },
      { book_id: 'b2', title: 'Book Two', cover_url: '', price: 359, quantity: 2 },
    ],
    ...overrides,
  }
}

// ── validateAddressForm ───────────────────────────────────────────────────────

describe('validateAddressForm', () => {
  it('returns no errors for a fully valid address', () => {
    const errors = validateAddressForm(validAddress())
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('returns required error for each empty field', () => {
    const errors = validateAddressForm({})
    const requiredFields: Array<keyof ShippingAddressSnapshot> = [
      'first_name', 'last_name', 'address_line', 'email', 'phone', 'city', 'pin', 'state', 'country',
    ]
    for (const field of requiredFields) {
      expect(errors[field]).toBe('This field is required.')
    }
  })

  it('returns email format error for an invalid email', () => {
    const errors = validateAddressForm({ ...validAddress(), email: 'not-an-email' })
    expect(errors.email).toBe('Enter a valid email address.')
  })

  it('accepts a valid email format', () => {
    const errors = validateAddressForm({ ...validAddress(), email: 'user@domain.co.in' })
    expect(errors.email).toBeUndefined()
  })

  it('returns pin error for a non-6-digit pin', () => {
    const errors = validateAddressForm({ ...validAddress(), pin: '12345' })
    expect(errors.pin).toBe('PIN must be exactly 6 digits.')
  })

  it('returns pin error for non-numeric pin', () => {
    const errors = validateAddressForm({ ...validAddress(), pin: '56001A' })
    expect(errors.pin).toBe('PIN must be exactly 6 digits.')
  })

  it('accepts a valid 6-digit pin', () => {
    const errors = validateAddressForm({ ...validAddress(), pin: '560001' })
    expect(errors.pin).toBeUndefined()
  })

  it('returns phone error for a non-10-digit phone', () => {
    const errors = validateAddressForm({ ...validAddress(), phone: '98765' })
    expect(errors.phone).toBe('Phone must be exactly 10 digits.')
  })

  it('returns phone error for non-numeric phone', () => {
    const errors = validateAddressForm({ ...validAddress(), phone: '98765abcde' })
    expect(errors.phone).toBe('Phone must be exactly 10 digits.')
  })

  it('accepts a valid 10-digit phone', () => {
    const errors = validateAddressForm({ ...validAddress(), phone: '9876543210' })
    expect(errors.phone).toBeUndefined()
  })

  it('returns required error for whitespace-only fields', () => {
    const errors = validateAddressForm({ ...validAddress(), first_name: '   ' })
    expect(errors.first_name).toBe('This field is required.')
  })

  it('does not return format error when field is empty (required takes priority)', () => {
    const errors = validateAddressForm({ ...validAddress(), email: '' })
    expect(errors.email).toBe('This field is required.')
    // Should not also report format error
    expect(errors.email).not.toBe('Enter a valid email address.')
  })
})

// ── MockOrderRepository ───────────────────────────────────────────────────────

describe('MockOrderRepository', () => {
  let repo: MockOrderRepository

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  it('creates an order and returns it with the correct totals', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    // subtotal = 149*1 + 359*2 = 149 + 718 = 867
    expect(order.subtotal).toBe(867)
    expect(order.discount).toBe(0)
    expect(order.reward_points_redeemed).toBe(0)
    // tax = 867 * 0.12 = 104.04
    expect(order.tax).toBe(104.04)
    expect(order.total).toBeCloseTo(971.04, 1)
  })

  it('applies coupon discount when creating an order', async () => {
    const coupon = {
      id: 'c1', code: 'SAVE100', discount_type: 'flat' as const,
      discount_value: 100, min_order_value: null,
      expires_at: null, is_active: true,
    }
    const order = await repo.createOrder(USER, validOrderPayload({ coupon }))
    expect(order.discount).toBe(100)
    expect(order.subtotal).toBe(867)
    // discountedSubtotal = 767, tax = 767*0.12 = 92.04
    expect(order.tax).toBeCloseTo(92.04, 1)
    expect(order.total).toBeCloseTo(859.04, 1)
  })

  it('applies reward points when creating an order', async () => {
    const order = await repo.createOrder(USER, validOrderPayload({ rewardPointsRedeemed: 50 }))
    // subtotal=867, no coupon, discountedSubtotal=867, points=50
    // taxBase=817, tax=817*0.12=98.04
    expect(order.reward_points_redeemed).toBe(50)
    expect(order.tax).toBeCloseTo(98.04, 1)
    expect(order.total).toBeCloseTo(915.04, 1)
  })

  it('returns the order by id for the correct user', async () => {
    const created = await repo.createOrder(USER, validOrderPayload())
    const fetched = await repo.getOrder(created.id, USER)
    expect(fetched).not.toBeNull()
    expect(fetched?.id).toBe(created.id)
  })

  it('returns null for a non-existent order', async () => {
    const result = await repo.getOrder('non-existent-id', USER)
    expect(result).toBeNull()
  })

  it('returns null for an order belonging to a different user', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const result = await repo.getOrder(order.id, 'other-user')
    expect(result).toBeNull()
  })

  it('confirmPayment creates a payment with success status', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    const payment = await repo.confirmPayment(order.id, USER, 'upi', order.total)
    expect(payment.status).toBe('success')
    expect(payment.method).toBe('upi')
    expect(payment.amount).toBe(order.total)
    expect(payment.order_id).toBe(order.id)
  })

  it('order status becomes confirmed after payment', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    await repo.confirmPayment(order.id, USER, 'upi', order.total)
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('confirmed')
  })

  it('created order contains item snapshots', async () => {
    const order = await repo.createOrder(USER, validOrderPayload())
    expect(order.items).toHaveLength(2)
    expect(order.items?.[0].title).toBe('Book One')
    expect(order.items?.[1].price).toBe(359)
  })
})

// ── MockAddressRepository ─────────────────────────────────────────────────────

describe('MockAddressRepository', () => {
  let repo: MockAddressRepository

  beforeEach(() => {
    repo = new MockAddressRepository()
  })

  it('returns seeded addresses for a new user', async () => {
    const addresses = await repo.getAddresses(USER)
    expect(addresses.length).toBeGreaterThanOrEqual(1)
  })

  it('exactly one address is default', async () => {
    const addresses = await repo.getAddresses(USER)
    const defaults = addresses.filter((a) => a.is_default)
    expect(defaults).toHaveLength(1)
  })

  it('creates a new address for the user', async () => {
    const before = await repo.getAddresses(USER)
    await repo.createAddress(USER, {
      first_name: 'New', last_name: 'User', email: 'new@ex.com',
      phone: '1234567890', address_line: '1 Street', city: 'Mumbai',
      state: 'MH', country: 'India', pin: '400001', is_default: false,
    })
    const after = await repo.getAddresses(USER)
    expect(after).toHaveLength(before.length + 1)
  })

  it('setDefault makes the target address default and clears others', async () => {
    const addresses = await repo.getAddresses(USER)
    const nonDefault = addresses.find((a) => !a.is_default)
    if (!nonDefault) return // skip if only one address

    await repo.setDefault(nonDefault.id, USER)
    const updated = await repo.getAddresses(USER)
    expect(updated.find((a) => a.id === nonDefault.id)?.is_default).toBe(true)
    const otherDefaults = updated.filter((a) => a.is_default && a.id !== nonDefault.id)
    expect(otherDefaults).toHaveLength(0)
  })

  it('createAddress with is_default=true replaces existing default', async () => {
    await repo.createAddress(USER, {
      first_name: 'Default', last_name: 'New', email: 'd@ex.com',
      phone: '9999999999', address_line: '99 Road', city: 'Delhi',
      state: 'DL', country: 'India', pin: '110001', is_default: true,
    })
    const addresses = await repo.getAddresses(USER)
    const defaults = addresses.filter((a) => a.is_default)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].first_name).toBe('Default')
  })
})
