/**
 * Hand-written Supabase database type stub.
 *
 * Mirrors the schema defined in supabase/migrations/001–019.
 * Regenerate with the Supabase CLI (requires SUPABASE_PROJECT_ID env var):
 *   npm run gen:types
 *
 * Keep in sync with the migration files after any schema change.
 */

export type BookFormat = 'paperback' | 'ebook' | 'hardcover'

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
      }

      publishers: {
        Row: {
          id: string
          name: string
          description: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
        }
      }

      books: {
        Row: {
          id: string
          title: string
          author_name: string
          author_bio: string | null
          author_avatar_url: string | null
          publisher_id: string | null
          description: string
          cover_url: string
          format: BookFormat
          language: string
          price: number
          original_price: number | null
          copies_sold: number
          average_rating: number
          is_bestseller: boolean
          is_new_launch: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          author_name: string
          author_bio?: string | null
          author_avatar_url?: string | null
          publisher_id?: string | null
          description?: string
          cover_url?: string
          format: BookFormat
          language?: string
          price: number
          original_price?: number | null
          copies_sold?: number
          average_rating?: number
          is_bestseller?: boolean
          is_new_launch?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          author_name?: string
          author_bio?: string | null
          author_avatar_url?: string | null
          publisher_id?: string | null
          description?: string
          cover_url?: string
          format?: BookFormat
          language?: string
          price?: number
          original_price?: number | null
          copies_sold?: number
          average_rating?: number
          is_bestseller?: boolean
          is_new_launch?: boolean
          created_at?: string
        }
      }

      book_categories: {
        Row: {
          book_id: string
          category_id: string
        }
        Insert: {
          book_id: string
          category_id: string
        }
        Update: {
          book_id?: string
          category_id?: string
        }
      }

      reviews: {
        Row: {
          id: string
          book_id: string
          user_id: string
          rating: number
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          user_id: string
          rating: number
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          user_id?: string
          rating?: number
          body?: string
          created_at?: string
        }
      }

      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          reward_points: number
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string
          avatar_url?: string | null
          reward_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          reward_points?: number
          created_at?: string
        }
      }

      wishlists: {
        Row: {
          id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
        }
      }

      wishlist_items: {
        Row: {
          id: string
          wishlist_id: string
          book_id: string
          added_at: string
        }
        Insert: {
          id?: string
          wishlist_id: string
          book_id: string
          added_at?: string
        }
        Update: {
          id?: string
          wishlist_id?: string
          book_id?: string
          added_at?: string
        }
      }

      carts: {
        Row: {
          id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
        }
      }

      cart_items: {
        Row: {
          id: string
          cart_id: string
          book_id: string
          quantity: number
          added_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          book_id: string
          quantity?: number
          added_at?: string
        }
        Update: {
          id?: string
          cart_id?: string
          book_id?: string
          quantity?: number
          added_at?: string
        }
      }

      coupons: {
        Row: {
          id: string
          code: string
          discount_type: 'flat' | 'percent'
          discount_value: number
          min_order_value: number | null
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: 'flat' | 'percent'
          discount_value: number
          min_order_value?: number | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_type?: 'flat' | 'percent'
          discount_value?: number
          min_order_value?: number | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
      }

      // ── Checkout tables (migrations 011–014) ──────────────────────────────

      addresses: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          address_line: string
          city: string
          state: string
          country: string
          pin: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          address_line: string
          city: string
          state: string
          country?: string
          pin: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          address_line?: string
          city?: string
          state?: string
          country?: string
          pin?: string
          is_default?: boolean
          created_at?: string
        }
      }

      orders: {
        Row: {
          id: string
          user_id: string
          status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          discount: number
          reward_points_redeemed: number
          tax: number
          delivery_charge: number
          total: number
          coupon_id: string | null
          addr_first_name: string
          addr_last_name: string
          addr_email: string
          addr_phone: string
          addr_address_line: string
          addr_city: string
          addr_state: string
          addr_country: string
          addr_pin: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          subtotal: number
          discount?: number
          reward_points_redeemed?: number
          tax: number
          delivery_charge?: number
          total: number
          coupon_id?: string | null
          addr_first_name: string
          addr_last_name: string
          addr_email: string
          addr_phone: string
          addr_address_line: string
          addr_city: string
          addr_state: string
          addr_country: string
          addr_pin: string
          created_at?: string
        }
        Update: {
          id?: string
          status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          created_at?: string
        }
      }

      order_items: {
        Row: {
          id: string
          order_id: string
          book_id: string
          title: string
          cover_url: string
          price: number
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          book_id: string
          title: string
          cover_url: string
          price: number
          quantity: number
          created_at?: string
        }
        Update: Record<string, never>
      }

      payments: {
        Row: {
          id: string
          order_id: string
          user_id: string
          method: 'credit_card' | 'debit_card' | 'upi' | 'wallet'
          amount: number
          status: 'pending' | 'success' | 'failed'
          /** Added in migration 016 — null for legacy rows */
          idempotency_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          method: 'credit_card' | 'debit_card' | 'upi' | 'wallet'
          amount: number
          status?: 'pending' | 'success' | 'failed'
          idempotency_key?: string | null
          created_at?: string
        }
        Update: Record<string, never>
      }
    }
    Views: Record<string, never>
    Functions: {
      /** Atomic order creation — migration 015/018 */
      create_order_with_items: {
        Args: {
          p_user_id: string
          p_subtotal: number
          p_discount: number
          p_reward_points: number
          p_tax: number
          p_delivery_charge: number
          p_total: number
          p_coupon_id: string | null
          p_addr_first_name: string
          p_addr_last_name: string
          p_addr_email: string
          p_addr_phone: string
          p_addr_address_line: string
          p_addr_city: string
          p_addr_state: string
          p_addr_country: string
          p_addr_pin: string
          p_items: unknown
        }
        Returns: unknown
      }
      /** Secure order cancellation — migration 017 */
      cancel_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      book_format: BookFormat
      discount_type_enum: 'flat' | 'percent'
      order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
      payment_method_enum: 'credit_card' | 'debit_card' | 'upi' | 'wallet'
      payment_status_enum: 'pending' | 'success' | 'failed'
    }
  }
}
