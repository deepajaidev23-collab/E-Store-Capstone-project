# Bibliophile — Shopping Cart Feature Plan

## Top-Level Overview

**Goal:** Implement a fully functional, Supabase-persisted shopping cart for
authenticated users. Users can add books from the Book Detail page, view and
manage items at `/cart`, update quantities, remove items, apply coupon codes,
and see a live-calculated order summary (subtotal, discount, tax, shipping,
total). Calculation logic lives in a pure `src/lib/pricing.ts` module —
completely decoupled from React components so it can be unit-tested without
rendering.

**Scope:**
- Pure calculation module `src/lib/pricing.ts` — subtotal, coupon discount,
  tax, shipping, total — all as plain functions
- SQL migrations: `carts` + `cart_items` tables, indexes, RLS
- `database.types.ts` extended with `carts` and `cart_items`
- `CartRepository` interface (7 methods) — separate from `BookRepository`
  and `WishlistRepository` (same auth-gated rationale)
- `SupabaseCartRepository` + `MockCartRepository` implementations
- React Query hooks: `useCart`, `useAddToCart`, `useRemoveFromCart`,
  `useUpdateQuantity`, `useClearCart`, `useIsInCart`
- Optimistic updates on add, remove, and quantity change
- Full `CartPage` — item list, quantity stepper, remove, order summary panel
- `BookDetailPage.handleAddToCart` wired to real mutation
- Coupon validation and application via Supabase `coupons` table
- Navbar cart badge showing item count
- Tests for pricing functions and `MockCartRepository`

**Constraints:**
- `BookRepository` and `WishlistRepository` interfaces must not change
- All 90 existing tests must continue to pass
- No hardcoded colour or spacing values — CSS custom property tokens only
- `CheckoutPage` is out of scope for this phase — cart items feed into it
  but the checkout form itself is a separate plan
- `WishlistPage` "Move to Cart" button will be wired in this phase (it was
  stubbed in the Wishlist phase)

**Key architecture decision — pure pricing module:**
Cart totals involve multiple interacting calculations (subtotal → discount →
tax → shipping → total). Moving these into a plain TypeScript module with
no React dependencies allows: (a) unit testing every edge case without
rendering, (b) reuse in `CheckoutPage` and `OrderConfirmationPage` without
re-fetching, and (c) server-side replication in SQL for order creation.

---

## Calculation Rules (extracted from screenshots)

| Line | Rule |
|---|---|
| Subtotal | Sum of `item.book.price × item.quantity` for all items |
| Tax | 10% of subtotal (after discount) — display as `₹XX` |
| Delivery charges | Free when subtotal ≥ ₹500, otherwise ₹49 |
| Coupon — flat | Subtract `coupon.discount_value` from subtotal; min ₹0 |
| Coupon — percent | Subtract `coupon.discount_value %` of subtotal; min ₹0 |
| Total | `subtotal − discount + tax + delivery_charge` |

These rules are constants in `src/lib/pricing.ts`. They can be changed in one
place without touching any component.

---

## Sub-Tasks

---

### Sub-Task 1 — Pure Pricing Module `src/lib/pricing.ts`

**Intent:**
Extract all cart calculation logic into a single pure module with no imports
from React, repositories, or UI code. Every export is a plain function that
takes typed inputs and returns a number or a structured result object. This is
the most important architectural separation in the cart feature.

**Expected Outcomes:**
- `src/lib/pricing.ts` exports:
  - `calcSubtotal(items: CartItem[]): number`
  - `calcDiscount(subtotal: number, coupon: Coupon | null): number`
  - `calcTax(subtotalAfterDiscount: number): number` — 10%
  - `calcDelivery(subtotalAfterDiscount: number): number` — ₹0 if ≥ ₹500, else ₹49
  - `calcTotal(breakdown: CartBreakdown): number`
  - `calcBreakdown(items: CartItem[], coupon: Coupon | null): CartBreakdown`
    — returns `{ subtotal, discount, tax, delivery, total }` in one call
  - `TAX_RATE`, `FREE_DELIVERY_THRESHOLD`, `DELIVERY_CHARGE` as exported
    named constants
- `CartBreakdown` is a TypeScript interface exported from the same file
- The module has zero side effects — all functions are pure
- `npm run typecheck` passes with no errors in this file

**Interface:**
```ts
export interface CartBreakdown {
  subtotal:  number   // sum of item prices × quantities
  discount:  number   // coupon reduction (≥ 0)
  tax:       number   // 10% of (subtotal − discount)
  delivery:  number   // 0 or DELIVERY_CHARGE
  total:     number   // subtotal − discount + tax + delivery
}
```

**Todo List:**
1. Create `src/lib/pricing.ts` with constants `TAX_RATE = 0.10`,
   `FREE_DELIVERY_THRESHOLD = 500`, `DELIVERY_CHARGE = 49`.
2. Implement `calcSubtotal(items)` — accumulate `price × quantity`.
   Use `item.book?.price ?? 0` (book embed may be absent).
3. Implement `calcDiscount(subtotal, coupon)` — handle `null` coupon,
   `'flat'` discount type, `'percent'` discount type; clamp to `[0, subtotal]`.
   Apply `min_order_value` guard: return 0 if subtotal < min_order_value.
4. Implement `calcTax(subtotalAfterDiscount)` — `Math.round(x * TAX_RATE)`.
5. Implement `calcDelivery(subtotalAfterDiscount)` — `0` if `≥ threshold`,
   else `DELIVERY_CHARGE`.
6. Implement `calcTotal(breakdown)`.
7. Implement `calcBreakdown(items, coupon)` composing the above.
8. Export `CartBreakdown` interface.

**Relevant Context:**
- `src/types/cart.ts` — `CartItem`, `Coupon` types
- Screenshots: Payment & Purchase page shows Price, Tax, Delivery Charges,
  Discount, Total Amount rows
- `src/components/ui/Table.tsx` `SummaryRow` — used to display the breakdown

**Status:** `[ ] pending`

---

### Sub-Task 2 — Pricing Tests `src/test/pricing.test.ts` (extend)

**Intent:**
The existing `src/test/pricing.test.ts` already tests 3 cases. Extend it with
comprehensive coverage of every `pricing.ts` function: edge cases like empty
cart, zero-value coupon, subtotal exactly at delivery threshold, percent
discount that would go negative.

**Expected Outcomes:**
- `src/test/pricing.test.ts` covers all exported functions from `pricing.ts`
  with at least 20 test cases total.
- All 90 + new tests pass in `npm test -- --run`.

**Todo List:**
1. Read the existing `src/test/pricing.test.ts` (currently tests 3 simple
   price-formatting cases).
2. Add `describe` blocks for `calcSubtotal`, `calcDiscount`, `calcTax`,
   `calcDelivery`, `calcBreakdown` with edge-case coverage:
   - Empty items array → subtotal = 0
   - Flat coupon: correct, exceeds subtotal (clamp to 0), min_order_value not met
   - Percent coupon: correct, 100% edge case
   - Delivery free at threshold, free above, charged below
   - Tax rounds to integer
   - `calcBreakdown` returns all five fields correctly composed

**Relevant Context:**
- `src/test/pricing.test.ts` — existing 3 tests; add to this file
- `src/lib/pricing.ts` — the module under test (Sub-Task 1)

**Status:** `[ ] pending`

---

### Sub-Task 3 — SQL Migrations: `carts` + `cart_items` + `coupons`

**Intent:**
Create the Postgres tables for the cart. Design mirrors the wishlist pattern
(one cart per user, lazily created) but adds a `quantity` column on
`cart_items`. The `coupons` table already exists in the domain types —
it needs to be created in the DB. A unique constraint on
`(cart_id, book_id)` prevents duplicate items; adding the same book
increments quantity instead (handled in the repository, not the DB).

**Expected Outcomes:**
- `supabase/migrations/008_carts_schema.sql` creates `carts` and `cart_items`.
- `supabase/migrations/009_coupons_schema.sql` creates `coupons`.
- `supabase/migrations/010_carts_rls.sql` enables RLS on `carts`,
  `cart_items`, and `coupons` with correct policies.
- All migrations are idempotent (`create if not exists`, `do $$ ... $$`).

**Table designs:**

```
carts
  id         uuid pk default gen_random_uuid()
  user_id    uuid not null references auth.users(id) on delete cascade
  created_at timestamptz not null default now()
  unique(user_id)                          ← one cart per user

cart_items
  id       uuid pk default gen_random_uuid()
  cart_id  uuid not null references carts(id) on delete cascade
  book_id  uuid not null references books(id) on delete cascade
  quantity integer not null default 1 check (quantity > 0)
  added_at timestamptz not null default now()
  unique(cart_id, book_id)                 ← no duplicate books; qty handled in app

coupons
  id               uuid pk default gen_random_uuid()
  code             text not null unique
  discount_type    text not null check (discount_type in ('flat','percent'))
  discount_value   numeric(10,2) not null
  min_order_value  numeric(10,2)
  expires_at       timestamptz
  is_active        boolean not null default true
```

**Indexes needed:**
- `cart_items_cart_idx` on `cart_items(cart_id, added_at desc)` — powers `getCart()`
- `coupons_code_idx` on `coupons(code)` where `is_active = true` — powers coupon lookup

**RLS policies:**

| Table | Operation | Policy |
|---|---|---|
| `carts` | SELECT/INSERT/DELETE | `auth.uid() = user_id` |
| `cart_items` | SELECT/INSERT/UPDATE/DELETE | User owns parent cart |
| `coupons` | SELECT | `auth.role() = 'authenticated' AND is_active = true` |

Note: `cart_items` needs UPDATE (for quantity changes) — unlike `wishlist_items`.

**Todo List:**
1. Create `supabase/migrations/008_carts_schema.sql` — `carts`, `cart_items`,
   2 indexes.
2. Create `supabase/migrations/009_coupons_schema.sql` — `coupons` table,
   code uniqueness index.
3. Create `supabase/migrations/010_carts_rls.sql` — 3 policies for `carts`,
   4 policies for `cart_items` (SELECT/INSERT/UPDATE/DELETE), 1 for `coupons`.

**Relevant Context:**
- `supabase/migrations/006_wishlists_schema.sql` — structural pattern
- `supabase/migrations/007_wishlists_rls.sql` — RLS pattern
- `src/types/cart.ts` — `Cart`, `CartItem`, `Coupon` domain types
- Phase 6 plan (`bibliophile-supabase-repository-plan.md`) §3 — `carts`,
  `cart_items`, `coupons` column designs

**Status:** `[ ] pending`

---

### Sub-Task 4 — Extend `database.types.ts`

**Intent:**
Add `carts`, `cart_items`, and `coupons` table type shapes to the hand-written
Database stub.

**Expected Outcomes:**
- `src/lib/database.types.ts` has `Row`, `Insert`, `Update` for `carts`,
  `cart_items`, and `coupons`.
- `npm run typecheck` passes cleanly.

**Todo List:**
1. Add `carts` entry — Row: `{ id, user_id, created_at }`.
2. Add `cart_items` entry — Row: `{ id, cart_id, book_id, quantity, added_at }`.
   Insert requires `quantity` with a default of 1.
3. Add `coupons` entry — Row matching `Coupon` domain type exactly.

**Relevant Context:**
- `src/lib/database.types.ts` — add alongside the existing 7 table entries
- `src/types/cart.ts` — `Cart`, `CartItem`, `Coupon` types to match

**Status:** `[ ] pending`

---

### Sub-Task 5 — `CartRepository` Interface

**Intent:**
Define the `CartRepository` interface. Kept separate from `BookRepository`
and `WishlistRepository` — same auth-gated rationale. Includes coupon
validation as a repository method because the coupons table lives in Supabase.

**Repository contract:**

```ts
interface CartRepository {
  /** All cart items for the user, newest-first, with embedded Book. */
  getCart(userId: string): Promise<CartItem[]>

  /**
   * Add a book to the cart. If the book is already present, increment
   * quantity by 1 (or by `quantity` if provided). Idempotent — never
   * creates a duplicate row.
   */
  addToCart(userId: string, bookId: string, quantity?: number): Promise<CartItem>

  /** Remove a single cart item by item id. */
  removeFromCart(itemId: string): Promise<void>

  /**
   * Set the quantity of a cart item. Throws if quantity < 1.
   * Use removeFromCart to delete an item.
   */
  updateQuantity(itemId: string, quantity: number): Promise<CartItem>

  /** Remove all items from the user's cart. */
  clearCart(userId: string): Promise<void>

  /** Returns true if the book is already in the user's cart. */
  isInCart(userId: string, bookId: string): Promise<boolean>

  /**
   * Validate a coupon code and return the Coupon if valid.
   * Returns null if the code is not found or inactive.
   * Throws RepositoryError on network/db failure.
   */
  validateCoupon(code: string): Promise<Coupon | null>
}
```

**Todo List:**
1. Create `src/repositories/CartRepository.ts` with the interface above and
   full JSDoc comments.
2. Export from `src/repositories/index.ts`.

**Relevant Context:**
- `src/repositories/WishlistRepository.ts` — structural pattern
- `src/types/cart.ts` — `Cart`, `CartItem`, `Coupon`

**Status:** `[ ] pending`

---

### Sub-Task 6 — `SupabaseCartRepository` Implementation

**Intent:**
Implement all 7 methods of `CartRepository` using the Supabase client. Uses
the same `getOrCreateCart(userId)` upsert helper pattern as
`SupabaseWishlistRepository.getOrCreateWishlist`. The critical difference from
the wishlist is `addToCart` must upsert quantity rather than reject duplicates:
if a row already exists for `(cart_id, book_id)`, increment its quantity.

**Expected Outcomes:**
- `src/repositories/supabase/SupabaseCartRepository.ts` implements
  `CartRepository` with all 7 methods.
- `getCart` embeds the full `Book` object (same BOOK_SELECT pattern as
  SupabaseWishlistRepository).
- `addToCart` uses a Postgres UPSERT with `onConflict: 'cart_id,book_id'`
  and increments the existing quantity using an RPC or a read-modify-write
  sequence. Recommended: read existing item; if present, call `updateQuantity`;
  if not, insert. This avoids Postgres arithmetic in PostgREST.
- `updateQuantity` throws `RepositoryError` if `quantity < 1`.
- `validateCoupon` queries by `code` and checks `is_active = true` and
  `expires_at` is null or in the future.
- All methods call `throwOnError()` before any data access.
- No `as any` on field accesses — all query data cast via `CartItemQueryRow`.

**Query design for `addToCart` (upsert with quantity increment):**
```
1. getOrCreateCart(userId) → cartId
2. SELECT from cart_items WHERE cart_id = cartId AND book_id = bookId
3. If exists: UPDATE SET quantity = existing.quantity + qty WHERE id = item.id
4. If not:    INSERT { cart_id, book_id, quantity: qty }
5. Return the final item with book embed
```

**Todo List:**
1. Create `src/repositories/supabase/SupabaseCartRepository.ts`.
2. Define `CartItemQueryRow` (mirrors `WishlistItemQueryRow` but adds
   `quantity: number`).
3. Implement private `getOrCreateCart(userId)`.
4. Implement `getCart(userId)`.
5. Implement `addToCart(userId, bookId, quantity)` — read-modify-write.
6. Implement `removeFromCart(itemId)`.
7. Implement `updateQuantity(itemId, quantity)` — validate ≥ 1.
8. Implement `clearCart(userId)`.
9. Implement `isInCart(userId, bookId)` — lightweight count check.
10. Implement `validateCoupon(code)` — filter by code, is_active, expiry.
11. Export from `src/repositories/index.ts`.

**Relevant Context:**
- `src/repositories/supabase/SupabaseWishlistRepository.ts` — full pattern
- `src/repositories/supabase/errors.ts` — `RepositoryError`
- `src/types/cart.ts` — `CartItem`, `Coupon`

**Status:** `[ ] pending`

---

### Sub-Task 7 — `MockCartRepository` (In-Memory)

**Intent:**
In-memory implementation for offline dev and tests. Stores per-user
`Map<userId, CartItem[]>`. `addToCart` increments existing quantity rather
than inserting a duplicate. `validateCoupon` checks a hardcoded list of test
coupons so the mock works end-to-end without a DB.

**Mock coupons (for offline testing):**
- `SAVE10` — flat ₹100 off, min order ₹200
- `WELCOME20` — 20% off, no minimum

**Expected Outcomes:**
- `src/repositories/mock/MockCartRepository.ts` implements all 7 methods.
- `addToCart` increments quantity on duplicate — never creates two rows for
  the same book.
- `validateCoupon('SAVE10')` returns the SAVE10 coupon; `validateCoupon('BAD')`
  returns null.
- Exported and wired in `src/repositories/index.ts`.

**Todo List:**
1. Create `src/repositories/mock/MockCartRepository.ts`.
2. Define mock coupons as a module-level constant array.
3. Implement all 7 methods with the same `delay()` helper.
4. Wire up `cartRepository` singleton in `src/repositories/index.ts`.

**Relevant Context:**
- `src/repositories/mock/MockWishlistRepository.ts` — full pattern
- `src/repositories/mock/mockData.ts` — `BOOKS` for embedded book data
- `src/types/cart.ts` — `Cart`, `CartItem`, `Coupon`

**Status:** `[ ] pending`

---

### Sub-Task 8 — React Query Hooks `src/hooks/useCart.ts`

**Intent:**
Create all hooks the UI needs. Follows the `useWishlist.ts` pattern exactly:
query keys, optimistic updates on add/remove/update, rollback on error.
Includes a derived `useCartBreakdown` hook that calls `calcBreakdown` from
`pricing.ts` on the cached items — so the order summary panel is always in
sync with the cart without an extra fetch.

**Expected Outcomes:**
- `src/hooks/useCart.ts` exports:
  - `useCart(userId)` — `useQuery` returning `CartItem[]`
  - `useIsInCart(userId, bookId)` — `useQuery` returning `boolean`
  - `useCartBreakdown(userId, coupon)` — derived from `useCart` via
    `select` option; returns `CartBreakdown`
  - `useAddToCart()` — `useMutation`, optimistic add
  - `useRemoveFromCart()` — `useMutation`, optimistic remove
  - `useUpdateQuantity()` — `useMutation`, optimistic quantity update
  - `useClearCart()` — `useMutation`, invalidates on success
  - `useValidateCoupon()` — `useMutation` (not a query — user triggers it)
- Query keys exported as `cartKeys` object (mirrors `wishlistKeys`).
- `useCartBreakdown` is a derived selector — uses `useQuery` with
  `select: (items) => calcBreakdown(items, coupon)` — zero extra network round-trips.
- Cart count (for navbar badge) accessible via `useCart(userId).data?.length ?? 0`.

**Optimistic update strategy:**

| Mutation | Optimistic action | Rollback |
|---|---|---|
| Add | Prepend placeholder item; set `isInCart` to true | Restore previous list + boolean |
| Remove | Splice item from list; set `isInCart` to false | Restore |
| Update quantity | Set item.quantity in cached list | Restore |
| Clear | Set cached list to `[]` | Restore |

**Todo List:**
1. Create `src/hooks/useCart.ts`.
2. Define `cartKeys` object: `list(userId)`, `check(userId, bookId)`.
3. Implement `useCart`, `useIsInCart`, `useCartBreakdown`.
4. Implement `useAddToCart` with optimistic `onMutate` / rollback.
5. Implement `useRemoveFromCart` with optimistic `onMutate` / rollback.
6. Implement `useUpdateQuantity` with optimistic `onMutate` / rollback.
7. Implement `useClearCart`.
8. Implement `useValidateCoupon` — mutation, stores validated coupon in
   component state (not query cache).

**Relevant Context:**
- `src/hooks/useWishlist.ts` — full pattern to mirror
- `src/lib/pricing.ts` — `calcBreakdown`, `CartBreakdown` (Sub-Task 1)
- `@tanstack/react-query` v5 — `select` option on `useQuery`

**Status:** `[ ] pending`

---

### Sub-Task 9 — `CartPage` Full Implementation

**Intent:**
Replace the stub `CartPage` with the full UI shown in the Payment & Purchase
screenshot. Two panels side-by-side: left = cart items list; right = order
summary with coupon input and "Proceed to Checkout" button.

**Expected Outcomes:**
- `src/pages/CartPage.tsx` implements the full cart UI.
- Left panel — cart items:
  - Breadcrumbs: `Home / Cart`
  - Heading "Shopping Cart" with item count badge
  - Each item: `ProductCard` (horizontal variant) + quantity stepper
    (`−` / `+` buttons, number input) + "Remove" button
  - Loading: 3× `ProductCardSkeleton`
  - Empty: `EmptyState` with "Browse books" → `/catalogue`
  - Error: `ErrorState` with retry
- Right panel — order summary:
  - `SummaryRow` rows: Price (N items), Tax, Delivery Charges, Discount, Total
  - Coupon code `Input` + "Apply" `Button` — calls `useValidateCoupon`
  - Applied coupon shown as a dismissible `Alert` variant="success"
  - Invalid coupon shown as `Alert` variant="error"
  - "Proceed to Checkout" `Button` — navigates to `/checkout`
  - Button disabled when cart is empty
- Mutation error banners using `Alert` variant="error" with dismiss.
- All quantities reflect `useCartBreakdown` in real time.

**Cart item row design (quantity stepper):**
```
[ProductCard horizontal] [− | 1 | +] [Remove]
```
Quantity `−` is disabled when qty = 1. `+` has no upper bound (books can be
gifted in bulk). Clicking `−` at qty=1 shows a confirmation or is treated as
"Remove" — plan decision: clicking `−` at qty=1 calls `removeFromCart` directly.

**Todo List:**
1. Replace stub in `src/pages/CartPage.tsx`.
2. Import `useCart`, `useRemoveFromCart`, `useUpdateQuantity`, `useClearCart`,
   `useCartBreakdown`, `useValidateCoupon` from `@/hooks/useCart`.
3. Manage local `coupon` state (`Coupon | null`) — set by `useValidateCoupon`
   on success.
4. Render left panel: loading / error / empty / list branches.
5. For each item render quantity stepper + remove button with proper loading states.
6. Render right panel with `SummaryRow` fed from `useCartBreakdown`.
7. Wire coupon Apply button — on success update local coupon state.
8. Wire "Proceed to Checkout" → `navigate('/checkout')`.

**Relevant Context:**
- `src/pages/WishlistPage.tsx` — structural reference
- `src/components/ui/Table.tsx` `SummaryRow` — order summary rows
- `src/lib/pricing.ts` — breakdown shape
- Screenshots: Payment & Purchase page — item list + address + grand total panel

**Status:** `[ ] pending`

---

### Sub-Task 10 — Wire `BookDetailPage.handleAddToCart` + Navbar Badge

**Intent:**
Replace the `console.log` stub in `BookDetailPage.handleAddToCart` with the
real `useAddToCart` mutation. Add `useIsInCart` so the "Add to Cart" button
reflects current cart state (label "In Cart" when already added — matches the
wishlist toggle pattern). Add a live item-count badge to the navbar cart icon
in `RootLayout`.

**Expected Outcomes:**
- `BookDetailPage` calls `useIsInCart` and `useAddToCart`; the cart button
  shows "In Cart" (filled cart icon) when the book is already in the cart,
  "Add to Cart" otherwise.
- `BookActions` receives optional `isInCart?: boolean` and `cartLoading?:
  boolean` props — both default to `false` so existing tests pass unchanged.
- `RootLayout` cart icon renders a red badge with the item count when the
  user is authenticated and has items in their cart. Badge hidden when count
  is 0 or user is not logged in.
- `WishlistPage` "Move to Cart" button is now wired to `useAddToCart` then
  `useRemoveFromWishlist` — moves the item instead of logging.

**Todo List:**
1. Add `isInCart?: boolean` and `cartLoading?: boolean` props to `BookActions`.
2. Update cart button: show filled cart icon + "In Cart" label when `isInCart`.
3. In `BookDetailPage`: import `useIsInCart`, `useAddToCart`; call them;
   wire `handleAddToCart` to the mutation when user is authenticated.
4. In `RootLayout`: import `useCart` + `useAuth`; compute `cartCount`; render
   badge.
5. In `WishlistPage`: wire "Move to Cart" — call `useAddToCart` then on
   success call `useRemoveFromWishlist`.

**Relevant Context:**
- `src/components/book-detail/BookActions.tsx` — add props (backward-compatible)
- `src/pages/BookDetailPage.tsx` lines 62-69 — stub to replace
- `src/layouts/RootLayout.tsx` — cart icon at line 26-33
- `src/pages/WishlistPage.tsx` `handleMoveToCart` stub
- `src/hooks/useWishlist.ts` `useRemoveFromWishlist` — already available

**Status:** `[ ] pending`

---

### Sub-Task 11 — Tests `src/test/cart.test.ts`

**Intent:**
Write unit tests for `MockCartRepository` and integration tests for the pricing
module. All tests run in-memory — no Supabase connection. Pattern mirrors
`src/test/wishlist.test.ts` exactly.

**Expected Outcomes:**
- `src/test/cart.test.ts` covers:
  - `getCart` — empty for new user, returns items with embedded book
  - `addToCart` — returns CartItem, increments quantity on duplicate
  - `removeFromCart` — removes only the specified item
  - `updateQuantity` — updates correctly, validates qty ≥ 1
  - `clearCart` — empties list, does not affect other users
  - `isInCart` — true/false lifecycle
  - `validateCoupon` — valid code returns Coupon, invalid returns null
- `src/test/pricing.test.ts` extended (Sub-Task 2) as described above
- All 90 existing tests + new tests pass in `npm test -- --run`

**Todo List:**
1. Create `src/test/cart.test.ts`.
2. Import and instantiate `MockCartRepository`.
3. Write ≥ 15 test cases covering all 7 repository methods.
4. Confirm existing pricing tests still pass and new ones are added.
5. Run `npm run typecheck && npm run lint && npm test -- --run` — all pass.

**Relevant Context:**
- `src/test/wishlist.test.ts` — pattern to mirror verbatim
- `src/repositories/mock/MockCartRepository.ts` — class under test
- `src/lib/pricing.ts` — module under test (Sub-Task 1/2)

**Status:** `[ ] pending`

---

## Implementation Order

```
Sub-Task 1 (pricing.ts — pure module, no dependencies)
      │
      ├─ Sub-Task 2 (pricing tests — validates Sub-Task 1)
      │
Sub-Task 3 (SQL migrations)
      │
Sub-Task 4 (DB types — depends on 3)
      │
Sub-Task 5 (CartRepository interface)
      │
Sub-Tasks 6 + 7 (Supabase + Mock implementations — parallel, depend on 5)
      │
Sub-Task 8 (Hooks — depends on 6 + 7 + 1)
      │
Sub-Tasks 9 + 10 (CartPage + BookDetail/Navbar wiring — parallel, depend on 8)
      │
Sub-Task 11 (Tests — validates everything)
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Separate pricing module | `src/lib/pricing.ts` — pure functions | Testable without React; reusable in Checkout, Order Confirmation, and any future server-side logic |
| Separate `CartRepository` | Distinct from `BookRepository` and `WishlistRepository` | Auth-gated, user-owned; mixing with public catalogue would pollute the interface |
| One cart per user | `unique(user_id)` on `carts`, lazily created | Simpler; matches `Cart` domain type; consistent with Wishlist design |
| Duplicate add → increment | On `addToCart` with existing book, increment quantity | Correct UX — user expects qty to go up, not error |
| `updateQuantity` throws at qty < 1 | Validation in repository | Prevents invalid DB state; callers (hooks) handle the error gracefully |
| Qty = 1 and click `−` | Calls `removeFromCart` directly | Simpler UX — no confirmation dialog; matches common e-commerce patterns |
| Coupon validation | `validateCoupon` on `CartRepository` | Coupons live in Supabase; repository boundary is the right place to query them |
| `useCartBreakdown` as derived selector | `useQuery` `select` option on `useCart` | Zero extra round-trip; always fresh when cart changes; composable |
| Navbar cart badge | Live from `useCart(user.id).data?.length` | Already in cache from `CartPage` visit; no extra network call for logged-in users who visited cart |
| "Move to Cart" from WishlistPage | `addToCart` then on-success `removeFromWishlist` | Ensures item is in cart before removing from wishlist — no lost items on error |

---

## Files Created / Modified

| File | Action |
|---|---|
| `src/lib/pricing.ts` | **Create** — pure calculation module |
| `supabase/migrations/008_carts_schema.sql` | **Create** |
| `supabase/migrations/009_coupons_schema.sql` | **Create** |
| `supabase/migrations/010_carts_rls.sql` | **Create** |
| `src/lib/database.types.ts` | **Edit** — add `carts`, `cart_items`, `coupons` |
| `src/repositories/CartRepository.ts` | **Create** — interface |
| `src/repositories/supabase/SupabaseCartRepository.ts` | **Create** |
| `src/repositories/mock/MockCartRepository.ts` | **Create** |
| `src/repositories/index.ts` | **Edit** — export + wire `cartRepository` |
| `src/hooks/useCart.ts` | **Create** — 8 hooks |
| `src/pages/CartPage.tsx` | **Edit** — replace stub |
| `src/components/book-detail/BookActions.tsx` | **Edit** — add `isInCart`, `cartLoading` props |
| `src/pages/BookDetailPage.tsx` | **Edit** — wire cart toggle |
| `src/layouts/RootLayout.tsx` | **Edit** — cart badge |
| `src/pages/WishlistPage.tsx` | **Edit** — wire "Move to Cart" |
| `src/test/cart.test.ts` | **Create** — ≥ 15 test cases |
| `src/test/pricing.test.ts` | **Edit** — extend with ≥ 17 more cases |

**Files NOT changed:** All catalogue pages, hooks, components, `BookRepository`,
`WishlistRepository`, all existing migrations, `mockData.ts`, auth context,
router.
