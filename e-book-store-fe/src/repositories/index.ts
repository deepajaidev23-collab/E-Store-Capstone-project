/**
 * Repository exports + singleton factory.
 *
 * The rest of the application imports from here:
 *
 *   import { bookRepository }     from '@/repositories'
 *   import { wishlistRepository } from '@/repositories'
 *   import { cartRepository }     from '@/repositories'
 *   import { addressRepository }  from '@/repositories'
 *   import { orderRepository }    from '@/repositories'
 *
 * Feature flag: set VITE_USE_SUPABASE=true in .env.local to use the live
 * Supabase backend.  When unset (or false) the mocks are used — all existing
 * tests continue to pass without any network calls.
 */

// ── Book repository ───────────────────────────────────────────────────────────
export type { BookRepository, BookFilters, BooksResult, SortField } from './BookRepository'
export { MockBookRepository } from './mock/MockBookRepository'
export { SupabaseBookRepository } from './supabase/SupabaseBookRepository'

import { MockBookRepository } from './mock/MockBookRepository'
import { SupabaseBookRepository } from './supabase/SupabaseBookRepository'

// ── Wishlist repository ───────────────────────────────────────────────────────
export type { WishlistRepository } from './WishlistRepository'
export { MockWishlistRepository } from './mock/MockWishlistRepository'
export { SupabaseWishlistRepository } from './supabase/SupabaseWishlistRepository'

import { MockWishlistRepository } from './mock/MockWishlistRepository'
import { SupabaseWishlistRepository } from './supabase/SupabaseWishlistRepository'

// ── Cart repository ───────────────────────────────────────────────────────────
export type { CartRepository } from './CartRepository'
export { MockCartRepository } from './mock/MockCartRepository'
export { SupabaseCartRepository } from './supabase/SupabaseCartRepository'

import { MockCartRepository } from './mock/MockCartRepository'
import { SupabaseCartRepository } from './supabase/SupabaseCartRepository'

// ── Address repository ────────────────────────────────────────────────────────
export type { AddressRepository, CreateAddressData } from './AddressRepository'
export { MockAddressRepository } from './mock/MockAddressRepository'
export { SupabaseAddressRepository } from './supabase/SupabaseAddressRepository'

import { MockAddressRepository } from './mock/MockAddressRepository'
import { SupabaseAddressRepository } from './supabase/SupabaseAddressRepository'

// ── Order repository ──────────────────────────────────────────────────────────
export type { OrderRepository, CreateOrderPayload } from './OrderRepository'
export { MockOrderRepository } from './mock/MockOrderRepository'
export { SupabaseOrderRepository } from './supabase/SupabaseOrderRepository'

import { MockOrderRepository } from './mock/MockOrderRepository'
import { SupabaseOrderRepository } from './supabase/SupabaseOrderRepository'

import { supabase } from '@/lib/supabase'

const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true'

/**
 * Application-wide repository singletons.
 * All are controlled by the same VITE_USE_SUPABASE env var.
 */
export const bookRepository = useSupabase
  ? new SupabaseBookRepository(supabase)
  : new MockBookRepository()

export const wishlistRepository = useSupabase
  ? new SupabaseWishlistRepository(supabase)
  : new MockWishlistRepository()

export const cartRepository = useSupabase
  ? new SupabaseCartRepository(supabase)
  : new MockCartRepository()

export const addressRepository = useSupabase
  ? new SupabaseAddressRepository(supabase)
  : new MockAddressRepository()

export const orderRepository = useSupabase
  ? new SupabaseOrderRepository(supabase)
  : new MockOrderRepository()
