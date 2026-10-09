# Payment Simulation Flow Plan

## Top-Level Overview

Replace the current minimal `PaymentPage` with a fully simulated payment experience that
matches the screenshot: a full-page decorative background with a centered two-panel payment
card. The simulation covers four payment methods with method-specific input fields,
client-side validation, a realistic 2-second "processing" state, deterministic failure
triggers (specific test card numbers), a clear failure state with order cancellation, and
seamless navigation to `OrderConfirmationPage` on success.

**Scope:**
- Full redesign of `PaymentPage` — decorative background, centered card/panel layout
- Method-specific field components: `CardFields` (credit/debit), `UpiFields`, `WalletFields`
- `PaymentSimulator` utility — deterministic success/failure logic, 2s delay
- `PaymentValidation` utility — client-side form validation per method
- Extended `MockOrderRepository.confirmPayment` — deterministic failure via trigger card numbers
- Optional: extend `SupabaseOrderRepository.confirmPayment` to persist `status: 'failed'` row too
- Extended `useConfirmPayment` hook — accept simulation payload
- New DB migration for cancellation: update order status to `cancelled` on payment failure
- New tests for: PaymentSimulator logic, validation per method, failure+retry scenarios

**Out of scope:**
- Real payment processor (Stripe, Razorpay, etc.)
- PCI-DSS compliance (no real card data is ever stored or validated against a processor)
- Storing raw card details in any persistent store (form data is only used for simulation trigger logic)
- SMS/OTP verification
- Saved payment methods / vault

---

## Payment State Machine

```
mount
  └─ orderId guard (missing → redirect /cart)
  └─ fetch order (loading / error / ready)
       └─ ready → IDLE

IDLE
  User selects method, fills method-specific fields
  └─ Pay Now clicked
       └─ validatePaymentForm()
            ├─ invalid → VALIDATION_ERROR — show inline field errors, stay IDLE
            └─ valid
                 └─ PROCESSING (2s simulated delay, full-screen overlay)
                      ├─ success → update DB (payments row status='success', order status='confirmed')
                      │            → navigate /order-confirmation/:orderId (replace)
                      └─ failure → PAYMENT_FAILED
                                    └─ "Go back to Checkout" → cancelOrder() (status='cancelled')
                                                             → navigate /checkout (replace)
```

---

## Payment Methods & Fields

| Method | Fields | Trigger for failure |
|---|---|---|
| Credit Card | Card Number (16 digits formatted), Name on Card, CVV (3 digits), Date of Expiry (MM/YYYY) | Card number `4000000000000002` |
| Debit Card | Same as Credit Card | Card number `4000000000000002` |
| UPI | UPI ID (format: name@bank) | UPI ID `fail@test` |
| Wallet | Shows mock balance (₹2000); single "Pay from Wallet" button (no extra fields) | Balance always sufficient; never fails in simulation |

---

## Sub-Tasks

---

### Sub-Task 1 — PaymentSimulator utility

**Status:** [ ] pending

**Intent:**
Centralise all simulation logic in a pure, testable utility with no React dependencies.
Determines success/failure deterministically from payment inputs so tests are predictable
and the UI logic stays thin.

**Expected Outcomes:**
- `src/lib/paymentSimulator.ts` exported
- `simulatePayment(method, fields): { outcome: 'success' | 'failure'; reason?: string }`
  — synchronous decision function (no delay — delay is handled in the UI layer)
- Failure triggers:
  - `credit_card` / `debit_card`: card number `4000000000000002` → failure
  - `upi`: UPI ID `fail@test` → failure
  - `wallet`: never fails
- `FAILURE_CARD_NUMBER = '4000000000000002'` exported constant (for test helpers and UI hint)
- `FAILURE_UPI_ID = 'fail@test'` exported constant

**Todo List:**
1. Create `src/lib/paymentSimulator.ts`
2. Define `SimulatePaymentFields` union type (card fields | UPI fields | wallet fields)
3. Implement `simulatePayment()` with deterministic rules
4. Export failure trigger constants

**Relevant Context:**
- `src/lib/validateAddress.ts` — pattern for pure utility with exported function
- `src/lib/pricing.ts` — pure function pattern
- `src/types/order.ts` — `PaymentMethod` type

---

### Sub-Task 2 — Payment form validation utility

**Status:** [ ] pending

**Intent:**
Client-side validation for each payment method's fields. Pure function, no side effects,
parallel to `validateAddressForm`. Returns a `Record<string, string>` of field errors.

**Expected Outcomes:**
- `src/lib/validatePayment.ts` exported
- `validatePaymentFields(method, fields): Record<string, string>`
  - `credit_card` / `debit_card`:
    - `card_number`: required, exactly 16 digits (after stripping spaces/dashes)
    - `name_on_card`: required, non-empty
    - `cvv`: required, exactly 3 digits
    - `expiry`: required, MM/YYYY format, month 01–12, year ≥ current year
  - `upi`:
    - `upi_id`: required, matches pattern `something@something`
  - `wallet`:
    - No fields to validate (balance is always sufficient in simulation)
- Returns `{}` (empty) when validation passes

**Todo List:**
1. Create `src/lib/validatePayment.ts`
2. Implement card field validation (card_number, name_on_card, cvv, expiry)
3. Implement UPI validation
4. Add expiry date logic (not expired relative to current month/year)

**Relevant Context:**
- `src/lib/validateAddress.ts` — validation function shape and error record pattern
- `src/types/order.ts` — `PaymentMethod`

---

### Sub-Task 3 — MockOrderRepository: deterministic failure + cancellation

**Status:** [ ] pending

**Intent:**
Extend `MockOrderRepository.confirmPayment` to:
1. Accept an optional simulation hint so the mock can return `status: 'failed'`
2. Add a `cancelOrder(orderId, userId)` method to set order status to `'cancelled'`

The `OrderRepository` interface must also be extended with `cancelOrder`.

**Expected Outcomes:**
- `OrderRepository` interface gains `cancelOrder(orderId, userId): Promise<void>`
- `confirmPayment` signature gains an optional `simulatedOutcome?: 'success' | 'failure'` param
- `MockOrderRepository.confirmPayment('failure')` → creates payment row with `status: 'failed'`,
  leaves order status as `'pending'`
- `MockOrderRepository.confirmPayment('success')` → existing behaviour (status='confirmed')
- `MockOrderRepository.cancelOrder()` → sets order status to `'cancelled'`
- `SupabaseOrderRepository` gains the same interface extensions:
  - `confirmPayment`: inserts payment row with the provided status
  - `cancelOrder`: updates order row status to 'cancelled'
- `useConfirmPayment` hook updated to pass `simulatedOutcome` through
- `useCancelOrder` hook added to `src/hooks/useOrder.ts`

**Todo List:**
1. Extend `OrderRepository` interface: add `cancelOrder` + update `confirmPayment` signature
2. Update `MockOrderRepository.confirmPayment` to handle failure outcome
3. Implement `MockOrderRepository.cancelOrder`
4. Update `SupabaseOrderRepository.confirmPayment` to accept and persist the status
5. Implement `SupabaseOrderRepository.cancelOrder`
6. Update `useConfirmPayment` hook variables to include `simulatedOutcome`
7. Add `useCancelOrder` hook

**Relevant Context:**
- `src/repositories/OrderRepository.ts` — interface to extend
- `src/repositories/mock/MockOrderRepository.ts` — existing confirmPayment
- `src/repositories/supabase/SupabaseOrderRepository.ts` — existing confirmPayment
- `src/hooks/useOrder.ts` — useConfirmPayment and useCancelOrder

---

### Sub-Task 4 — Method-specific field components

**Status:** [ ] pending

**Intent:**
Create three presentational components for the payment form panel's right side.
Each renders the fields appropriate to its payment method. Pure — no async logic.

**Expected Outcomes:**

`src/components/payment/CardFields.tsx`
- Props: `value: CardFieldValues`, `onChange`, `errors: Record<string, string>`, `disabled`
- Fields: Card Number (formatted XXXX-XXXX-XXXX-XXXX), Name on Card, CVV, Date of Expiry
- Card number input strips non-digits and auto-inserts dashes for display
- Matches screenshot layout (2-column grid: card number + name top row, CVV + expiry bottom row)
- Uses existing `Input`, `FormField`, `FormError` from `@/components/ui`

`src/components/payment/UpiFields.tsx`
- Props: `value: UpiFieldValues`, `onChange`, `errors`, `disabled`
- Single field: UPI ID with placeholder `name@bank`

`src/components/payment/WalletFields.tsx`
- Props: `mockBalance: number`, `amount: number`, `disabled`
- No editable fields — shows mock wallet balance (₹2,000) and the amount to deduct
- "Sufficient balance" indicator

`src/components/payment/index.ts` — barrel export

**Todo List:**
1. Create `src/components/payment/` directory
2. Create `CardFields.tsx` with 2-column grid matching screenshot
3. Implement card number auto-formatting (XXXX-XXXX-XXXX-XXXX)
4. Create `UpiFields.tsx`
5. Create `WalletFields.tsx` with mock balance display
6. Create barrel `index.ts`

**Relevant Context:**
- Screenshot shows exactly: Card Number (full width), Name on Card (right), CVV (left), Expiry (right)
- `src/components/ui/index.ts` — Input, FormField, FormError, Label
- `src/lib/paymentSimulator.ts` — `FAILURE_CARD_NUMBER` for showing a hint to testers

---

### Sub-Task 5 — PaymentPage full redesign

**Status:** [ ] pending

**Intent:**
Completely replace the current `PaymentPage` layout with the screenshot's design:
- Full-page decorative background (dark blue/navy, floating book illustrations via CSS or inline SVG)
- Centered payment card/panel with two columns: method selector tabs (left) + dynamic fields (right)
- Header of the panel: "Complete Payment" (left) + "Payable Amount: ₹XXX" (right, bold)
- Four distinct UI states managed locally within the page
- No navigation away except via the cancel/back button

**Four UI states:**

`IDLE` — default state
- Left panel: vertical tab list (Credit Card / Debit Card / UPI / Wallet)
  - Active tab highlighted (matching screenshot: Credit Card selected)
- Right panel: renders the appropriate field component for the selected method
- "Pay Now" button + lock icon at bottom-right of the card

`PROCESSING` — replaces the entire panel content
- Animated spinner (large)
- "Processing your payment…" text
- Shows method name and amount
- Lasts exactly 2 seconds (simulated via `setTimeout` in the mutation flow)
- No cancel/back available during processing

`SUCCESS` — not needed as a state (navigation replaces the page immediately)
- On success: `navigate('/order-confirmation/:orderId', { replace: true })` — the existing flow

`PAYMENT_FAILED` — replaces panel content after failure
- Error icon (red X)
- "Payment failed" heading
- Failure reason (e.g. "Card declined. Test card 4000000000000002 triggers a failure.")
- "Back to Checkout" button → `cancelOrder()` then `navigate('/checkout', { replace: true })`
- No retry on this page (per design decision: retry = restart checkout)

**Decorative background:**
- Full-viewport dark navy background matching screenshot
- Floating geometric shapes and book SVG illustrations as CSS pseudo-elements or inline SVGs
- The panel itself is a centered white/dark card with drop shadow

**Expected Outcomes:**
- `PaymentPage.tsx` fully rewritten to match screenshot layout
- All four UI states render correctly
- 2-second PROCESSING state shows between submit and result
- Failure state triggers order cancellation and redirects to checkout
- Success state navigates to order confirmation
- Form fields disabled during processing
- Method switching clears field errors

**Todo List:**
1. Design the two-column panel layout (method tabs left, fields right)
2. Implement the decorative full-page background (dark navy + CSS illustrations or inline SVG pattern)
3. Wire `simulatePayment()` + 2s delay into `handlePayNow()`
4. Implement PROCESSING state (replaces form)
5. Implement PAYMENT_FAILED state with cancellation CTA
6. Implement form validation on submit via `validatePaymentFields()`
7. Clear field errors when method changes
8. Guard: redirect to `/cart` if no orderId in router state
9. Guard: redirect to `/cart` if order not found / belongs to different user

**Relevant Context:**
- `src/pages/PaymentPage.tsx` — current implementation to replace
- `src/components/payment/` — field components from Sub-Task 4
- `src/lib/paymentSimulator.ts` — `simulatePayment()` from Sub-Task 1
- `src/lib/validatePayment.ts` — `validatePaymentFields()` from Sub-Task 2
- `src/hooks/useOrder.ts` — `useConfirmPayment`, `useCancelOrder`
- `src/components/ui/index.ts` — Spinner, Alert, PaymentErrorState

---

### Sub-Task 6 — Tests

**Status:** [ ] pending

**Intent:**
Add unit tests for all new pure utility functions and mock repository extensions.
No component rendering tests — keep to pure logic.

**Expected Outcomes:**
- `src/test/payment.test.ts` — new test file covering:
  - `simulatePayment()` — success cases (credit, debit, UPI, wallet), failure triggers
  - `validatePaymentFields()` — card number format, CVV, expiry, UPI format, wallet no-op
  - `MockOrderRepository.confirmPayment('failure')` — returns `status: 'failed'`, order stays 'pending'
  - `MockOrderRepository.confirmPayment('success')` — existing behaviour preserved
  - `MockOrderRepository.cancelOrder()` — order status becomes 'cancelled'
- Existing checkout.test.ts tests continue to pass (no regressions)

**Todo List:**
1. Create `src/test/payment.test.ts`
2. Test `simulatePayment()` for all four methods and both triggers
3. Test `validatePaymentFields()` for card (required, 16-digit, CVV, expiry format/past)
4. Test `validatePaymentFields()` for UPI (required, format)
5. Test `validatePaymentFields()` for wallet (always empty errors)
6. Test `MockOrderRepository` failure and cancellation paths

**Relevant Context:**
- `src/test/checkout.test.ts` — test file pattern and helper structure
- `src/test/pricing.test.ts` — pure function test pattern
- `src/lib/paymentSimulator.ts`, `src/lib/validatePayment.ts` (Sub-Tasks 1–2)
- `src/repositories/mock/MockOrderRepository.ts` (Sub-Task 3)

---

## Implementation Order

```
1 (PaymentSimulator) ─┐
2 (Validation)       ─┼─→ 4 (Field Components) ─┐
3 (Repo + Hooks)     ─┘                          ├─→ 5 (PaymentPage redesign) → 6 (Tests)
```

Sub-Tasks 1, 2, and 3 can all be developed in parallel.
Sub-Task 4 depends on 1 (for the failure-hint constant in CardFields).
Sub-Task 5 depends on 1, 2, 3, and 4 all being complete.
Sub-Task 6 can begin once 1, 2, and 3 are done (page tests last).
