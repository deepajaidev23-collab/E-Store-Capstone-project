/**
 * paymentSimulator.ts — Pure, testable payment simulation logic.
 *
 * This is the Payment Service abstraction layer. The `simulatePayment` function
 * acts as a drop-in seam: a real gateway (Stripe, Razorpay, etc.) would replace
 * only this module while the UI and repository layers remain unchanged.
 *
 * Design:
 * - Synchronous decision (no network / delay — delay is injected at the call site)
 * - Deterministic: specific test inputs always produce failure, all others succeed
 * - No side effects: never stores, logs, or transmits any field values
 * - Card fields are consumed only to check the failure trigger, then discarded
 *
 * Failure triggers (simulation only — not real card validation):
 *   Credit / Debit card: card number 4000-0000-0000-0002
 *   UPI:                 UPI ID     fail@test
 *   Wallet:              never fails
 */

import type { PaymentMethod } from '@/types/order'

// ── Exported constants ────────────────────────────────────────────────────────

/** Card number (digits only) that triggers a simulated payment failure. */
export const FAILURE_CARD_NUMBER = '4000000000000002'

/** UPI ID that triggers a simulated payment failure. */
export const FAILURE_UPI_ID = 'fail@test'

/** Simulated processing delay in milliseconds. */
export const PROCESSING_DELAY_MS = 2000

/** Mock wallet balance shown to the user (INR). */
export const MOCK_WALLET_BALANCE = 2000

// ── Field types ───────────────────────────────────────────────────────────────

export interface CardPaymentFields {
  /** Raw value as entered — digits + dashes/spaces stripped before comparison. */
  card_number: string
  name_on_card: string
  cvv: string
  expiry: string
}

export interface UpiPaymentFields {
  upi_id: string
}

/** Wallet has no user-entered fields. */
export type WalletPaymentFields = Record<string, never>

export type PaymentFields =
  | CardPaymentFields
  | UpiPaymentFields
  | WalletPaymentFields

// ── Simulation result ─────────────────────────────────────────────────────────

export interface SimulationResult {
  outcome: 'success' | 'failure'
  /** Human-readable reason shown in the failure state UI. */
  reason?: string
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Determine whether a payment should succeed or fail.
 *
 * @param method  The selected payment method.
 * @param fields  The (unvalidated) form values — used only for trigger detection.
 *                Raw values are NOT stored, logged, or transmitted anywhere.
 * @returns       A `SimulationResult` with outcome and optional failure reason.
 */
export function simulatePayment(
  method: PaymentMethod,
  fields: PaymentFields,
): SimulationResult {
  if (method === 'credit_card' || method === 'debit_card') {
    const cardFields = fields as CardPaymentFields
    const digits = cardFields.card_number.replace(/[\s-]/g, '')
    if (digits === FAILURE_CARD_NUMBER) {
      return {
        outcome: 'failure',
        reason: `Card declined. (Test trigger: card number ${FAILURE_CARD_NUMBER})`,
      }
    }
    return { outcome: 'success' }
  }

  if (method === 'upi') {
    const upiFields = fields as UpiPaymentFields
    if (upiFields.upi_id.trim().toLowerCase() === FAILURE_UPI_ID.toLowerCase()) {
      return {
        outcome: 'failure',
        reason: `UPI payment failed. (Test trigger: UPI ID "${FAILURE_UPI_ID}")`,
      }
    }
    return { outcome: 'success' }
  }

  // wallet — never fails in simulation
  return { outcome: 'success' }
}

/**
 * Returns a Promise that resolves after the simulated processing delay.
 * Inject a custom delay in tests to avoid real timer waits.
 */
export function withProcessingDelay<T>(
  result: T,
  delayMs = PROCESSING_DELAY_MS,
): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), delayMs))
}
