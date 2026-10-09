/**
 * SupabaseOrderRepository — Supabase-backed implementation of OrderRepository.
 *
 * createOrder: calls the `create_order_with_items` Postgres RPC which inserts
 *   the `orders` row and all `order_items` rows in a single transaction.
 *   Price totals are computed here from the items array — we never trust
 *   client-supplied totals.
 *
 * confirmPayment: inserts a payment row with an optional idempotency key.
 *   If a duplicate key is detected (Postgres error 23505), the existing
 *   payment row is fetched and returned — no double-charge occurs.
 *   The DB trigger `on_payment_success` automatically sets the order status
 *   to 'confirmed' when a successful payment is recorded.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrderRepository, CreateOrderPayload } from '@/repositories/OrderRepository'
import type { Order, OrderItem, Payment, PaymentMethod } from '@/types/order'
import { calcBreakdown } from '@/lib/pricing'
import type { CartItem } from '@/types/cart'
import { RepositoryError } from './errors'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

function throwOnError(error: { message: string; code?: string; hint?: string } | null): void {
  if (error) throw RepositoryError.fromPostgrest(error as import('@supabase/supabase-js').PostgrestError)
}

// ── Row types ─────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string; user_id: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number; discount: number; reward_points_redeemed: number
  tax: number; delivery_charge: number; total: number
  coupon_id: string | null
  addr_first_name: string; addr_last_name: string; addr_email: string
  addr_phone: string; addr_address_line: string; addr_city: string
  addr_state: string; addr_country: string; addr_pin: string
  created_at: string
}

interface OrderItemRow {
  id: string; order_id: string; book_id: string
  title: string; cover_url: string; price: number; quantity: number
  created_at: string
}

interface PaymentRow {
  id: string; order_id: string; user_id: string
  method: 'credit_card' | 'debit_card' | 'upi' | 'wallet'
  amount: number; status: 'pending' | 'success' | 'failed'
  idempotency_key: string | null
  created_at: string
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id, order_id: row.order_id, book_id: row.book_id,
    title: row.title, cover_url: row.cover_url,
    price: Number(row.price), quantity: row.quantity,
  }
}

function mapOrder(row: OrderRow, items: OrderItem[] = []): Order {
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    reward_points_redeemed: row.reward_points_redeemed,
    tax: Number(row.tax),
    delivery_charge: Number(row.delivery_charge),
    total: Number(row.total),
    coupon_id: row.coupon_id,
    shipping_address: {
      first_name: row.addr_first_name,
      last_name: row.addr_last_name,
      email: row.addr_email,
      phone: row.addr_phone,
      address_line: row.addr_address_line,
      city: row.addr_city,
      state: row.addr_state,
      country: row.addr_country,
      pin: row.addr_pin,
    },
    created_at: row.created_at,
    items,
  }
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    order_id: row.order_id,
    user_id: row.user_id,
    method: row.method,
    amount: Number(row.amount),
    status: row.status,
    created_at: row.created_at,
  }
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseOrderRepository implements OrderRepository {
  private client: AnySupabaseClient

  constructor(client: AnySupabaseClient) {
    this.client = client
  }

  async createOrder(userId: string, payload: CreateOrderPayload): Promise<Order> {
    const { address, coupon, rewardPointsRedeemed, items } = payload

    // Build synthetic CartItems for calcBreakdown — use the prices from payload
    // (which were fetched from the DB by the caller, not from the client)
    const cartItems: CartItem[] = items.map((item) => ({
      id: item.book_id,
      cart_id: '',
      book_id: item.book_id,
      quantity: item.quantity,
      book: {
        id: item.book_id,
        title: item.title,
        price: item.price,
        cover_url: item.cover_url,
        // Minimal shape; calcBreakdown only needs price + quantity
        author_name: '', author_bio: null, author_avatar_url: null,
        publisher_id: null, description: '', format: 'paperback',
        language: 'English', original_price: null, copies_sold: 0,
        average_rating: 0, is_bestseller: false, is_new_launch: false,
        created_at: '', categories: [],
      },
    }))

    // Server-side total recalculation — never trust client totals
    const breakdown = calcBreakdown(cartItems, coupon, rewardPointsRedeemed)

    // Call the atomic RPC — inserts orders + order_items in one transaction
    const { data, error } = await this.client.rpc('create_order_with_items', {
      p_user_id:           userId,
      p_subtotal:          breakdown.subtotal,
      p_discount:          breakdown.discount,
      p_reward_points:     breakdown.rewardPointsDiscount,
      p_tax:               breakdown.tax,
      p_delivery_charge:   0,
      p_total:             breakdown.total,
      p_coupon_id:         coupon?.id ?? null,
      p_addr_first_name:   address.first_name,
      p_addr_last_name:    address.last_name,
      p_addr_email:        address.email,
      p_addr_phone:        address.phone,
      p_addr_address_line: address.address_line,
      p_addr_city:         address.city,
      p_addr_state:        address.state,
      p_addr_country:      address.country,
      p_addr_pin:          address.pin,
      p_items:             items.map((i) => ({
        book_id:   i.book_id,
        title:     i.title,
        cover_url: i.cover_url,
        price:     i.price,
        quantity:  i.quantity,
      })),
    })

    throwOnError(error)

    const result = data as unknown as OrderRow & { order_items?: OrderItemRow[] }
    const mappedItems = (result.order_items ?? []).map(mapOrderItem)
    return mapOrder(result, mappedItems)
  }

  async getOrders(userId: string): Promise<Order[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    throwOnError(error)
    return ((data ?? []) as unknown as OrderRow[]).map((row) => mapOrder(row))
  }

  async getOrder(orderId: string, userId: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .eq('user_id', userId)
      .maybeSingle()

    throwOnError(error)
    if (!data) return null

    const row = data as unknown as OrderRow & { order_items?: OrderItemRow[] }
    const items = (row.order_items ?? []).map(mapOrderItem)
    return mapOrder(row, items)
  }

  async confirmPayment(
    orderId: string,
    userId: string,
    method: PaymentMethod,
    amount: number,
    simulatedOutcome: 'success' | 'failure' = 'success',
    idempotencyKey?: string,
  ): Promise<Payment> {
    // Translate simulator outcome to DB payment_status_enum
    const status: 'success' | 'failed' = simulatedOutcome === 'failure' ? 'failed' : 'success'

    const insertPayload: Record<string, unknown> = {
      order_id: orderId,
      user_id: userId,
      method,
      amount,
      status,
    }
    if (idempotencyKey) {
      insertPayload.idempotency_key = idempotencyKey
    }

    const { data, error } = await this.client
      .from('payments')
      .insert(insertPayload)
      .select('*')
      .single()

    // Duplicate idempotency key — return the existing payment row (no double-charge)
    if (error?.code === '23505' && idempotencyKey) {
      const { data: existing, error: fetchError } = await this.client
        .from('payments')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single()
      throwOnError(fetchError)
      return mapPayment(existing as unknown as PaymentRow)
    }

    throwOnError(error)
    return mapPayment(data as unknown as PaymentRow)
  }

  async cancelOrder(orderId: string, _userId: string): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Uses the cancel_order SECURITY DEFINER RPC (migration 017) which
    // enforces server-side that the caller owns the order AND it is still
    // 'pending'.  The _userId parameter is kept for interface compatibility.
    const { error } = await this.client.rpc('cancel_order', {
      p_order_id: orderId,
    })
    throwOnError(error)
  }
}
