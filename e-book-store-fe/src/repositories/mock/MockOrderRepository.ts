/**
 * MockOrderRepository — in-memory implementation of OrderRepository.
 * Simulates network latency with a small delay.
 */
import type { OrderRepository, CreateOrderPayload } from '@/repositories/OrderRepository'
import type { Order, OrderItem, Payment, PaymentMethod } from '@/types/order'
import type { CartItem } from '@/types/cart'
import { calcBreakdown } from '@/lib/pricing'

const delay = (ms = 200) => new Promise<void>((r) => setTimeout(r, ms))

export class MockOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map()
  private payments: Map<string, Payment[]> = new Map()

  async createOrder(userId: string, payload: CreateOrderPayload): Promise<Order> {
    await delay()

    const { address, coupon, rewardPointsRedeemed, items } = payload

    // Recalculate from trusted item prices (same logic as Supabase impl)
    const cartItems: CartItem[] = items.map((item) => ({
      id: item.book_id,
      cart_id: '',
      book_id: item.book_id,
      quantity: item.quantity,
      book: {
        id: item.book_id, title: item.title, price: item.price,
        cover_url: item.cover_url, author_name: '', author_bio: null,
        author_avatar_url: null, publisher_id: null, description: '',
        format: 'paperback' as const, language: 'English',
        original_price: null, copies_sold: 0, average_rating: 0,
        is_bestseller: false, is_new_launch: false, created_at: '',
        categories: [],
      },
    }))

    const breakdown = calcBreakdown(cartItems, coupon, rewardPointsRedeemed)

    const orderItems: OrderItem[] = items.map((item) => ({
      id: `oi-${Math.random().toString(36).slice(2)}`,
      order_id: '',
      book_id: item.book_id,
      title: item.title,
      cover_url: item.cover_url,
      price: item.price,
      quantity: item.quantity,
    }))

    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const order: Order = {
      id: orderId,
      user_id: userId,
      status: 'pending',
      subtotal: breakdown.subtotal,
      discount: breakdown.discount,
      reward_points_redeemed: breakdown.rewardPointsDiscount,
      tax: breakdown.tax,
      delivery_charge: 0,
      total: breakdown.total,
      coupon_id: coupon?.id ?? null,
      shipping_address: address,
      created_at: new Date().toISOString(),
      items: orderItems.map((oi) => ({ ...oi, order_id: orderId })),
    }

    this.orders.set(orderId, order)
    return order
  }

  async getOrders(userId: string): Promise<Order[]> {
    await delay(80)
    return [...this.orders.values()]
      .filter((o) => o.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  async getOrder(orderId: string, userId: string): Promise<Order | null> {
    await delay(80)
    const order = this.orders.get(orderId)
    if (!order || order.user_id !== userId) return null
    return order
  }

  async confirmPayment(
    orderId: string,
    userId: string,
    method: PaymentMethod,
    amount: number,
    simulatedOutcome: 'success' | 'failure' = 'success',
    // idempotencyKey is accepted for interface compatibility but not enforced
    // in the mock — in-memory single-session repos have no dedup risk
    _idempotencyKey?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<Payment> {
    await delay()

    // Translate simulator outcome to DB payment status
    const status: 'success' | 'failed' = simulatedOutcome === 'failure' ? 'failed' : 'success'
    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order_id: orderId,
      user_id: userId,
      method,
      amount,
      status,
      created_at: new Date().toISOString(),
    }

    const list = this.payments.get(orderId) ?? []
    list.push(payment)
    this.payments.set(orderId, list)

    // Only advance order status on success
    if (status === 'success') {
      const order = this.orders.get(orderId)
      if (order) {
        this.orders.set(orderId, { ...order, status: 'confirmed' })
      }
    }

    return payment
  }

  async cancelOrder(orderId: string, userId: string): Promise<void> {
    await delay(80)
    const order = this.orders.get(orderId)
    if (order && order.user_id === userId) {
      this.orders.set(orderId, { ...order, status: 'cancelled' })
    }
  }
}
