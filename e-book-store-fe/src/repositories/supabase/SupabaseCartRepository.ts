/**
 * SupabaseCartRepository — Supabase-backed implementation of CartRepository.
 *
 * Key design decisions:
 * - getOrCreateCart: upserts on user_id to lazily create the cart on first use.
 * - addItem: on unique-constraint violation (23505) it increments quantity on
 *   the existing item instead of creating a duplicate — idempotent by design.
 * - getCart: embeds the full Book shape in one round-trip.
 * - getCoupon: also checks that expires_at is in the future (or null).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CartRepository } from '@/repositories/CartRepository'
import type { CartItem, Coupon } from '@/types/cart'
import type { Book, Category, Publisher } from '@/types/book'
import { RepositoryError } from './errors'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

// ── Query row types ───────────────────────────────────────────────────────────

interface PublisherRow { id: string; name: string; description: string | null }
interface CategoryRow  { id: string; name: string; slug: string }

interface BookQueryRow {
  id: string; title: string; author_name: string; author_bio: string | null
  author_avatar_url: string | null; publisher_id: string | null
  description: string; cover_url: string
  format: 'paperback' | 'ebook' | 'hardcover'
  language: string; price: number; original_price: number | null
  copies_sold: number; average_rating: number
  is_bestseller: boolean; is_new_launch: boolean; created_at: string
  publisher: PublisherRow | null
  book_categories: Array<{ categories: CategoryRow | null }>
}

interface CartItemQueryRow {
  id: string
  cart_id: string
  book_id: string
  quantity: number
  added_at: string
  books: BookQueryRow | null
}

interface CartRow { id: string; user_id: string; created_at: string }

interface CouponRow {
  id: string; code: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  min_order_value: number | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function throwOnError(error: { message: string; code?: string; hint?: string } | null): void {
  if (error) throw RepositoryError.fromPostgrest(error as import('@supabase/supabase-js').PostgrestError)
}

function mapBook(row: BookQueryRow): Book {
  const publisher: Publisher | undefined = row.publisher
    ? { id: row.publisher.id, name: row.publisher.name, description: row.publisher.description }
    : undefined

  const categories: Category[] = row.book_categories
    .map((bc) => bc.categories)
    .filter((c): c is CategoryRow => c !== null)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }))

  return {
    id: row.id, title: row.title, author_name: row.author_name,
    author_bio: row.author_bio, author_avatar_url: row.author_avatar_url,
    publisher_id: row.publisher_id, publisher, description: row.description,
    cover_url: row.cover_url, format: row.format, language: row.language,
    price: Number(row.price),
    original_price: row.original_price !== null ? Number(row.original_price) : null,
    copies_sold: row.copies_sold, average_rating: Number(row.average_rating),
    is_bestseller: row.is_bestseller, is_new_launch: row.is_new_launch,
    created_at: row.created_at, categories,
  }
}

function mapCartItem(row: CartItemQueryRow): CartItem {
  return {
    id: row.id,
    cart_id: row.cart_id,
    book_id: row.book_id,
    quantity: row.quantity,
    book: row.books ? mapBook(row.books) : undefined,
  }
}

function mapCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    min_order_value: row.min_order_value !== null ? Number(row.min_order_value) : null,
    expires_at: row.expires_at,
    is_active: row.is_active,
  }
}

const CART_ITEM_SELECT =
  '*, books(*, publisher:publishers(*), book_categories(categories(*)))'

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseCartRepository implements CartRepository {
  private client: AnySupabaseClient

  constructor(client: AnySupabaseClient) {
    this.client = client
  }

  /** Upsert the carts row for this user and return its id. */
  private async getOrCreateCart(userId: string): Promise<string> {
    const { data, error } = await this.client
      .from('carts')
      .upsert({ user_id: userId } as Record<string, unknown>, { onConflict: 'user_id' })
      .select('id')
      .single()

    throwOnError(error)
    return (data as unknown as CartRow).id
  }

  async getCart(userId: string): Promise<CartItem[]> {
    const { data, error } = await this.client
      .from('cart_items')
      .select(`${CART_ITEM_SELECT}, carts!inner(user_id)`)
      .eq('carts.user_id', userId)
      .order('added_at', { ascending: true })

    throwOnError(error)
    return ((data ?? []) as unknown as CartItemQueryRow[]).map(mapCartItem)
  }

  async addItem(userId: string, bookId: string): Promise<CartItem> {
    const cartId = await this.getOrCreateCart(userId)

    const { data, error } = await this.client
      .from('cart_items')
      .insert({ cart_id: cartId, book_id: bookId, quantity: 1 } as Record<string, unknown>)
      .select(CART_ITEM_SELECT)
      .single()

    // 23505 = unique_violation — book already in cart, increment quantity
    if (error) {
      if (error.code === '23505') {
        // Fetch existing item then increment its quantity
        const { data: existing, error: fetchError } = await this.client
          .from('cart_items')
          .select(CART_ITEM_SELECT)
          .eq('cart_id', cartId)
          .eq('book_id', bookId)
          .single()

        throwOnError(fetchError)
        const existingItem = existing as unknown as CartItemQueryRow
        const newQty = existingItem.quantity + 1

        const { data: updated, error: updateError } = await this.client
          .from('cart_items')
          .update({ quantity: newQty } as Record<string, unknown>)
          .eq('id', existingItem.id)
          .select(CART_ITEM_SELECT)
          .single()

        throwOnError(updateError)
        return mapCartItem(updated as unknown as CartItemQueryRow)
      }
      throwOnError(error)
    }

    return mapCartItem(data as unknown as CartItemQueryRow)
  }

  async updateQuantity(itemId: string, quantity: number): Promise<CartItem | null> {
    if (quantity <= 0) {
      // Delete directly by item id — RLS on cart_items ensures ownership
      const { error } = await this.client
        .from('cart_items')
        .delete()
        .eq('id', itemId)
      throwOnError(error)
      return null
    }

    const { data, error } = await this.client
      .from('cart_items')
      .update({ quantity } as Record<string, unknown>)
      .eq('id', itemId)
      .select(CART_ITEM_SELECT)
      .single()

    throwOnError(error)
    return mapCartItem(data as unknown as CartItemQueryRow)
  }

  async removeItem(itemId: string, userId: string): Promise<void> {
    // Defence-in-depth: join through carts so only items that belong to the
    // authenticated user can be deleted (RLS enforces this too).
    const { data: cart } = await this.client
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!cart) return  // user has no cart — nothing to delete

    const { error } = await this.client
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('cart_id', (cart as { id: string }).id)

    throwOnError(error)
  }

  async isInCart(userId: string, bookId: string): Promise<boolean> {
    const { count, error } = await this.client
      .from('cart_items')
      .select('cart_items.id, carts!inner(user_id)', { count: 'exact', head: true })
      .eq('carts.user_id', userId)
      .eq('book_id', bookId)

    throwOnError(error)
    return (count ?? 0) > 0
  }

  async clearCart(userId: string): Promise<void> {
    const { data: cart, error: cartError } = await this.client
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    throwOnError(cartError)
    if (!cart) return

    const cartId = (cart as unknown as CartRow).id

    const { error } = await this.client
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)

    throwOnError(error)
  }

  async getCoupon(code: string): Promise<Coupon | null> {
    const now = new Date().toISOString()

    const { data, error } = await this.client
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle()

    throwOnError(error)
    if (!data) return null
    return mapCoupon(data as unknown as CouponRow)
  }
}
