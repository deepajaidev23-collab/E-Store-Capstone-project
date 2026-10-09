// Cart and wishlist domain types

import type { Book } from './book'

export interface Cart {
  id: string
  user_id: string
}

export interface CartItem {
  id: string
  cart_id: string
  book_id: string
  quantity: number
  book?: Book
}

export interface Wishlist {
  id: string
  user_id: string
}

export interface WishlistItem {
  id: string
  wishlist_id: string
  book_id: string
  added_at: string
  book?: Book
}

export interface Coupon {
  id: string
  code: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  min_order_value: number | null
  expires_at: string | null
  is_active: boolean
}
