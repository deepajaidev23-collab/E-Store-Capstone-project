/**
 * validatePayment.ts — Client-side validation for payment method fields.
 *
 * Pure function: no React, no side effects.
 * Parallel to validateAddressForm in validateAddress.ts.
 *
 * Card details are validated for format only — they are never stored or transmitted.
 */

import type { PaymentMethod } from '@/types/order'
import type { CardPaymentFields, UpiPaymentFields, PaymentFields } from '@/lib/paymentSimulator'

export type PaymentFieldErrors = Record<string, string>

/**
 * Validate payment form fields for the given method.
 * Returns an empty object `{}` when all fields are valid.
 */
export function validatePaymentFields(
  method: PaymentMethod,
  fields: PaymentFields,
): PaymentFieldErrors {
  if (method === 'credit_card' || method === 'debit_card') {
    return validateCardFields(fields as CardPaymentFields)
  }
  if (method === 'upi') {
    return validateUpiFields(fields as UpiPaymentFields)
  }
  // wallet — no fields to validate
  return {}
}

// ── Card validation ───────────────────────────────────────────────────────────

function validateCardFields(fields: CardPaymentFields): PaymentFieldErrors {
  const errors: PaymentFieldErrors = {}

  // Card number: required, exactly 16 digits after stripping spaces/dashes
  const rawDigits = (fields.card_number ?? '').replace(/[\s-]/g, '')
  if (!rawDigits) {
    errors.card_number = 'Card number is required.'
  } else if (!/^\d{16}$/.test(rawDigits)) {
    errors.card_number = 'Card number must be 16 digits.'
  }

  // Name on card: required
  if (!(fields.name_on_card ?? '').trim()) {
    errors.name_on_card = 'Name on card is required.'
  }

  // CVV: required, exactly 3 digits
  const cvv = (fields.cvv ?? '').trim()
  if (!cvv) {
    errors.cvv = 'CVV is required.'
  } else if (!/^\d{3}$/.test(cvv)) {
    errors.cvv = 'CVV must be 3 digits.'
  }

  // Expiry: required, MM/YYYY format, not in the past
  const expiry = (fields.expiry ?? '').trim()
  if (!expiry) {
    errors.expiry = 'Expiry date is required.'
  } else if (!/^\d{2}\/\d{4}$/.test(expiry)) {
    errors.expiry = 'Use MM/YYYY format.'
  } else {
    const [mm, yyyy] = expiry.split('/').map(Number)
    if (mm < 1 || mm > 12) {
      errors.expiry = 'Month must be between 01 and 12.'
    } else {
      const now = new Date()
      const expiryDate = new Date(yyyy, mm - 1, 1) // first day of expiry month
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      if (expiryDate < currentMonth) {
        errors.expiry = 'Card has expired.'
      }
    }
  }

  return errors
}

// ── UPI validation ────────────────────────────────────────────────────────────

function validateUpiFields(fields: UpiPaymentFields): PaymentFieldErrors {
  const errors: PaymentFieldErrors = {}
  const upiId = (fields.upi_id ?? '').trim()

  if (!upiId) {
    errors.upi_id = 'UPI ID is required.'
  } else if (!upiId.includes('@') || upiId.startsWith('@') || upiId.endsWith('@')) {
    errors.upi_id = 'Enter a valid UPI ID (e.g. name@bank).'
  }

  return errors
}
