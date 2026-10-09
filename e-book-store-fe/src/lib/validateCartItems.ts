/**
 * validateCartItems — pre-flight validation before order creation.
 *
 * Called with the freshest CartItem data (after a refetch) immediately before
 * the createOrder mutation fires. Returns an array of problems; an empty array
 * means the cart is safe to submit.
 *
 * Why re-fetch before validating?
 *   CartItem.book is a live join from the DB. By calling refetchCart() just
 *   before this function, we guarantee that book prices, availability, and
 *   existence are all current — any price that changed since the user loaded
 *   the page will be reflected in the fresh data.
 *
 * Checks (per item):
 *  1. Missing book  — item.book is null/undefined (book deleted from catalogue)
 *  2. Zero/negative price — defensive guard against bad data
 *
 * Note: an `is_available` field is not currently on the Book type.
 * If one is added, add a check here.
 */

import type { CartItem } from '@/types/cart'

export interface CartValidationError {
  /** The cart item this error applies to */
  book_id: string
  /** Human-readable title for display (may be empty if book is missing) */
  title: string
  /** Short description of what is wrong */
  message: string
}

/**
 * Returns an array of validation errors.
 * An empty array means the cart is valid and the order can proceed.
 *
 * @param items — Latest CartItem list (should be freshly re-fetched)
 */
export function validateCartItems(items: CartItem[]): CartValidationError[] {
  const errors: CartValidationError[] = []

  for (const item of items) {
    // 1. Missing/deleted book — book no longer exists in catalogue
    if (!item.book) {
      errors.push({
        book_id: item.book_id,
        title: '',
        message: 'This book is no longer available and cannot be ordered.',
      })
      continue
    }

    const book = item.book

    // 2. Defensive: price must be a positive number
    if (typeof book.price !== 'number' || book.price <= 0) {
      errors.push({
        book_id: book.id,
        title: book.title,
        message: `"${book.title}" has an invalid price and cannot be ordered.`,
      })
    }
  }

  return errors
}
