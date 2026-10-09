/**
 * OrderRepository — contract for order creation and retrieval.
 *
 * Auth-gated: every method requires an authenticated user.
 *
 * Design decisions:
 * - createOrder accepts a server-trusted payload built from DB book prices.
 *   The caller (useCreateOrder hook) fetches fresh prices via cartRepository
 *   before calling here — we never trust client-supplied totals.
 * - confirmPayment inserts a payments row; the application treats this as the
 *   "successful payment" signal (no real payment processor in scope).
 */
import type { Order, OrderItem, Payment, PaymentMethod, ShippingAddressSnapshot } from '@/types/order'
import type { Coupon } from '@/types/cart'

export interface CreateOrderPayload {
  address: ShippingAddressSnapshot
  coupon: Coupon | null
  rewardPointsRedeemed: number
  /** Re-calculated server-side from fresh cart items */
  items: Array<{
    book_id: string
    title: string
    cover_url: string
    /** Price fetched from DB — never trust client value */
    price: number
    quantity: number
  }>
}

export interface OrderRepository {
  /**
   * Create an order with its line items in a single transaction.
   * The repository is responsible for computing price totals from the
   * items array — the caller must NOT pass pre-computed totals.
   */
  createOrder(userId: string, payload: CreateOrderPayload): Promise<Order>

  /**
   * Fetch all orders for a user, newest first (no items embedded).
   */
  getOrders(userId: string): Promise<Order[]>

  /**
   * Fetch a single order with its items.
   * Returns null if the order does not exist or belongs to another user.
   */
  getOrder(orderId: string, userId: string): Promise<Order | null>

  /**
   * Record a payment for an order and return the created Payment row.
   *
   * @param simulatedOutcome  Optional override for simulation — when omitted
   *                          the repository decides (always 'success' in DB impl).
   *                          Pass 'failure' to persist a failed payment row.
   * @param idempotencyKey    Client-generated UUID for deduplication. The DB
   *                          enforces a UNIQUE constraint on this column so a
   *                          second insert with the same key returns the existing
   *                          row instead of creating a duplicate charge.
   */
  confirmPayment(
    orderId: string,
    userId: string,
    method: PaymentMethod,
    amount: number,
    simulatedOutcome?: 'success' | 'failure',
    idempotencyKey?: string,
  ): Promise<Payment>

  /**
   * Cancel an order by setting its status to 'cancelled'.
   * Called when a payment fails and the user returns to checkout.
   */
  cancelOrder(orderId: string, userId: string): Promise<void>
}

export type { Order, OrderItem, Payment }
