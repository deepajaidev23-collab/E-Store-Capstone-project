# Checkout Feature Plan

## Top-Level Overview

Implement the **Checkout** feature for the e-book store. The checkout is a single-page, two-column layout
(matching the screenshot) that consolidates cart review, address entry, coupon application, reward-points
redemption, and order summary before navigating to the separate `/payment` page.

**Scope:**
- DB migrations: `addresses`, `orders`, `order_items`, `payments` tables with RLS
- New type additions for `Address` (already in `user.ts`) and order domain (already in `order.ts`)
- New repositories: `AddressRepository`, `OrderRepository`
- New React Query hooks: `useAddresses`, `useCreateOrder`, `useProfile` (reward points)
- `CheckoutPage` full implementation (replaces stub)
- `AddressPickerModal` component — saved address selection
- `AddressForm` component — new address entry with validation
- `RewardPointsToggle` component — apply/remove points in summary sidebar
- `PaymentPage` skeleton (method selection, confirm payment, navigate to confirmation)
- `OrderConfirmationPage` skeleton
- Edge-case guards: empty cart redirect, cart-change warning, coupon re-validation at submit,
  reward-points cap enforcement, authentication guard (already in router)

**Out of scope:**
- Real payment processor integration (mock payment confirmation only)
- Address CRUD management page (profile page, separate task)
- Order history / order detail pages (separate task)

---

## Checkout State Machine

```
mount
  └─ fetch cart + profile
       ├─ loading  → show skeleton
       ├─ error    → ErrorState + retry
       ├─ cart empty → redirect to /cart
       └─ ready    → Idle

Idle (user fills form / applies coupon / toggles points)
  └─ Pay Now clicked
       └─ validateAddress()
            ├─ invalid → mark fields, stay Idle
            └─ valid
                 └─ re-validate coupon (check expiry/active again)
                      ├─ expired/invalid → show inline error, clear coupon, stay Idle
                      └─ ok
                           └─ check reward points ≤ profile.reward_points && ≤ discountedTotal
                                ├─ exceeds → clamp to max, warn user
                                └─ ok
                                     └─ createOrder()
                                          ├─ DB error → OrderError state, show Alert, retry button
                                          └─ success → navigate('/payment', { state: { orderId } })
```

---

## Sub-Tasks

---

### Sub-Task 1 — DB Migrations: addresses, orders, order_items, payments

**Status:** [ ] pending

**Intent:**
Create the four missing tables with appropriate columns, foreign-key constraints, indexes, and Row Level
Security policies. These mirror the TypeScript types already defined in `src/types/user.ts` and
`src/types/order.ts`. No frontend code depends on this sub-task being done first, but the Supabase
repositories cannot function without it.

**Expected Outcomes:**
- Four new migration files under `supabase/migrations/`
- `addresses` table with all fields from `Address` type, `is_default` boolean, user-scoped RLS
- `orders` table with price snapshot columns, `reward_points_redeemed`, `coupon_id` FK (nullable), `status`
- `order_items` table with book snapshot columns (title, cover_url, price), quantity
- `payments` table with method enum, amount, status enum
- All tables secured: users can only read/write their own rows
- Indexes on `user_id` for addresses and orders, `order_id` for order_items and payments

**Todo List:**
1. Create `011_addresses_schema.sql` — `addresses` table with all `Address` fields
2. Create `012_orders_schema.sql` — `orders`, `order_items` tables; define `order_status` and `payment_method` and `payment_status` enums
3. Create `013_payments_schema.sql` — `payments` table
4. Create `014_checkout_rls.sql` — RLS policies for addresses, orders, order_items, payments
   - addresses: owner select/insert/update/delete (auth.uid() = user_id)
   - orders: owner select/insert; no update/delete from client
   - order_items: owner select via JOIN to orders; insert only
   - payments: owner select/insert; no update/delete from client
   - coupons already has public select; no change needed

**Relevant Context:**
- Existing migration files: `supabase/migrations/008–010` for pattern reference
- `src/types/user.ts` — `Address` interface (source of truth for columns)
- `src/types/order.ts` — `Order`, `OrderItem`, `Payment` interfaces (source of truth)
- `src/lib/database.types.ts` — must be updated to include new table types after migration

---

### Sub-Task 2 — database.types.ts Update

**Status:** [ ] pending

**Intent:**
Extend `src/lib/database.types.ts` to include the four new tables so that the Supabase client is
fully typed for `addresses`, `orders`, `order_items`, and `payments`.

**Expected Outcomes:**
- `Database['public']['Tables']` includes `addresses`, `orders`, `order_items`, `payments`
- Row and Insert types match the migration columns exactly
- Existing table definitions unchanged

**Todo List:**
1. Add `addresses` Row/Insert/Update types
2. Add `orders` Row/Insert/Update types (status enum as union string)
3. Add `order_items` Row/Insert types (no update; snapshots are immutable)
4. Add `payments` Row/Insert types (no update from client)

**Relevant Context:**
- `src/lib/database.types.ts` — existing pattern for table type definitions
- Sub-Task 1 migration columns define exact field names and nullability

---

### Sub-Task 3 — AddressRepository + OrderRepository

**Status:** [ ] pending

**Intent:**
Create two new repositories following the exact same interface + Supabase implementation + Mock
implementation pattern used by `CartRepository`. These are the data-access layer for checkout.

**Expected Outcomes:**
- `src/repositories/AddressRepository.ts` — interface with:
  - `getAddresses(userId): Promise<Address[]>`
  - `createAddress(userId, data): Promise<Address>`
  - `setDefault(addressId, userId): Promise<void>`
- `src/repositories/OrderRepository.ts` — interface with:
  - `createOrder(userId, payload): Promise<Order>`
  - `getOrder(orderId, userId): Promise<Order | null>`
- `src/repositories/supabase/SupabaseAddressRepository.ts`
- `src/repositories/supabase/SupabaseOrderRepository.ts`
  - `createOrder` must: insert order row, insert order_items rows, all in a single Supabase
    transaction (RPC or sequential inserts with error rollback awareness)
- `src/repositories/mock/MockAddressRepository.ts` — in-memory list
- `src/repositories/mock/MockOrderRepository.ts` — in-memory map
- `src/repositories/index.ts` updated to export `addressRepository` and `orderRepository`

**Todo List:**
1. Define `AddressRepository` interface
2. Implement `SupabaseAddressRepository` (getAddresses, createAddress, setDefault)
3. Implement `MockAddressRepository` with seed data (2 addresses, one default)
4. Define `OrderRepository` interface
5. Implement `SupabaseOrderRepository` (createOrder inserts order + items; getOrder joins items)
6. Implement `MockOrderRepository` (in-memory, simulates 200ms delay)
7. Update `src/repositories/index.ts` to export both repositories

**Relevant Context:**
- `src/repositories/CartRepository.ts` — interface pattern
- `src/repositories/supabase/SupabaseCartRepository.ts` — Supabase implementation pattern
- `src/repositories/mock/MockCartRepository.ts` — mock pattern
- `src/repositories/index.ts` — export pattern + VITE_USE_SUPABASE feature flag
- `src/repositories/supabase/errors.ts` — `RepositoryError` for error wrapping

---

### Sub-Task 4 — React Query Hooks: useAddresses, useCreateOrder, useProfile

**Status:** [ ] pending

**Intent:**
Add the three hooks needed by CheckoutPage. `useProfile` may already exist — verify first and
extend if needed to expose `reward_points`. `useAddresses` and `useCreateOrder` are new.

**Expected Outcomes:**
- `useProfile(userId)` — React Query query returning `Profile | null`; if it already exists in
  `src/hooks/useProfile.ts`, confirm it exposes `reward_points` and re-export from the hooks index
- `useAddresses(userId)` — query for saved addresses; disabled when no userId; query key
  `['addresses', userId]`
- `useCreateOrder()` — mutation; on success invalidates `['cart', userId]` (cart should be cleared
  after order creation); query key pattern consistent with existing hooks

**Todo List:**
1. Check `src/hooks/useProfile.ts` for existence and `reward_points` exposure — add if missing
2. Create `src/hooks/useAddresses.ts` — `useAddresses(userId)` query + `useCreateAddress()` mutation
3. Create `src/hooks/useOrder.ts` — `useCreateOrder()` mutation that calls `orderRepository.createOrder`
4. On successful `useCreateOrder`, invalidate `['cart', userId]` and call `cartRepository.clearCart`

**Relevant Context:**
- `src/hooks/useCart.ts` — hook pattern, query keys, optimistic update approach
- `src/hooks/useAuth.ts` — useAuth pattern
- `src/repositories/index.ts` — repository singletons to import

---

### Sub-Task 5 — AddressForm Component

**Status:** [ ] pending

**Intent:**
Create a controlled form component for entering a new delivery address. Matches the screenshot's
address section exactly: First Name, Last Name, Address Line, Email, City, Pin, Phone, State, Country.
Includes client-side validation with inline field errors.

**Expected Outcomes:**
- `src/components/checkout/AddressForm.tsx` exported
- Fields: `first_name`, `last_name`, `address_line`, `email`, `city`, `pin`, `phone`, `state`, `country`
- Country field defaults to "India" (matching screenshot)
- Phone field prefixed with "+91" label (matching screenshot)
- Validation rules:
  - All fields required
  - Email: valid format
  - Pin: 6 digits
  - Phone: 10 digits
- Errors shown inline below each field using existing `FormError` component
- Props: `value: Partial<ShippingAddressSnapshot>`, `onChange`, `errors: Record<string, string>`
- Pure presentational — no direct data fetching

**Todo List:**
1. Create `src/components/checkout/` directory
2. Create `AddressForm.tsx` with all fields, matching screenshot layout
3. Use existing `Input`, `FormField`, `FormError`, `Label` from `src/components/ui`
4. Export from `src/components/checkout/index.ts`

**Relevant Context:**
- `src/components/ui/index.ts` — available UI primitives (Input, FormField, FormError, Label)
- `src/types/order.ts` — `ShippingAddressSnapshot` type (field names)
- Screenshot shows the exact field layout (3-column grid for some rows)

---

### Sub-Task 6 — AddressPickerModal Component

**Status:** [ ] pending

**Intent:**
Create a modal that shows the user's saved address cards. When the "Use Saved Address" checkbox is
checked on CheckoutPage, this modal opens. Selecting an address fills the AddressForm and closes the modal.

**Expected Outcomes:**
- `src/components/checkout/AddressPickerModal.tsx`
- Props: `open: boolean`, `onClose()`, `addresses: Address[]`, `onSelect(address: Address)`,
  `loading: boolean`
- Shows a list of address cards (name, address_line, city, state, pin)
- Default address visually highlighted
- Empty state: "No saved addresses" with prompt to fill form manually
- Uses existing `Modal` component from `src/components/ui`

**Todo List:**
1. Create `AddressPickerModal.tsx`
2. Render each address as a selectable card
3. Highlight `is_default` address with a badge
4. On card click: call `onSelect(address)`, which parent maps to form fields
5. Export from `src/components/checkout/index.ts`

**Relevant Context:**
- `src/components/ui/index.ts` — `Modal`, `Card`, `Button`, `Text` components available
- `src/types/user.ts` — `Address` interface

---

### Sub-Task 7 — RewardPointsToggle Component

**Status:** [ ] pending

**Intent:**
Create a component for the order summary sidebar that displays the user's available reward points
and allows them to apply or remove them. Rule: 1 point = ₹1, capped at user's full available balance
and capped at the current `discountedTotal` (cannot go negative).

**Expected Outcomes:**
- `src/components/checkout/RewardPointsToggle.tsx`
- Props: `availablePoints: number`, `appliedPoints: number`, `maxRedeemable: number`,
  `onChange(points: number)`, `disabled: boolean`
- Shows "You have X reward points (worth ₹X)"
- Toggle button: "Apply Points" / "Remove Points"
- When applied: shows "−₹{appliedPoints}" as a line in the breakdown
- If `availablePoints === 0`: section is hidden entirely
- Clamping logic: `appliedPoints = Math.min(availablePoints, Math.floor(discountedTotal))`
  computed in parent (CheckoutPage), not in this component

**Todo List:**
1. Create `RewardPointsToggle.tsx`
2. Show available points and monetary value
3. Apply/remove toggle; disabled during order creation
4. Export from `src/components/checkout/index.ts`

**Relevant Context:**
- `src/types/user.ts` — `Profile.reward_points`
- `src/lib/pricing.ts` — `calcBreakdown` (parent uses this; toggle only displays)
- `src/components/ui/index.ts` — `Text`, `Button`

---

### Sub-Task 8 — CheckoutPage Full Implementation

**Status:** [ ] pending

**Intent:**
Replace the stub `CheckoutPage` with the full implementation matching the screenshot. This is the
main orchestration layer that composes all checkout components, manages checkout state, and drives
the order creation flow.

**Layout (two-column, matching screenshot):**
- **Left column:**
  1. "Shopping Cart" heading with item count badge (read-only list, no qty editing)
  2. Each item as horizontal ProductCard (same as CartPage but no stepper)
  3. "Address" section with "Use Saved Address" checkbox
  4. When checkbox unchecked: `AddressForm` for new address
  5. When checkbox checked: fills form from selected saved address (via `AddressPickerModal`)
- **Right column (sticky):**
  1. Decorative banner image (matching screenshot's book-pile graphic)
  2. "Grand Total" heading
  3. Price lines: `Price (N items)`, `Tax`, `Delivery Charges: Free`, `Discount` (if coupon applied),
     `Reward Points` (if applied), `Total Amount`
  4. Coupon input + Apply button (same UX as CartPage)
  5. `RewardPointsToggle`
  6. "Pay Now" button with lock icon

**State managed in CheckoutPage:**
- `addressForm: Partial<ShippingAddressSnapshot>` — form values
- `addressErrors: Record<string, string>` — validation errors
- `useSavedAddress: boolean` — checkbox state
- `addressPickerOpen: boolean` — modal open state
- `appliedCoupon: Coupon | null`
- `couponInput: string`
- `couponError: string | null`
- `couponLoading: boolean`
- `appliedPoints: number` — 0 or clamped to max
- `submitError: string | null` — order creation failure message

**Edge-case guards:**
1. **Empty cart guard** — if cart loads with 0 items, redirect to `/cart`
2. **Cart change detection** — if cart items fetched on mount differ from what was in CartPage
   (detected by comparing item count or total), show an inline `Alert` warning:
   "Your cart was updated. Please review before continuing."
3. **Coupon re-validation at submit** — before `createOrder`, call `getCoupon(code)` again;
   if null (expired/deactivated since page load): clear coupon, show error, abort submit
4. **Reward points exceeding balance** — `appliedPoints` is always clamped client-side to
   `Math.min(profile.reward_points, Math.floor(breakdown.discountedSubtotal - couponDiscount))`
5. **Address validation** — all fields required; email format; pin 6 digits; phone 10 digits;
   show inline errors on submit attempt
6. **Order creation failure** — show dismissible `Alert` with error message; "Pay Now" re-enabled for retry

**Pay Now flow:**
1. Validate address form → show errors if invalid
2. Re-validate coupon server-side
3. Clamp reward points
4. Call `createOrder` mutation with full payload
5. On success: `navigate('/payment', { state: { orderId: order.id } })`
6. On error: show `Alert`, stay on page

**Expected Outcomes:**
- Full checkout page renders and matches screenshot
- All edge cases handled with appropriate user-facing messages
- Navigates to `/payment` on success with `orderId` in router state

**Todo List:**
1. Read `src/pages/CartPage.tsx` for component/import patterns to reuse
2. Implement `CheckoutPage` with two-column layout
3. Wire `useCart`, `useProfile`, `useAddresses`, `useCreateOrder` hooks
4. Implement `validateAddressForm()` pure function in the component file
5. Implement `handlePayNow()` async handler with full edge-case sequence
6. Implement `handleApplyCoupon()` (reuse pattern from CartPage)
7. Render `AddressPickerModal` for saved address selection
8. Render `RewardPointsToggle` in summary sidebar
9. Implement cart-change detection on mount
10. Add loading skeleton (matching CartPage pattern)
11. Add error and empty states

**Relevant Context:**
- `src/pages/CartPage.tsx` — coupon UI, price breakdown, ProductCard usage, optimistic patterns
- `src/components/checkout/` — AddressForm, AddressPickerModal, RewardPointsToggle (from sub-tasks 5–7)
- `src/lib/pricing.ts` — `calcBreakdown`, `formatPrice`
- `src/types/order.ts` — `ShippingAddressSnapshot`, `PaymentMethod`
- `src/hooks/useCart.ts`, `useAddresses.ts`, `useOrder.ts`, `useProfile.ts`

---

### Sub-Task 9 — PaymentPage Implementation

**Status:** [ ] pending

**Intent:**
Implement the `/payment` page that receives `orderId` from router state (set by CheckoutPage on
`navigate`), presents payment method selection, and simulates payment confirmation. On success,
navigates to `/order-confirmation/:orderId`.

**Expected Outcomes:**
- Reads `orderId` from `location.state.orderId` (react-router); if missing, redirects to `/cart`
- Displays order amount (fetched via `useOrder(orderId)`)
- Payment method selector: radio group for `credit_card`, `debit_card`, `upi`, `wallet` (matching
  existing `PaymentMethod` type)
- "Confirm Payment" button
- On click: calls a `useConfirmPayment()` mutation (inserts a `payments` row with `status: 'success'`)
- On payment success: navigate to `/order-confirmation/${orderId}`
- On payment failure: show `PaymentErrorState` (component already exists in UI library) with retry

**Todo List:**
1. Add `confirmPayment(orderId, userId, method, amount)` to `OrderRepository` interface and implementations
2. Add `useConfirmPayment()` hook in `src/hooks/useOrder.ts`
3. Implement `PaymentPage` with method selector and confirm button
4. Handle missing `orderId` in state (guard redirect)
5. Show `PaymentErrorState` on failure with retry

**Relevant Context:**
- `src/components/ui/index.ts` — `PaymentErrorState` already exists
- `src/types/order.ts` — `PaymentMethod`, `Payment`
- `src/pages/CartPage.tsx` — Alert/error patterns

---

### Sub-Task 10 — OrderConfirmationPage Implementation

**Status:** [ ] pending

**Intent:**
Implement the `/order-confirmation/:orderId` page that shows a success message and order summary
after successful payment.

**Expected Outcomes:**
- Reads `:orderId` from URL params
- Fetches order via `useOrder(orderId)`
- Shows success icon, order ID, item list snapshot, and total
- "Continue Shopping" CTA → navigates to `/catalogue`
- "View Orders" CTA → navigates to `/orders`
- If order not found: `NotFoundState`

**Todo List:**
1. Implement `OrderConfirmationPage` with order summary display
2. Show each `OrderItem` snapshot (title, cover, price, quantity)
3. Show `ShippingAddressSnapshot` delivery address
4. Two CTAs: Continue Shopping, View Orders

**Relevant Context:**
- `src/types/order.ts` — `Order`, `OrderItem`, `ShippingAddressSnapshot`
- `src/hooks/useOrder.ts` — `useOrder(orderId)` hook
- `src/components/ui/index.ts` — `NotFoundState`, `ProductCard`, `Heading`, `Text`

---

### Sub-Task 11 — pricing.ts Extension: Reward Points

**Status:** [ ] pending

**Intent:**
Add a `calcRewardPointsDiscount` helper to `src/lib/pricing.ts` and extend `PriceBreakdown` to
include `rewardPointsDiscount` and `rewardPointsApplied`. Update `calcBreakdown` signature to accept
optional `rewardPoints` parameter. Update the existing test file accordingly.

**Expected Outcomes:**
- `calcBreakdown(items, coupon?, rewardPoints?)` returns extended `PriceBreakdown`
- `PriceBreakdown.rewardPointsDiscount: number` (= appliedPoints, since 1pt = ₹1)
- `PriceBreakdown.total` accounts for reward points discount after coupon discount
- `calcRewardPointsDiscount(availablePoints, discountedSubtotal): number` — clamps to floor of
  discountedSubtotal and to availablePoints
- `src/test/pricing.test.ts` — new tests for reward points scenarios

**Todo List:**
1. Add `calcRewardPointsDiscount()` to `src/lib/pricing.ts`
2. Extend `PriceBreakdown` interface
3. Update `calcBreakdown` to accept and apply `rewardPoints` parameter (backward-compatible: default 0)
4. Update `src/test/pricing.test.ts` with reward points test cases

**Relevant Context:**
- `src/lib/pricing.ts` — existing pure functions and `PriceBreakdown`
- `src/test/pricing.test.ts` — existing test patterns

---

## Implementation Order

The sub-tasks should be processed in this sequence to minimise blocking:

```
1 (migrations) → 2 (DB types) → 3 (repositories) → 4 (hooks) → 11 (pricing)
                                                              ↓
                                              5+6+7 (components) → 8 (CheckoutPage)
                                                                         ↓
                                                              9 (PaymentPage) → 10 (ConfirmationPage)
```

Sub-tasks 5, 6, 7, and 11 can be developed in parallel once sub-tasks 1–4 are done.
