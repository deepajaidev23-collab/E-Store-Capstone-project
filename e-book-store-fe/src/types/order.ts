// Order domain types

import type { Book } from './book'

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentMethod = 'credit_card' | 'debit_card' | 'upi' | 'wallet'
export type PaymentStatus = 'pending' | 'success' | 'failed'

export interface ShippingAddressSnapshot {
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line: string
  city: string
  state: string
  country: string
  pin: string
}

export interface OrderItem {
  id: string
  order_id: string
  book_id: string
  title: string
  cover_url: string
  price: number
  quantity: number
  book?: Book
}

export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  subtotal: number
  tax: number
  delivery_charge: number
  coupon_id: string | null
  discount: number
  total: number
  shipping_address: ShippingAddressSnapshot
  reward_points_redeemed: number
  created_at: string
  items?: OrderItem[]
}

export interface Payment {
  id: string
  order_id: string
  user_id: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  created_at: string
}
