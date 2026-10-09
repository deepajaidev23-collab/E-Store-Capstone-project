/**
 * pricing.ts — Pure, testable price calculation functions.
 *
 * All cart math lives here so it is decoupled from React/JSX and can be
 * exercised exhaustively in unit tests without rendering anything.
 *
 * TAX_RATE  = 12% GST (flat across all book formats for simplicity)
 * MAX_DISCOUNT_PCT = 100  (a coupon can never make the total negative)
 */

import type { CartItem } from '@/types/cart'
import type { Coupon } from '@/types/cart'

export const TAX_RATE = 0.12 // 12 %

// ── Primitives ────────────────────────────────────────────────────────────────

/**
 * Subtotal = sum of (item.book.price × item.quantity) across all items.
 * Items without an embedded book are skipped (price unknown).
 */
export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const price = item.book?.price ?? 0
    return sum + price * item.quantity
  }, 0)
}

/**
 * Tax amount based on the subtotal AFTER discount.
 * We apply tax on the discounted value so coupons reduce the tax base.
 */
export function calcTax(discountedSubtotal: number): number {
  return parseFloat((discountedSubtotal * TAX_RATE).toFixed(2))
}

/**
 * Discount amount for the given coupon.
 * Returns 0 when:
 *  - coupon is null / inactive
 *  - subtotal is below min_order_value
 * Caps the flat discount at the subtotal so the result is never negative.
 */
export function calcDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon || !coupon.is_active) return 0
  if (coupon.min_order_value !== null && subtotal < coupon.min_order_value) return 0

  if (coupon.discount_type === 'flat') {
    return Math.min(coupon.discount_value, subtotal)
  }
  // percent
  const raw = subtotal * (coupon.discount_value / 100)
  return parseFloat(raw.toFixed(2))
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

export interface PriceBreakdown {
  subtotal: number            // before discount, before tax
  discount: number            // amount saved by coupon
  discountedSubtotal: number  // subtotal − discount
  rewardPointsDiscount: number // reward points applied (1 pt = ₹1)
  tax: number                 // GST on (discountedSubtotal − rewardPointsDiscount)
  total: number               // taxBase + tax
  itemCount: number           // total number of book units (sum of quantities)
}

/**
 * Returns the amount to deduct for reward points redemption.
 * Rule: 1 point = ₹1. Capped at:
 *   - the user's available balance
 *   - the floor of the after-coupon subtotal (total cannot go below 0)
 */
export function calcRewardPointsDiscount(
  availablePoints: number,
  discountedSubtotal: number,
): number {
  if (availablePoints <= 0 || discountedSubtotal <= 0) return 0
  return Math.min(availablePoints, Math.floor(discountedSubtotal))
}

/**
 * Full price breakdown for the cart.
 * All values are rounded to 2 decimal places.
 *
 * rewardPoints — number of points to redeem (default 0).
 *   The function clamps this to the valid range; callers may pass raw input.
 */
export function calcBreakdown(
  items: CartItem[],
  coupon: Coupon | null = null,
  rewardPoints = 0,
): PriceBreakdown {
  const subtotal = parseFloat(calcSubtotal(items).toFixed(2))
  const discount = calcDiscount(subtotal, coupon)
  const discountedSubtotal = parseFloat(Math.max(0, subtotal - discount).toFixed(2))
  const rewardPointsDiscount = calcRewardPointsDiscount(rewardPoints, discountedSubtotal)
  const taxBase = parseFloat(Math.max(0, discountedSubtotal - rewardPointsDiscount).toFixed(2))
  const tax = calcTax(taxBase)
  const total = parseFloat((taxBase + tax).toFixed(2))
  const itemCount = items.reduce((n, i) => n + i.quantity, 0)

  return { subtotal, discount, discountedSubtotal, rewardPointsDiscount, tax, total, itemCount }
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Format a numeric price in INR (₹) with no decimal places.
 * e.g. 149.0 → "₹149"
 */
export function formatPrice(value: number): string {
  return `₹${Math.round(value)}`
}

/**
 * Format with 2 decimal places — used for tax / breakdown lines.
 * e.g. 17.88 → "₹17.88"
 */
export function formatPriceDecimal(value: number): string {
  return `₹${value.toFixed(2)}`
}
