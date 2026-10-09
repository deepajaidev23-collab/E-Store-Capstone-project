/**
 * payment.test.ts — Unit tests for the payment simulation feature.
 *
 * Tests:
 *  - simulatePayment() — success and failure paths for all four methods
 *  - validatePaymentFields() — card, UPI, wallet validation
 *  - MockOrderRepository — failure outcome, cancellation, success preserved
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  simulatePayment,
  FAILURE_CARD_NUMBER,
  FAILURE_UPI_ID,
} from '@/lib/paymentSimulator'
import type { CardPaymentFields, UpiPaymentFields } from '@/lib/paymentSimulator'
import { validatePaymentFields } from '@/lib/validatePayment'
import { MockOrderRepository } from '@/repositories/mock/MockOrderRepository'

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = 'test-user-pay'

function validCard(overrides: Partial<CardPaymentFields> = {}): CardPaymentFields {
  return {
    card_number: '4111111111111111',
    name_on_card: 'Test User',
    cvv: '123',
    expiry: '12/2099',
    ...overrides,
  }
}

function validUpi(overrides: Partial<UpiPaymentFields> = {}): UpiPaymentFields {
  return { upi_id: 'user@okicici', ...overrides }
}

async function createTestOrder(repo: MockOrderRepository) {
  return repo.createOrder(USER, {
    address: {
      first_name: 'Test', last_name: 'User', email: 'test@ex.com',
      phone: '9876543210', address_line: '1 Road',
      city: 'Mumbai', state: 'MH', country: 'India', pin: '400001',
    },
    coupon: null,
    rewardPointsRedeemed: 0,
    items: [{ book_id: 'b1', title: 'Book', cover_url: '', price: 300, quantity: 1 }],
  })
}

// ── simulatePayment ───────────────────────────────────────────────────────────

describe('simulatePayment — credit_card', () => {
  it('succeeds with a normal card number', () => {
    const r = simulatePayment('credit_card', validCard())
    expect(r.outcome).toBe('success')
    expect(r.reason).toBeUndefined()
  })

  it('fails when card number is the failure trigger (raw digits)', () => {
    const r = simulatePayment('credit_card', validCard({ card_number: FAILURE_CARD_NUMBER }))
    expect(r.outcome).toBe('failure')
    expect(r.reason).toContain(FAILURE_CARD_NUMBER)
  })

  it('fails when card number has dashes but matches trigger digits', () => {
    const formatted = '4000-0000-0000-0002'
    const r = simulatePayment('credit_card', validCard({ card_number: formatted }))
    expect(r.outcome).toBe('failure')
  })

  it('fails when card number has spaces but matches trigger digits', () => {
    const spaced = '4000 0000 0000 0002'
    const r = simulatePayment('credit_card', validCard({ card_number: spaced }))
    expect(r.outcome).toBe('failure')
  })
})

describe('simulatePayment — debit_card', () => {
  it('succeeds with a normal card number', () => {
    const r = simulatePayment('debit_card', validCard())
    expect(r.outcome).toBe('success')
  })

  it('fails with the failure trigger card number', () => {
    const r = simulatePayment('debit_card', validCard({ card_number: FAILURE_CARD_NUMBER }))
    expect(r.outcome).toBe('failure')
  })
})

describe('simulatePayment — upi', () => {
  it('succeeds with a normal UPI ID', () => {
    const r = simulatePayment('upi', validUpi())
    expect(r.outcome).toBe('success')
  })

  it('fails with the failure UPI ID (exact match)', () => {
    const r = simulatePayment('upi', validUpi({ upi_id: FAILURE_UPI_ID }))
    expect(r.outcome).toBe('failure')
    expect(r.reason).toContain(FAILURE_UPI_ID)
  })

  it('fails with the failure UPI ID (uppercase — case-insensitive)', () => {
    const r = simulatePayment('upi', validUpi({ upi_id: FAILURE_UPI_ID.toUpperCase() }))
    expect(r.outcome).toBe('failure')
  })

  it('fails with the failure UPI ID surrounded by whitespace', () => {
    const r = simulatePayment('upi', validUpi({ upi_id: `  ${FAILURE_UPI_ID}  ` }))
    expect(r.outcome).toBe('failure')
  })
})

describe('simulatePayment — wallet', () => {
  it('always succeeds', () => {
    const r = simulatePayment('wallet', {})
    expect(r.outcome).toBe('success')
    expect(r.reason).toBeUndefined()
  })
})

// ── validatePaymentFields — card ──────────────────────────────────────────────

describe('validatePaymentFields — credit_card', () => {
  it('returns no errors for a fully valid card', () => {
    const e = validatePaymentFields('credit_card', validCard())
    expect(Object.keys(e)).toHaveLength(0)
  })

  it('requires card_number', () => {
    const e = validatePaymentFields('credit_card', validCard({ card_number: '' }))
    expect(e.card_number).toBe('Card number is required.')
  })

  it('rejects a card number with fewer than 16 digits', () => {
    const e = validatePaymentFields('credit_card', validCard({ card_number: '1234' }))
    expect(e.card_number).toBe('Card number must be 16 digits.')
  })

  it('accepts 16 digits with dashes', () => {
    const e = validatePaymentFields('credit_card', validCard({ card_number: '4111-1111-1111-1111' }))
    expect(e.card_number).toBeUndefined()
  })

  it('requires name_on_card', () => {
    const e = validatePaymentFields('credit_card', validCard({ name_on_card: '   ' }))
    expect(e.name_on_card).toBe('Name on card is required.')
  })

  it('requires CVV', () => {
    const e = validatePaymentFields('credit_card', validCard({ cvv: '' }))
    expect(e.cvv).toBe('CVV is required.')
  })

  it('rejects a non-3-digit CVV', () => {
    const e = validatePaymentFields('credit_card', validCard({ cvv: '12' }))
    expect(e.cvv).toBe('CVV must be 3 digits.')
  })

  it('rejects a non-numeric CVV', () => {
    const e = validatePaymentFields('credit_card', validCard({ cvv: 'abc' }))
    expect(e.cvv).toBe('CVV must be 3 digits.')
  })

  it('requires expiry', () => {
    const e = validatePaymentFields('credit_card', validCard({ expiry: '' }))
    expect(e.expiry).toBe('Expiry date is required.')
  })

  it('rejects expiry with wrong format', () => {
    const e = validatePaymentFields('credit_card', validCard({ expiry: '12-2099' }))
    expect(e.expiry).toBe('Use MM/YYYY format.')
  })

  it('rejects expiry with invalid month 13', () => {
    const e = validatePaymentFields('credit_card', validCard({ expiry: '13/2099' }))
    expect(e.expiry).toBe('Month must be between 01 and 12.')
  })

  it('rejects an expired card (past month)', () => {
    const e = validatePaymentFields('credit_card', validCard({ expiry: '01/2000' }))
    expect(e.expiry).toBe('Card has expired.')
  })

  it('accepts a card expiring this month', () => {
    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = String(now.getFullYear())
    const e = validatePaymentFields('credit_card', validCard({ expiry: `${mm}/${yyyy}` }))
    expect(e.expiry).toBeUndefined()
  })

  it('debit_card uses the same validation as credit_card', () => {
    const e = validatePaymentFields('debit_card', validCard({ card_number: '' }))
    expect(e.card_number).toBe('Card number is required.')
  })
})

// ── validatePaymentFields — UPI ───────────────────────────────────────────────

describe('validatePaymentFields — upi', () => {
  it('returns no errors for a valid UPI ID', () => {
    const e = validatePaymentFields('upi', validUpi())
    expect(Object.keys(e)).toHaveLength(0)
  })

  it('requires upi_id', () => {
    const e = validatePaymentFields('upi', validUpi({ upi_id: '' }))
    expect(e.upi_id).toBe('UPI ID is required.')
  })

  it('rejects a UPI ID without @', () => {
    const e = validatePaymentFields('upi', validUpi({ upi_id: 'noBankHandle' }))
    expect(e.upi_id).toMatch(/valid UPI ID/)
  })

  it('rejects a UPI ID that starts with @', () => {
    const e = validatePaymentFields('upi', validUpi({ upi_id: '@bankonly' }))
    expect(e.upi_id).toMatch(/valid UPI ID/)
  })

  it('rejects a UPI ID that ends with @', () => {
    const e = validatePaymentFields('upi', validUpi({ upi_id: 'useronly@' }))
    expect(e.upi_id).toMatch(/valid UPI ID/)
  })
})

// ── validatePaymentFields — wallet ────────────────────────────────────────────

describe('validatePaymentFields — wallet', () => {
  it('always returns empty errors (no fields to validate)', () => {
    const e = validatePaymentFields('wallet', {})
    expect(Object.keys(e)).toHaveLength(0)
  })
})

// ── MockOrderRepository — payment simulation ──────────────────────────────────

describe('MockOrderRepository — payment simulation', () => {
  let repo: MockOrderRepository

  beforeEach(() => {
    repo = new MockOrderRepository()
  })

  it('confirmPayment with success outcome creates a success payment', async () => {
    const order = await createTestOrder(repo)
    const payment = await repo.confirmPayment(order.id, USER, 'upi', order.total, 'success')
    expect(payment.status).toBe('success')
  })

  it('confirmPayment with success advances order status to confirmed', async () => {
    const order = await createTestOrder(repo)
    await repo.confirmPayment(order.id, USER, 'upi', order.total, 'success')
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('confirmed')
  })

  it('confirmPayment with failure outcome creates a failed payment', async () => {
    const order = await createTestOrder(repo)
    const payment = await repo.confirmPayment(order.id, USER, 'credit_card', order.total, 'failure')
    expect(payment.status).toBe('failed')
  })

  it('confirmPayment with failure leaves order status as pending', async () => {
    const order = await createTestOrder(repo)
    await repo.confirmPayment(order.id, USER, 'credit_card', order.total, 'failure')
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('pending')
  })

  it('confirmPayment defaults to success when simulatedOutcome is omitted', async () => {
    const order = await createTestOrder(repo)
    const payment = await repo.confirmPayment(order.id, USER, 'wallet', order.total)
    expect(payment.status).toBe('success')
  })

  it('cancelOrder sets order status to cancelled', async () => {
    const order = await createTestOrder(repo)
    await repo.cancelOrder(order.id, USER)
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('cancelled')
  })

  it('cancelOrder does not affect orders belonging to other users', async () => {
    const order = await createTestOrder(repo)
    await repo.cancelOrder(order.id, 'other-user')
    const updated = await repo.getOrder(order.id, USER)
    expect(updated?.status).toBe('pending')
  })

  it('cancelOrder on non-existent order is a no-op', async () => {
    await expect(repo.cancelOrder('non-existent', USER)).resolves.toBeUndefined()
  })
})
