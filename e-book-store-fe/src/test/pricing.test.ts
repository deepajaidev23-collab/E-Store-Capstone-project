import { describe, it, expect } from 'vitest'
import {
  calcSubtotal,
  calcTax,
  calcDiscount,
  calcBreakdown,
  calcRewardPointsDiscount,
  formatPrice,
  formatPriceDecimal,
  TAX_RATE,
} from '@/lib/pricing'
import type { CartItem } from '@/types/cart'
import type { Coupon } from '@/types/cart'

// ── Backward-compatible inline tests (original 3 — do not remove) ─────────────

describe('price utilities', () => {
  it('formats a numeric price to two decimal places', () => {
    const format = (n: number) => n.toFixed(2)
    expect(format(149)).toBe('149.00')
    expect(format(99.9)).toBe('99.90')
    expect(format(1000)).toBe('1000.00')
  })

  it('computes a flat coupon discount correctly', () => {
    const applyFlat = (total: number, discount: number) =>
      Math.max(0, total - discount)
    expect(applyFlat(508, 100)).toBe(408)
    expect(applyFlat(50, 100)).toBe(0)
  })

  it('computes a percent coupon discount correctly', () => {
    const applyPercent = (total: number, pct: number) =>
      parseFloat((total * (1 - pct / 100)).toFixed(2))
    expect(applyPercent(500, 10)).toBe(450)
    expect(applyPercent(200, 25)).toBe(150)
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeItem(id: string, price: number, qty = 1): CartItem {
  return {
    id,
    cart_id: 'cart-1',
    book_id: `book-${id}`,
    quantity: qty,
    book: {
      id: `book-${id}`,
      title: `Book ${id}`,
      author_name: 'Author',
      author_bio: null,
      author_avatar_url: null,
      publisher_id: null,
      description: '',
      cover_url: '',
      format: 'paperback',
      language: 'English',
      price,
      original_price: null,
      copies_sold: 0,
      average_rating: 0,
      is_bestseller: false,
      is_new_launch: false,
      created_at: '2024-01-01T00:00:00Z',
      categories: [],
    },
  }
}

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'c1',
    code: 'TEST10',
    discount_type: 'flat',
    discount_value: 100,
    min_order_value: null,
    expires_at: null,
    is_active: true,
    ...overrides,
  }
}

// ── calcSubtotal ──────────────────────────────────────────────────────────────

describe('calcSubtotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(calcSubtotal([])).toBe(0)
  })

  it('returns the price of a single item with quantity 1', () => {
    expect(calcSubtotal([makeItem('a', 149)])).toBe(149)
  })

  it('multiplies price × quantity', () => {
    expect(calcSubtotal([makeItem('a', 100, 3)])).toBe(300)
  })

  it('sums multiple items correctly', () => {
    expect(calcSubtotal([makeItem('a', 149), makeItem('b', 359)])).toBe(508)
  })

  it('sums multiple items with mixed quantities', () => {
    expect(calcSubtotal([makeItem('a', 100, 2), makeItem('b', 50, 3)])).toBe(350)
  })

  it('skips items without an embedded book (price unknown)', () => {
    const noBook: CartItem = { id: 'x', cart_id: 'c', book_id: 'bx', quantity: 2 }
    expect(calcSubtotal([makeItem('a', 100), noBook])).toBe(100)
  })
})

// ── calcTax ───────────────────────────────────────────────────────────────────

describe('calcTax', () => {
  it('applies TAX_RATE to the discounted subtotal', () => {
    expect(calcTax(100)).toBe(parseFloat((100 * TAX_RATE).toFixed(2)))
  })

  it('returns 0 for a 0 subtotal', () => {
    expect(calcTax(0)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    // 508 * 0.12 = 60.96
    expect(calcTax(508)).toBe(60.96)
  })

  it('handles fractional subtotals', () => {
    expect(calcTax(99.99)).toBe(parseFloat((99.99 * TAX_RATE).toFixed(2)))
  })
})

// ── calcDiscount ──────────────────────────────────────────────────────────────

describe('calcDiscount', () => {
  it('returns 0 when coupon is null', () => {
    expect(calcDiscount(500, null)).toBe(0)
  })

  it('returns 0 when coupon is inactive', () => {
    expect(calcDiscount(500, makeCoupon({ is_active: false }))).toBe(0)
  })

  it('returns 0 when subtotal is below min_order_value', () => {
    expect(calcDiscount(99, makeCoupon({ min_order_value: 200 }))).toBe(0)
  })

  it('applies flat discount when subtotal meets min_order_value exactly', () => {
    expect(calcDiscount(200, makeCoupon({ discount_value: 50, min_order_value: 200 }))).toBe(50)
  })

  it('applies flat discount correctly', () => {
    expect(calcDiscount(508, makeCoupon({ discount_value: 100 }))).toBe(100)
  })

  it('caps flat discount at subtotal (never negative)', () => {
    expect(calcDiscount(50, makeCoupon({ discount_value: 100 }))).toBe(50)
  })

  it('applies percent discount correctly', () => {
    expect(calcDiscount(500, makeCoupon({ discount_type: 'percent', discount_value: 10 }))).toBe(50)
  })

  it('applies 25% percent discount', () => {
    expect(calcDiscount(200, makeCoupon({ discount_type: 'percent', discount_value: 25 }))).toBe(50)
  })

  it('rounds percent discount to 2 decimal places', () => {
    // 333 * 10% = 33.30
    expect(calcDiscount(333, makeCoupon({ discount_type: 'percent', discount_value: 10 }))).toBe(33.30)
  })
})

// ── calcBreakdown ─────────────────────────────────────────────────────────────

describe('calcBreakdown', () => {
  it('returns zero breakdown for an empty cart', () => {
    const result = calcBreakdown([])
    expect(result.subtotal).toBe(0)
    expect(result.discount).toBe(0)
    expect(result.total).toBe(0)
    expect(result.itemCount).toBe(0)
  })

  it('calculates a correct breakdown without coupon', () => {
    const items = [makeItem('a', 149), makeItem('b', 359)]
    const result = calcBreakdown(items, null)
    expect(result.subtotal).toBe(508)
    expect(result.discount).toBe(0)
    expect(result.discountedSubtotal).toBe(508)
    expect(result.tax).toBe(60.96)           // 508 * 0.12
    expect(result.total).toBe(568.96)        // 508 + 60.96
    expect(result.itemCount).toBe(2)
  })

  it('calculates a correct breakdown with a flat coupon', () => {
    const items = [makeItem('a', 149), makeItem('b', 359)]
    const coupon = makeCoupon({ discount_value: 100 })
    const result = calcBreakdown(items, coupon)
    expect(result.subtotal).toBe(508)
    expect(result.discount).toBe(100)
    expect(result.discountedSubtotal).toBe(408)
    expect(result.tax).toBe(48.96)           // 408 * 0.12
    expect(result.total).toBe(456.96)        // 408 + 48.96
  })

  it('calculates a correct breakdown with a percent coupon', () => {
    const items = [makeItem('a', 500)]
    const coupon = makeCoupon({ discount_type: 'percent', discount_value: 10 })
    const result = calcBreakdown(items, coupon)
    expect(result.subtotal).toBe(500)
    expect(result.discount).toBe(50)
    expect(result.discountedSubtotal).toBe(450)
    expect(result.tax).toBe(54)              // 450 * 0.12
    expect(result.total).toBe(504)
  })

  it('counts itemCount as sum of quantities', () => {
    const items = [makeItem('a', 100, 2), makeItem('b', 50, 3)]
    expect(calcBreakdown(items).itemCount).toBe(5)
  })

  it('total is never less than 0 even with excessive discount', () => {
    const items = [makeItem('a', 50)]
    const coupon = makeCoupon({ discount_value: 200 })
    const result = calcBreakdown(items, coupon)
    expect(result.discountedSubtotal).toBe(0)
    expect(result.total).toBeGreaterThanOrEqual(0)
  })
})

// ── formatPrice ───────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats 149 as ₹149', () => {
    expect(formatPrice(149)).toBe('₹149')
  })

  it('rounds fractional paise', () => {
    expect(formatPrice(99.9)).toBe('₹100')
  })

  it('formats 0 as ₹0', () => {
    expect(formatPrice(0)).toBe('₹0')
  })

  it('formats large values', () => {
    expect(formatPrice(1999)).toBe('₹1999')
  })
})

// ── formatPriceDecimal ────────────────────────────────────────────────────────

describe('formatPriceDecimal', () => {
  it('formats 60.96 as ₹60.96', () => {
    expect(formatPriceDecimal(60.96)).toBe('₹60.96')
  })

  it('formats whole numbers with .00', () => {
    expect(formatPriceDecimal(100)).toBe('₹100.00')
  })
})

// ── calcRewardPointsDiscount ──────────────────────────────────────────────────

describe('calcRewardPointsDiscount', () => {
  it('returns 0 when availablePoints is 0', () => {
    expect(calcRewardPointsDiscount(0, 500)).toBe(0)
  })

  it('returns 0 when discountedSubtotal is 0', () => {
    expect(calcRewardPointsDiscount(100, 0)).toBe(0)
  })

  it('returns availablePoints when below discountedSubtotal', () => {
    expect(calcRewardPointsDiscount(50, 500)).toBe(50)
  })

  it('caps at floor of discountedSubtotal when points exceed it', () => {
    expect(calcRewardPointsDiscount(600, 408)).toBe(408)
  })

  it('caps at floor when discountedSubtotal is fractional', () => {
    // discountedSubtotal = 456.96 → floor = 456; availablePoints = 1000 → clamp to 456
    expect(calcRewardPointsDiscount(1000, 456.96)).toBe(456)
  })

  it('uses exact available points when they equal discountedSubtotal', () => {
    expect(calcRewardPointsDiscount(100, 100)).toBe(100)
  })

  it('returns 0 for negative availablePoints', () => {
    expect(calcRewardPointsDiscount(-10, 500)).toBe(0)
  })
})

// ── calcBreakdown with reward points ──────────────────────────────────────────

describe('calcBreakdown with reward points', () => {
  it('backward-compatible: rewardPointsDiscount is 0 when omitted', () => {
    const items = [makeItem('a', 149), makeItem('b', 359)]
    const result = calcBreakdown(items)
    expect(result.rewardPointsDiscount).toBe(0)
    expect(result.subtotal).toBe(508)
    expect(result.total).toBe(568.96)
  })

  it('applies reward points after coupon discount', () => {
    const items = [makeItem('a', 500)]
    // subtotal=500, no coupon, discountedSubtotal=500, rewardPoints=100
    // taxBase=400, tax=48, total=448
    const result = calcBreakdown(items, null, 100)
    expect(result.subtotal).toBe(500)
    expect(result.discount).toBe(0)
    expect(result.discountedSubtotal).toBe(500)
    expect(result.rewardPointsDiscount).toBe(100)
    expect(result.tax).toBe(parseFloat((400 * TAX_RATE).toFixed(2)))
    expect(result.total).toBe(parseFloat((400 + 400 * TAX_RATE).toFixed(2)))
  })

  it('applies coupon first, then reward points', () => {
    const items = [makeItem('a', 508)]
    const coupon = makeCoupon({ discount_value: 100 })
    // subtotal=508, couponDiscount=100, discountedSubtotal=408, rewardPoints=50
    // taxBase=358, tax=43.08 (358*0.12), total=401.08 (358+43.08)
    const result = calcBreakdown(items, coupon, 50)
    expect(result.subtotal).toBe(508)
    expect(result.discount).toBe(100)
    expect(result.discountedSubtotal).toBe(408)
    expect(result.rewardPointsDiscount).toBe(50)
    expect(result.tax).toBe(parseFloat((358 * TAX_RATE).toFixed(2)))
    expect(result.total).toBe(parseFloat((358 + 358 * TAX_RATE).toFixed(2)))
  })

  it('clamps reward points to floor of discountedSubtotal', () => {
    const items = [makeItem('a', 50)]
    // discountedSubtotal = 50, rewardPoints=200 → clamp to 50
    // taxBase=0, tax=0, total=0
    const result = calcBreakdown(items, null, 200)
    expect(result.rewardPointsDiscount).toBe(50)
    expect(result.total).toBe(0)
  })

  it('total is 0 when reward points cover the entire discounted subtotal', () => {
    const items = [makeItem('a', 100)]
    const result = calcBreakdown(items, null, 100)
    expect(result.rewardPointsDiscount).toBe(100)
    expect(result.tax).toBe(0)
    expect(result.total).toBe(0)
  })
})
