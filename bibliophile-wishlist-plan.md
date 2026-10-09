# Bibliophile — Wishlist Feature Plan

## Top-Level Overview

**Goal:** Implement a fully functional, Supabase-persisted wishlist for
authenticated users. Users can add books to their wishlist from the Book Detail
page, view all saved books at `/wishlist`, remove individual items, and move
items directly into their cart. The feature is hidden behind the existing
`AuthGuard` — unauthenticated visitors are redirected to `/login`.

**Scope:**
- SQL migration: `wishlists` + `wishlist_items` tables, RLS, indexes
- `database.types.ts` extended with the two new table shapes
- New `WishlistRepository` interface + Supabase implementation
  (separate from `BookRepository` — wishlist is user-owned data, not catalogue)
- React Query hooks: `useWishlist`, `useAddToWishlist`, `useRemoveFromWishlist`,
  `useIsInWishlist`, `useMoveToCart` (stub — cart is a later phase)
- Full `WishlistPage` implementation using existing design-system components
- `BookDetailPage` / `BookActions` wired to real add/remove toggle
- Optimistic updates on add and remove for instant UI feedback
- Duplicate prevention: the DB unique constraint + optimistic deduplication
- Full loading and error state handling using existing `LoadingState`,
  `ErrorState`, `WishlistEmpty` components

**Constraints:**
- `BookRepository` interface must not change — wishlist is a separate concern
- All existing 71 tests must continue to pass
- No new hardcoded colour or spacing values — use CSS custom property tokens only
- Cart phase is not implemented yet — "Move to Cart" is a stub that logs a
  console message and will be wired properly in the Cart phase
- The mock path (when `VITE_USE_SUPABASE=false`) gets an in-memory
  `MockWishlistRepository` so the app works offline too

**Architecture decision: separate repository**
Wishlist data is user-owned and auth-gated; it has no overlap with the public
catalogue queries in `BookRepository`. A dedicated `WishlistRepository`
interface keeps both repositories focused and avoids mixing auth-required
operations into the public catalogue contract.

---

## Sub-Tasks

---

### Sub-Task 1 — SQL Migration: `wishlists` + `wishlist_items` Tables

**Intent:**
Create the two Postgres tables that persist the wishlist. Each user has exactly
one wishlist (created lazily on first add). `wishlist_items` links a wishlist to
a book with an `added_at` timestamp for chronological display. A unique
constraint on `(wishlist_id, book_id)` prevents duplicates at the DB level.

**Expected Outcomes:**
- `supabase/migrations/006_wishlists_schema.sql` creates `wishlists` and
  `wishlist_items` tables.
- `supabase/migrations/007_wishlists_rls.sql` enables RLS and adds four
  policies: owner-read, owner-insert, owner-delete for `wishlists`; same for
  `wishlist_items` (via the `wishlists.user_id` join).
- Both migration files are idempotent (`create if not exists`, `do $$ ... $$`
  for policies).
- Running the migrations against the Supabase project produces the tables with
  the expected columns, constraints, and indexes.

**Table design:**

```
wishlists
  id         uuid pk default gen_random_uuid()
  user_id    uuid not null references auth.users(id) on delete cascade
  created_at timestamptz not null default now()
  unique (user_id)                    ← one wishlist per user

wishlist_items
  id           uuid pk default gen_random_uuid()
  wishlist_id  uuid not null references wishlists(id) on delete cascade
  book_id      uuid not null references books(id) on delete cascade
  added_at     timestamptz not null default now()
  unique (wishlist_id, book_id)       ← duplicate prevention
```

**Indexes needed:**
- `wishlist_items_wishlist_idx` on `wishlist_items(wishlist_id, added_at desc)` —
  powers `getWishlist()` sort by most recently added
- `wishlist_items_book_idx` on `wishlist_items(book_id)` —
  powers `isInWishlist(bookId)` check

**RLS policies:**

| Table | Operation | Policy |
|---|---|---|
| `wishlists` | SELECT | `auth.uid() = user_id` |
| `wishlists` | INSERT | `auth.uid() = user_id` |
| `wishlists` | DELETE | `auth.uid() = user_id` |
| `wishlist_items` | SELECT | User owns parent wishlist |
| `wishlist_items` | INSERT | User owns parent wishlist |
| `wishlist_items` | DELETE | User owns parent wishlist |

**Todo List:**
1. Create `supabase/migrations/006_wishlists_schema.sql` — both tables, unique
   constraints, two indexes.
2. Create `supabase/migrations/007_wishlists_rls.sql` — RLS enable + 6 policies
   (3 per table), wrapped in `do $$ ... exception when duplicate_object $$`
   for idempotency.
3. Verify by running against Supabase SQL Editor and confirming tables appear
   in the Table Editor.

**Relevant Context:**
- `supabase/migrations/001_catalogue_schema.sql` — pattern to follow for
  table creation
- `supabase/migrations/003_catalogue_rls.sql` — pattern to follow for RLS
- `src/types/cart.ts` — `Wishlist` and `WishlistItem` domain types already
  defined; columns must match exactly
- `bibliophile-phase6-supabase-plan.md` §10 `wishlists` and `wishlist_items` —
  detailed column and policy design already documented

**Status:** `[x] done`

---

### Sub-Task 2 — Extend `database.types.ts`

**Intent:**
Add `wishlists` and `wishlist_items` table type shapes to the hand-written
`Database` stub so the Supabase client and `WishlistRepository` are fully
type-safe. Keep the existing table entries unchanged.

**Expected Outcomes:**
- `src/lib/database.types.ts` has `Row`, `Insert`, and `Update` shapes for
  both `wishlists` and `wishlist_items`.
- `npm run typecheck` passes with no new errors.

**Todo List:**
1. Add `wishlists` entry to `Database['public']['Tables']`:
   - Row: `{ id, user_id, created_at }`
   - Insert: `{ id?, user_id, created_at? }`
   - Update: all optional
2. Add `wishlist_items` entry:
   - Row: `{ id, wishlist_id, book_id, added_at }`
   - Insert: `{ id?, wishlist_id, book_id, added_at? }`
   - Update: all optional
3. Run `npm run typecheck` — confirm clean.

**Relevant Context:**
- `src/lib/database.types.ts` — add alongside the existing 5 table entries
- `src/types/cart.ts` — `Wishlist` and `WishlistItem` are the domain types
  these DB rows will map to

**Status:** `[x] done`

---

### Sub-Task 3 — `WishlistRepository` Interface + Error Types

**Intent:**
Define the `WishlistRepository` interface as the single contract between
the UI layer and any concrete implementation (Supabase or mock). Keep it
minimal — only the 5 operations the UI actually needs.

Separate from `BookRepository` because wishlist operations require an
authenticated user, while book queries are public.

**Expected Outcomes:**
- `src/repositories/WishlistRepository.ts` exports the `WishlistRepository`
  interface with 5 methods.
- Error types from the existing `src/repositories/supabase/errors.ts` are
  reused — no new error class needed.
- The interface compiles clean with no unused imports.

**Repository contract:**

```ts
interface WishlistRepository {
  /** All wishlist items for the current user, most recently added first.
   *  Each item includes the full Book object embedded. */
  getWishlist(userId: string): Promise<WishlistItem[]>

  /** Add a book. Silently no-ops if the book is already in the wishlist
   *  (duplicate prevention handled at DB and optimistic-update layers). */
  addToWishlist(userId: string, bookId: string): Promise<WishlistItem>

  /** Remove a single item by its wishlist_item id. */
  removeFromWishlist(itemId: string): Promise<void>

  /** Returns true if the given book is already in the user's wishlist. */
  isInWishlist(userId: string, bookId: string): Promise<boolean>

  /** Remove all items from the wishlist. */
  clearWishlist(userId: string): Promise<void>
}
```

**Todo List:**
1. Create `src/repositories/WishlistRepository.ts` with the interface above
   and JSDoc comments.
2. Import `WishlistItem` from `@/types/cart` — do not redefine the type.
3. Export the interface from `src/repositories/index.ts` alongside the
   existing book repository exports.

**Relevant Context:**
- `src/repositories/BookRepository.ts` — structural pattern to follow
- `src/types/cart.ts` — `WishlistItem`, `Wishlist` domain types
- `src/repositories/supabase/errors.ts` — `RepositoryError`,
  `UnauthenticatedError` — reuse these

**Status:** `[x] done`

---

### Sub-Task 4 — `SupabaseWishlistRepository` Implementation

**Intent:**
Implement all 5 methods of `WishlistRepository` using the Supabase client.
The key design challenge is the "get-or-create wishlist" pattern: a user's
wishlist row may not exist yet. `getOrCreateWishlist(userId)` is a private
helper that upserts the `wishlists` row and returns its `id`.

**Expected Outcomes:**
- `src/repositories/supabase/SupabaseWishlistRepository.ts` implements
  `WishlistRepository` with all 5 methods.
- `getWishlist` returns items newest-first with the full `Book` object
  embedded (single round-trip: select `*, book:books(*)`).
- `addToWishlist` calls `getOrCreateWishlist`, then inserts into
  `wishlist_items`. On unique-constraint violation (409 / `23505`) it
  fetches and returns the existing item rather than throwing.
- `removeFromWishlist` deletes by `wishlist_items.id`.
- `isInWishlist` does a single `count` query on `wishlist_items` — does not
  fetch the full item.
- `clearWishlist` deletes all `wishlist_items` for the user's wishlist.
- Every method calls `throwOnError(error)` before any data access.
- No `as any` casts on individual field accesses — all raw query data is cast
  via explicit `WishlistItemQueryRow` type (same pattern as `BookQueryRow`).

**Query design for `getWishlist`:**
```sql
select wishlist_items.*, book:books(
  *, publisher:publishers(*), book_categories(categories(*))
)
from wishlist_items
join wishlists on wishlists.id = wishlist_items.wishlist_id
where wishlists.user_id = $userId
order by wishlist_items.added_at desc
```
This is expressed as a Supabase select with embedded join, returning the
full `Book` shape so the UI can render `ProductCard` without a second fetch.

**Todo List:**
1. Create `src/repositories/supabase/SupabaseWishlistRepository.ts`.
2. Define `WishlistItemQueryRow` — the shape of the raw Supabase response
   row (mirrors `WishlistItem` but with `book` as the embedded `BookQueryRow`
   type from `SupabaseBookRepository`).
3. Implement private `getOrCreateWishlist(userId)` — upserts `wishlists` on
   `user_id` unique constraint and returns the wishlist `id`.
4. Implement `getWishlist(userId)`.
5. Implement `addToWishlist(userId, bookId)` — get-or-create → insert →
   handle duplicate gracefully.
6. Implement `removeFromWishlist(itemId)`.
7. Implement `isInWishlist(userId, bookId)`.
8. Implement `clearWishlist(userId)`.
9. Export from `src/repositories/index.ts`, wire up the singleton (same
   feature-flag pattern as `bookRepository` — if `VITE_USE_SUPABASE=true`
   use `SupabaseWishlistRepository`, else `MockWishlistRepository`).

**Relevant Context:**
- `src/repositories/supabase/SupabaseBookRepository.ts` — `BookQueryRow`,
  `mapBook()`, `throwOnError()`, `AnySupabaseClient` — reuse these patterns
- `src/repositories/supabase/errors.ts` — `RepositoryError`,
  `UnauthenticatedError`
- `src/lib/supabase.ts` — typed client
- `src/types/cart.ts` — `Wishlist`, `WishlistItem` domain types

**Status:** `[x] done`

---

### Sub-Task 5 — `MockWishlistRepository` (In-Memory Implementation)

**Intent:**
Provide an in-memory implementation of `WishlistRepository` so the app
works with `VITE_USE_SUPABASE=false` and so tests do not require a live
Supabase connection. The mock holds a per-user wishlist map in memory.

**Expected Outcomes:**
- `src/repositories/mock/MockWishlistRepository.ts` implements all 5 methods.
- `addToWishlist` is idempotent — calling it twice for the same book returns
  the existing item, not a duplicate.
- `getWishlist` returns items sorted newest-first.
- The mock uses the same `BOOKS` data from `mockData.ts` to populate the
  embedded `book` field on `WishlistItem`.
- `MockWishlistRepository` is exported from `src/repositories/index.ts` and
  is the default when `VITE_USE_SUPABASE` is false.

**Todo List:**
1. Create `src/repositories/mock/MockWishlistRepository.ts`.
2. Use a `Map<userId, WishlistItem[]>` as internal state.
3. Implement all 5 interface methods with the same `delay()` helper used
   by `MockBookRepository`.
4. Wire up in `src/repositories/index.ts`.

**Relevant Context:**
- `src/repositories/mock/MockBookRepository.ts` — structure, `delay()` helper,
  `BOOKS` import
- `src/repositories/mock/mockData.ts` — `BOOKS` array for populating `book`
  embed on `WishlistItem`

**Status:** `[x] done`

---

### Sub-Task 6 — React Query Hooks: `useWishlist` Family

**Intent:**
Create all hooks the UI needs to read and mutate the wishlist. Follows the
exact same pattern as `useCatalogueData.ts` and `useBookDetail.ts` — query
hooks for reads, mutation hooks for writes. Optimistic updates are applied
on add and remove so the UI responds instantly without a round-trip.

**Expected Outcomes:**
- `src/hooks/useWishlist.ts` exports 5 hooks:
  - `useWishlist(userId)` — `useQuery` returning `WishlistItem[]`
  - `useIsInWishlist(userId, bookId)` — `useQuery` returning `boolean`
  - `useAddToWishlist()` — `useMutation` with optimistic insert
  - `useRemoveFromWishlist()` — `useMutation` with optimistic remove
  - `useClearWishlist()` — `useMutation`, no optimistic update needed
- Query keys follow a consistent pattern:
  `['wishlist', userId]` for the list,
  `['wishlist', userId, 'item', bookId]` for the boolean check.
- Optimistic update strategy:
  - **Add:** immediately append a provisional `WishlistItem` to the cached
    list; on error roll back via `onError` context.
  - **Remove:** immediately splice the item from the cached list; roll back
    on error.
- On any mutation success, invalidate both `['wishlist', userId]` and
  `['wishlist', userId, 'item', bookId]` to keep the boolean check in sync.
- All hooks are enabled only when `userId` is truthy (prevents queries
  before the auth session is hydrated).

**Todo List:**
1. Create `src/hooks/useWishlist.ts`.
2. Import `wishlistRepository` from `@/repositories`.
3. Implement `useWishlist(userId)` — `useQuery`, enabled when `!!userId`.
4. Implement `useIsInWishlist(userId, bookId)` — `useQuery`, enabled when
   both args are truthy.
5. Implement `useAddToWishlist()` — `useMutation` with `onMutate` optimistic
   insert and `onError` rollback.
6. Implement `useRemoveFromWishlist()` — `useMutation` with `onMutate`
   optimistic remove and `onError` rollback.
7. Implement `useClearWishlist()` — `useMutation`, invalidate on success.

**Relevant Context:**
- `src/hooks/useBookDetail.ts` — `useMutation` + `invalidateQueries` pattern
- `src/hooks/useCatalogueData.ts` — `useQuery` + `staleTime` pattern
- `@tanstack/react-query` v5 — `onMutate` / `onError` / `context` optimistic
  update API

**Status:** `[x] done`

---

### Sub-Task 7 — `WishlistPage` Implementation

**Intent:**
Replace the stub `WishlistPage` with a full implementation. The page shows
the user's saved books as a vertical list of `ProductCard` (horizontal
variant), with a "Remove" action on each card and a "Move to Cart" action
(stubbed until the Cart phase). Uses `WishlistEmpty` when the list is empty
and `LoadingState` / `ErrorState` for the async states.

**Expected Outcomes:**
- `src/pages/WishlistPage.tsx` renders the full wishlist UI.
- Page title: "My Wishlist" with item count badge.
- Each item renders as a `ProductCard` (horizontal variant) with:
  - Book cover, title, author, format, genre tags, price
  - "Remove" button (secondary/danger ghost) — calls `useRemoveFromWishlist`
  - "Move to Cart" button (ghost) — currently stubs to `console.log`; wired
    in the Cart phase
- A "Clear all" button at the top-right (visible only when list is non-empty).
- Loading state: `LoadingState` with 3 `ProductCardSkeleton` rows while
  the initial `useWishlist` query is pending.
- Error state: `ErrorState` with a retry button on query failure.
- Empty state: `WishlistEmpty` with a "Browse books" button that navigates
  to `/catalogue`.
- No hardcoded colours — use CSS custom property tokens via Tailwind's
  `[var(--...)]` syntax.

**Todo List:**
1. Replace stub content in `src/pages/WishlistPage.tsx`.
2. Import `useWishlist`, `useRemoveFromWishlist`, `useClearWishlist` from
   `@/hooks/useWishlist`.
3. Import `useAuth` to get `user.id`.
4. Render loading / error / empty / list branches.
5. For each `WishlistItem`, render a `ProductCard` variant="horizontal" with
   the remove and move-to-cart action buttons in the actions slot.
6. Wire "Browse books" on `WishlistEmpty` to navigate to `/catalogue`.
7. Wire "Clear all" to `useClearWishlist`.
8. Confirm the page is still auth-guarded (it already is via `router.tsx` —
   no router change needed).

**Relevant Context:**
- `src/components/ui/EmptyState.tsx` — `WishlistEmpty` component, ready to use
- `src/components/ui/ProductCard.tsx` — `ProductCard` horizontal variant
- `src/components/ui/LoadingState.tsx` — `LoadingState`, `ProductCardSkeleton`
- `src/components/ui/ErrorState.tsx` — `ErrorState`
- `src/hooks/useAuth.ts` — `useAuth()` for `user.id`
- `src/router.tsx` line 31 — `/wishlist` is already `AuthGuard`-wrapped

**Status:** `[x] done`

---

### Sub-Task 8 — Wire `BookDetailPage` Wishlist Toggle

**Intent:**
Replace the `console.log` stub in `BookDetailPage.handleAddToWishlist` with
a real add/remove toggle. The button on `BookActions` should reflect whether
the current book is already in the wishlist ("Added to Wishlist" filled heart
vs. "Add to Wishlist" outline heart) and toggle on click.

**Expected Outcomes:**
- `BookDetailPage` calls `useIsInWishlist(user?.id, bookId)` to get the
  current state.
- Clicking the button calls `useAddToWishlist` or `useRemoveFromWishlist`
  depending on current state — no page navigation.
- `BookActions` receives an `isInWishlist: boolean` and `wishlistLoading:
  boolean` prop and updates its label/icon accordingly:
  - In wishlist: filled heart icon, label "In Wishlist"
  - Not in wishlist: outline heart icon, label "Add to Wishlist"
- Unauthenticated users are still redirected to `/login?next=/books/:bookId`
  (existing behaviour — no change).
- All changes are backward-compatible: `BookActions` props for `onAddToCart`
  and `loading` remain identical; only new optional props are added.
- Existing `BookActions` tests in `bookDetail.test.tsx` continue to pass
  (the new props are optional with defaults).

**Todo List:**
1. Add optional props to `BookActions`: `isInWishlist?: boolean`,
   `wishlistLoading?: boolean`.
2. Conditionally render filled vs. outline heart icon and "In Wishlist" vs.
   "Add to Wishlist" label based on `isInWishlist`.
3. In `BookDetailPage`:
   a. Import `useIsInWishlist`, `useAddToWishlist`, `useRemoveFromWishlist`.
   b. Call `useIsInWishlist(user?.id ?? '', bookId)`.
   c. Replace the `handleAddToWishlist` stub — when authenticated, toggle
      add/remove based on `isInWishlist`.
   d. Pass `isInWishlist` and `wishlistLoading` down to `BookActions`.

**Relevant Context:**
- `src/pages/BookDetailPage.tsx` lines 57-70 — the stub to replace
- `src/components/book-detail/BookActions.tsx` — add new props here
- `src/test/bookDetail.test.tsx` — existing tests must not break; new props
  have defaults so they are backward-compatible

**Status:** `[x] done`

---

### Sub-Task 9 — Tests

**Intent:**
Write unit tests covering the `MockWishlistRepository` (data layer) and the
wishlist toggle on `BookDetailPage` (integration). Tests must not require a
live Supabase connection.

**Expected Outcomes:**
- A new test file `src/test/wishlist.test.ts` covers `MockWishlistRepository`:
  - `getWishlist` returns empty array for new user
  - `addToWishlist` returns a `WishlistItem` with embedded `Book`
  - `addToWishlist` twice for same book is idempotent (no duplicate)
  - `isInWishlist` returns true after add, false after remove
  - `removeFromWishlist` removes only the specified item
  - `clearWishlist` empties the list
  - `getWishlist` returns items newest-first
- All 71 existing tests continue to pass.
- `npm run typecheck && npm run lint && npm test -- --run` exits clean.

**Todo List:**
1. Create `src/test/wishlist.test.ts`.
2. Import and instantiate `MockWishlistRepository` directly (same pattern as
   `catalogue.test.ts` and `bookDetail.test.tsx`).
3. Write the 7 test cases listed above.
4. Run the full test suite and confirm 71 + new tests all pass.

**Relevant Context:**
- `src/test/catalogue.test.ts` — pattern: instantiate mock, call methods,
  assert results
- `src/test/bookDetail.test.tsx` — pattern for UI integration tests
- `src/repositories/mock/MockWishlistRepository.ts` — the class under test

**Status:** `[x] done`

---

## Implementation Order

```
Sub-Task 1 (SQL migrations)
      ↓
Sub-Task 2 (DB types)
      ↓
Sub-Task 3 (Repository interface)
      ↓
Sub-Task 4 + Sub-Task 5 (Supabase + Mock implementations — parallel)
      ↓
Sub-Task 6 (Hooks — depends on 4 + 5)
      ↓
Sub-Task 7 + Sub-Task 8 (WishlistPage + BookDetail wiring — parallel)
      ↓
Sub-Task 9 (Tests — run last, validates everything)
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Separate repository | `WishlistRepository` distinct from `BookRepository` | Wishlist is auth-gated user data; catalogue is public. Mixing them would force `BookRepository` callers to handle auth errors |
| One wishlist per user | `unique(user_id)` on `wishlists` | Simplest model; matches the `Wishlist` domain type already defined in `types/cart.ts` |
| Get-or-create wishlist | Private `getOrCreateWishlist(userId)` helper | First `addToWishlist` call lazily creates the row; no explicit "create wishlist" action needed from the UI |
| Duplicate prevention | DB unique constraint `(wishlist_id, book_id)` + catch 23505 in `addToWishlist` | Prevents duplicate regardless of race conditions; optimistic UI deduplication for instant feedback |
| Optimistic updates | Add and Remove are optimistic; Clear is not | Add/remove are frequent single-item ops — instant feedback matters. Clear is infrequent and less latency-sensitive |
| `isInWishlist` query | Separate `useQuery` keyed on `bookId` | Enables per-book cache entries so the Book Detail page knows its status without fetching the full list |
| `book` embed in `getWishlist` | Full `Book` object joined in one query | `WishlistPage` renders `ProductCard` for each item — embedding avoids N+1 fetches |
| "Move to Cart" | Stub in this phase | Cart schema and `CartRepository` don't exist yet; the button is visible but non-functional until the Cart phase |
| Mock implementation | In-memory `Map<userId, WishlistItem[]>` | Tests run without network; same pattern as `MockBookRepository` |

---

## Files Created / Modified

| File | Action |
|---|---|
| `supabase/migrations/006_wishlists_schema.sql` | **Create** |
| `supabase/migrations/007_wishlists_rls.sql` | **Create** |
| `src/lib/database.types.ts` | **Edit** — add `wishlists`, `wishlist_items` table types |
| `src/repositories/WishlistRepository.ts` | **Create** — interface |
| `src/repositories/supabase/SupabaseWishlistRepository.ts` | **Create** |
| `src/repositories/mock/MockWishlistRepository.ts` | **Create** |
| `src/repositories/index.ts` | **Edit** — export + wire `wishlistRepository` singleton |
| `src/hooks/useWishlist.ts` | **Create** — 5 hooks |
| `src/pages/WishlistPage.tsx` | **Edit** — replace stub with full implementation |
| `src/components/book-detail/BookActions.tsx` | **Edit** — add `isInWishlist`, `wishlistLoading` props |
| `src/pages/BookDetailPage.tsx` | **Edit** — wire wishlist toggle |
| `src/test/wishlist.test.ts` | **Create** — 7+ test cases |

**Files NOT changed:** All other pages, components, hooks, router, auth context,
`BookRepository`, `SupabaseBookRepository`, `MockBookRepository`, `mockData.ts`.
