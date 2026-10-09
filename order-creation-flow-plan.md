# Order Creation Flow — Plan

## Top-Level Overview

This plan defines the complete, hardened flow from **Cart → Checkout → Payment →
Confirmation**, along with explicit handling for every failure scenario identified.

The work is scoped to the **frontend** (`e-book-store-fe/src`) plus the database-side
artefacts needed to make the flow atomic and consistent:

- A Supabase **RPC** that inserts `orders` + `order_items` in one transaction.
- A Supabase **trigger** that promotes an order from `pending` to `confirmed` when a
  successful payment row is recorded.
- Frontend guards: pre-flight cart validation, payment idempotency key, and UI
  submission locking.

### What is NOT in scope
- Real payment processor or PCI-DSS compliance.
- Server-side price enforcement beyond what the RPC calculates.
- Saved / tokenised payment methods.
- SMS / OTP verification.
- Reward-point balance enforcement (already handled client-side).

---

## Full Flow Diagram

```
Cart
 └─► CheckoutPage
       ├─ [Pre-flight validation] re-fetch cart + book data
       │     ├─ stale price       → block + notify
       │     ├─ quantity reduced  → block + notify
       │     ├─ invalid/deleted   → block + notify
       │     └─ unavailable       → block + notify
       ├─ createOrder (Supabase RPC — atomic)
       │     └─ failure → show error, stay on Checkout
       └─► PaymentPage  (state: { orderId })
             ├─ validate fields (client)
             ├─ simulate payment
             ├─ confirmPayment (insert payment row + idempotency key)
             │     ├─ success outcome
             │     │     ├─ DB trigger sets order.status = 'confirmed'
             │     │     ├─ clearCart (best-effort, silent on failure)
             │     │     └─► /order-confirmation/:orderId
             │     └─ failure outcome
             │           ├─ payment row recorded (status = 'failed')
             │           └─ user sees failure UI → retry or cancel
             └─ Cancel → cancelOrder → /checkout
```

---

## Sub-Tasks

---

### Sub-Task 1 — Supabase RPC: atomic order creation

**Status:** `[ ] pending`

**Intent**

Replace the two independent `orders` + `order_items` inserts in
`SupabaseOrderRepository.createOrder()` with a single call to a Postgres function that
wraps both inserts inside one transaction. This eliminates the partial-creation gap where
an order row exists but has no items.

**Expected Outcomes**
- A Postgres function `create_order_with_items(...)` exists and is callable via
  `this.client.rpc('create_order_with_items', payload)`.
- The function accepts order header fields and a JSON array of items.
- On any error (e.g., FK violation on `book_id`), the entire transaction rolls back —
  no orphan order row or orphan item rows are left.
- `SupabaseOrderRepository.createOrder()` calls the RPC instead of two separate inserts.
- `MockOrderRepository.createOrder()` behaviour is unchanged (it is already in-memory
  atomic).

**Todo List**
1. Write the SQL for `create_order_with_items` — it should:
   - Accept order-header columns as parameters.
   - Accept a `JSONB` array of item objects `{book_id, title, cover_url, price, quantity}`.
   - Insert into `orders`, capture the generated `id`.
   - Insert each item into `order_items` using the captured `id`.
   - Return the full order row (or the new order ID at minimum).
2. Apply the migration to the Supabase project.
3. Update `SupabaseOrderRepository.createOrder()` to call `this.client.rpc(...)` and map
   the returned data through the existing `mapOrder` / `mapOrderItem` helpers.
4. Remove the now-redundant separate `orders` and `order_items` insert blocks.
5. Verify that `throwOnError` is called on the RPC result.

**Relevant Context**
- `e-book-store-fe/src/repositories/supabase/SupabaseOrderRepository.ts` — lines 96–165
  contain the two separate inserts to be replaced.
- `mapOrder` and `mapOrderItem` helpers are in the same file.
- `OrderRepository.ts` docstring already says "single transaction" — this fulfils that
  contract.

---

### Sub-Task 2 — DB trigger: auto-confirm order on successful payment

**Status:** `[ ] pending`

**Intent**

Remove the gap between the Supabase and mock implementations: the mock updates
`order.status = 'confirmed'` inside `confirmPayment`, but the Supabase implementation
only inserts a payment row. A Postgres trigger on `payments` makes the DB side
self-consistent without requiring the client to issue a second update call.

**Expected Outcomes**
- A `BEFORE INSERT` (or `AFTER INSERT`) trigger on `payments` sets
  `orders.status = 'confirmed'` when `NEW.status = 'success'`.
- `SupabaseOrderRepository.confirmPayment()` requires no change in logic — it inserts the
  payment row and the trigger fires automatically.
- `getOrder()` after a successful payment returns `status: 'confirmed'`.
- A failed payment (`status = 'failed'`) leaves the order in `pending`.

**Todo List**
1. Write the SQL trigger function `handle_payment_success()` that updates `orders.status`
   to `'confirmed'` where `id = NEW.order_id` when `NEW.status = 'success'`.
2. Attach the trigger to the `payments` table as `AFTER INSERT`.
3. Apply the migration.
4. Update `MockOrderRepository.confirmPayment()` to keep parity: it already does this
   correctly — confirm there is no divergence.

**Relevant Context**
- `SupabaseOrderRepository.ts` `confirmPayment` (lines ~197–207) — only inserts.
- `MockOrderRepository.ts` `confirmPayment` (lines ~100–102) — updates order status.
- `OrderConfirmationPage.tsx` fetches the order and will naturally pick up the new status
  once the trigger fires.

---

### Sub-Task 3 — Pre-flight cart validation before order creation

**Status:** `[ ] pending`

**Intent**

Before `CheckoutPage` calls `createOrder`, re-fetch the live book data for every item in
the cart and compare it against the cart snapshot. If any item fails a check, block the
order with a clear per-item error message. This is the system's only price/availability
guard (server-side enforcement is out of scope).

**Expected Outcomes**
- A reusable validation function (e.g., `validateCartItems`) compares each cart item
  against its live book record and returns a list of problems.
- The following conditions are detected and reported:
  - **Stale price** — `cart item price !== book.price`.
  - **Quantity reduced** — `cart item quantity > book.stock_quantity` (if the data model
    exposes stock).
  - **Invalid / deleted book** — `book` is `null` or not found.
  - **Unavailable book** — `book.is_available === false` (or equivalent field).
- `CheckoutPage` runs validation just before calling `createOrder` and aborts with an
  inline error list if any problems are found; the user is prompted to review their cart.
- Passing validation is a precondition; the mutation is only fired once validation passes.

**Todo List**
1. Examine the `CartItem` and `Book` types to identify which fields cover price, stock,
   availability, and soft-delete.
2. Write a pure `validateCartItems(items: CartItem[]): ValidationError[]` function in
   `e-book-store-fe/src/lib/`.
3. In `CheckoutPage`, replace the current `filter(i => !!i.book)` guard with a call to
   `validateCartItems` — trigger a `refetchCart` immediately before running validation to
   get the freshest data.
4. Display per-item error messages inline in the checkout summary; include a "Go to Cart"
   shortcut to fix issues.
5. Ensure that the submit button is disabled while validation runs.

**Relevant Context**
- `CheckoutPage.tsx` (lines ~61–255) — the current submit handler and `orderItems`
  construction.
- `CartRepository.ts` — `getCart` returns `CartItem[]` with an embedded `book` join;
  `refetchCart` is already available from `useCart`.
- `types/order.ts` — `CreateOrderPayload` item shape for reference.

---

### Sub-Task 4 — Payment idempotency key

**Status:** `[ ] pending`

**Intent**

Prevent a user from being double-charged if they tap "Pay Now" twice or if a network
retry re-submits the same payment. A client-generated idempotency key is attached to each
`confirmPayment` call; the DB enforces uniqueness on this key so a second insert with the
same key is a no-op (or upsert) rather than a second charge.

**Expected Outcomes**
- A UUID idempotency key is generated once per payment attempt on the PaymentPage and
  stored in component state (not regenerated on re-render).
- `confirmPayment` accepts an optional `idempotency_key` parameter.
- `SupabaseOrderRepository.confirmPayment()` passes the key to the Supabase insert.
- The `payments` table has a `UNIQUE` constraint on `idempotency_key`.
- If a duplicate key is supplied (Postgres error `23505`), the repository catches it,
  fetches the existing payment row, and returns it — same result, no second charge.
- `MockOrderRepository.confirmPayment()` accepts the parameter but does not enforce
  uniqueness (in-memory mocks are single-session; deduplication here is low value).
- The UI submit button is disabled for the duration of the mutation (already done via
  React Query's `isPending` state — verify it is wired correctly).

**Todo List**
1. Add a `UNIQUE` constraint and `idempotency_key TEXT` column to `payments` via
   migration.
2. Extend `OrderRepository.confirmPayment()` signature with an optional
   `idempotencyKey?: string` parameter.
3. Update `SupabaseOrderRepository.confirmPayment()` to include `idempotency_key` in the
   insert payload and handle `23505` by fetching and returning the existing row.
4. Update `MockOrderRepository.confirmPayment()` to accept the parameter (ignored).
5. Generate a UUID in `PaymentPage` using `useRef` or `useState` (initialised once, not
   regenerated) and pass it to `useConfirmPayment`.
6. Update `useConfirmPayment` and its `ConfirmPaymentVariables` type to include the key.

**Relevant Context**
- `OrderRepository.ts` — `confirmPayment` interface definition.
- `SupabaseOrderRepository.ts` `confirmPayment` (lines ~197–207).
- `MockOrderRepository.ts` `confirmPayment` (lines ~80–115).
- `useOrder.ts` `useConfirmPayment` and `ConfirmPaymentVariables`.
- `PaymentPage.tsx` `handlePayNow` — the key must be generated before the user clicks.

---

### Sub-Task 5 — Duplicate submission UI lock

**Status:** `[ ] pending`

**Intent**

Prevent a second "Pay Now" click from firing while a payment confirmation is in-flight.
Also ensure that the Checkout "Place Order" button cannot be re-clicked while
`createOrder` is pending.

**Expected Outcomes**
- The "Pay Now" button is disabled and shows a loading indicator whenever
  `confirmMutation.isPending` is `true`.
- The "Place Order" button in `CheckoutPage` is disabled whenever
  `createOrderMutation.isPending` is `true`.
- Navigating away (browser back) while a mutation is pending does not leave a dangling
  pending order — `cancelOrder` is called in a `useEffect` cleanup if the component
  unmounts while the order exists and the payment has not completed.

**Todo List**
1. Audit `PaymentPage.tsx`: confirm the Pay Now button uses `confirmMutation.isPending`
   to disable itself; add the indicator if missing.
2. Audit `CheckoutPage.tsx`: confirm the Place Order button uses
   `createOrderMutation.isPending`; add if missing.
3. In `PaymentPage`, add a `useEffect` cleanup that calls `cancelOrder` if the component
   unmounts with an in-flight or unconfirmed order (i.e., `orderId` is set and
   `pageState` is still `'idle'` or `'processing'`).
4. Ensure the Cancel button is also disabled while `confirmMutation.isPending` so the
   user cannot simultaneously pay and cancel.

**Relevant Context**
- `PaymentPage.tsx` `handlePayNow` and button rendering.
- `CheckoutPage.tsx` submit handler and Place Order button.
- `useOrder.ts` `useCancelOrder` hook.

---

### Sub-Task 6 — Order confirmation page status guard

**Status:** `[ ] pending`

**Intent**

`OrderConfirmationPage` currently renders success unconditionally after a navigation to
`/order-confirmation/:orderId`. If a user navigates directly to that URL with a
`pending` or `cancelled` order ID, they would see the success page incorrectly. Add a
status check to guard the display.

**Expected Outcomes**
- If `order.status !== 'confirmed'`, the page shows an appropriate state:
  - `pending` → brief "Processing your payment…" spinner with auto-refresh.
  - `cancelled` → "This order was cancelled" message with a link back to the catalogue.
  - `null / error` → existing error state.
- If the order is not found or does not belong to the user, show the error state
  (already handled by `useOrder` returning `null`).

**Todo List**
1. In `OrderConfirmationPage`, read `order.status` after load.
2. Render a "Processing" state for `status === 'pending'` — poll `useOrder` every few
   seconds by passing `refetchInterval` to the query (e.g., 3 s, max 5 retries).
3. Render a "Cancelled" state for `status === 'cancelled'`.
4. Only render the full confirmation view when `status === 'confirmed'`.
5. Update `useOrder` to accept an optional `refetchInterval` option, or pass it directly
   in the page.

**Relevant Context**
- `OrderConfirmationPage.tsx` — current unconditional success render.
- `useOrder.ts` — `useQuery` wrapper; `refetchInterval` is a built-in React Query option.
- `types/order.ts` — `OrderStatus` union for the guard conditions.

---

### Sub-Task 7 — Cart clearing: best-effort with error logging

**Status:** `[ ] pending`

**Intent**

The current `useCreateOrder.onSuccess` already attempts `clearCart` and silently swallows
failures. Formalise this: log the failure so it is observable, and ensure that the cart
visually clears for the user even if the remote `clearCart` call fails (optimistic
invalidation).

**Expected Outcomes**
- If `clearCart` throws, the error is logged (e.g., `console.error`) before being
  swallowed — no change to user-visible flow.
- `queryClient.invalidateQueries` for the cart key is called regardless of whether
  `clearCart` succeeded, so the UI reflects the emptied state.
- A comment in code documents the intentional best-effort approach.

**Todo List**
1. In `useOrder.ts` `useCreateOrder.onSuccess`, wrap the `clearCart` call in
   `try/catch`.
2. In the `catch` block, add `console.error('clearCart failed after order creation', e)`.
3. Move `queryClient.invalidateQueries` outside the `try` so it always runs.
4. Add a brief comment: `// Cart clear is best-effort; order is already confirmed`.

**Relevant Context**
- `useOrder.ts` `useCreateOrder` (lines ~22–40).
- `cartRepository.clearCart` is defined in `CartRepository.ts`.

---

### Sub-Task 8 — Failure scenario documentation and test coverage

**Status:** `[ ] pending`

**Intent**

Document every failure scenario in one place and add tests that cover the new guards
introduced in the previous sub-tasks. This makes the system's failure behaviour explicit
and prevents regressions.

**Expected Outcomes**
- `order-creation-flow-plan.md` (this file) serves as the authoritative failure-scenario
  reference (see section below).
- `payment.test.ts` is extended (or a new test file created) to cover:
  - Pre-flight validation: stale price, unavailable book, deleted book.
  - Idempotency: duplicate `confirmPayment` call with same key returns same payment.
  - Confirmation page: renders "Processing" for `pending`, "Cancelled" for `cancelled`.

**Todo List**
1. Extend `e-book-store-fe/src/test/payment.test.ts` or create
   `e-book-store-fe/src/test/orderFlow.test.ts`.
2. Add unit tests for `validateCartItems` covering each failure condition.
3. Add a test for the idempotency deduplication path in `MockOrderRepository`
   (even if not enforced, the parameter is passed through without error).
4. Add component-level tests for `OrderConfirmationPage` for `pending` and `cancelled`
   states.

**Relevant Context**
- `e-book-store-fe/src/test/payment.test.ts` — existing test patterns to follow.
- `MockOrderRepository.ts` — in-memory test double for order/payment scenarios.
- `MockCartRepository.ts` — for pre-flight validation tests.

---

## Failure Scenario Reference

| Scenario | When it occurs | System response |
|---|---|---|
| **Duplicate submission** | User clicks Pay Now twice | Idempotency key on `payments` (DB unique constraint); second insert returns existing row. UI button disabled while `isPending`. |
| **Payment succeeds, order creation fails** | RPC throws after payment simulation | Impossible: order is created BEFORE payment. Payment is only offered if a valid `orderId` exists. |
| **Order RPC fails** | DB error during `create_order_with_items` | Full rollback — no partial order. User stays on Checkout and sees an error. |
| **Order creation succeeds, cart clearing fails** | `clearCart` network error | Silent best-effort: error is logged, cart query is invalidated anyway, user sees confirmation. Cart resets on next visit. |
| **Stale price** | Book price changed between cart add and checkout | Pre-flight re-fetch detects mismatch; order blocked with inline error and "Go to Cart" link. |
| **Quantity exceeds stock** | Stock reduced after item was added | Pre-flight re-fetch detects quantity > stock; order blocked with inline error. |
| **Invalid / deleted book** | Book removed from catalogue | Pre-flight detects `book === null`; order blocked. |
| **Unavailable book** | Book marked unavailable | Pre-flight detects `is_available === false`; order blocked. |
| **Payment simulation failure** | Test trigger card/UPI used | Payment row inserted with `status = 'failed'`; order remains `pending`; user sees failure UI with retry option. |
| **User retries after payment failure** | User clicks Pay Now again | New payment row inserted (new idempotency key generated for retry attempt — key is regenerated on entering the `failed` state). |
| **User cancels** | User clicks Cancel on PaymentPage | `cancelOrder` sets `status = 'cancelled'`; user navigated to `/checkout`. |
| **User navigates away mid-payment** | Browser back / unmount | `useEffect` cleanup calls `cancelOrder` if order is unconfirmed. |
| **Direct URL access to confirmation** | User hits `/order-confirmation/:id` manually | Page checks `order.status`; polls if `pending`, shows "Cancelled" if cancelled. |
| **Stale orderId in navigation state** | Page refresh on PaymentPage clears state | Guard in `useEffect` detects empty `orderId` and redirects to `/cart`. |

---

## Data Consistency Model

```
Order Lifecycle State Machine

  [Cart] ──createOrder (RPC)──► [pending]
                                    │
                           confirmPayment (success)
                                    │
                              DB trigger fires
                                    │
                                    ▼
                              [confirmed] ──► future: shipped, delivered
                                    
  [pending] ──cancelOrder──► [cancelled]
  [pending] ──payment failure──► stays [pending] (retryable)
```

**Consistency guarantees:**
- Order creation is atomic (RPC): either both the order row and all items exist, or neither does.
- Order status transition to `confirmed` is owned by the database trigger — the client
  cannot set it directly.
- Payment amount is carried from the pre-created order record on the server; the client
  reads `order.total` and passes it to `confirmPayment`, but the trigger or the RPC could
  independently re-verify if needed in a future iteration.
- Cart clearing is explicitly non-atomic with order confirmation by design; it is a
  UX convenience operation and its failure does not affect order integrity.
