# Recommendation System Plan

## Overview

BookWorm needs a deterministic recommendation system that ranks books using catalogue signals (same author, same category, same publisher) weighted by relevance. The system must be designed so the algorithm can be replaced later without touching any UI component.

The design introduces a `RecommendationService` abstraction — a TypeScript interface backed by a concrete `CatalogueRecommendationService` class. Services are instantiated once in a new `services/index.ts`, mirroring the existing `repositories/index.ts` pattern. Hooks call the service; components call hooks; neither layer knows how recommendations are computed.

### Scope

**In scope**
- Define `RecommendationService` interface with two methods: `getRecommendations` (context-aware, for book detail) and `getFallbackRecommendations` (context-free, for catalogue home)
- Implement `CatalogueRecommendationService` using three weighted signals: same author (3 pts), same category (2 pts), same publisher (1 pt)
- Implement `MockRecommendationService` that uses the same in-memory scoring logic against mock data
- Wire the service in `services/index.ts`
- Replace `useRecommendedBooks` on `CataloguePage` with a new `useFallbackRecommendations` hook that calls the service
- Replace `useRelatedBooks` on `BookDetailPage` with a new `useRecommendations` hook that calls the service with a context book
- Update `RelatedReadsPanel` to receive its data from the new hook (the prop interface stays the same — it already accepts `Book[]`)

**Out of scope**
- Purchase-history signals (`previously purchased category`, `frequently purchased together`) — deferred until `OrderRepository` gains a `getOrders(userId)` method
- Machine learning or personalisation
- A/B testing infrastructure
- Changes to the database schema

### Key decisions recorded

| Decision | Choice |
|---|---|
| Service pattern | Class accepting `bookRepository` (required) and `orderRepository` (optional, for future use) as constructor args |
| Instantiation | Singleton in `services/index.ts`, mirroring `repositories/index.ts` |
| Signal weights | Same author = 3 pts, same category = 2 pts, same publisher = 1 pt |
| Tie-breaking | Higher cumulative score ranks first; ties broken by `copies_sold` descending |
| Catalogue "no context" fallback | `getFallbackRecommendations()` returns global top books by `copies_sold` (existing `getRecommendedBooks` behaviour) |
| Purchase history | Not implemented — `orderRepository` injected but unused until future sub-task |
| UI surface | `CataloguePage` "Recommended for You" section + `RelatedReadsPanel` on `BookDetailPage` |
| Mock | `MockRecommendationService` runs identical scoring in-process against the mock book array |

---

## Architecture

```
CataloguePage                         BookDetailPage
   │                                       │
   ▼                                       ▼
useFallbackRecommendations()        useRecommendations(contextBook)
   │                                       │
   └───────────────┬───────────────────────┘
                   ▼
        RecommendationService  (interface)
                   │
        CatalogueRecommendationService
          ├─ bookRepository.getRecommendedBooks()   ← fallback
          ├─ bookRepository.getBooks({ ... })       ← same-author/publisher query
          └─ bookRepository.getRelatedBooks(...)    ← same-category query (reused)
```

### RecommendationService interface

```
interface RecommendationService {
  /**
   * Returns scored, ranked books given a context book.
   * Used by BookDetailPage / RelatedReadsPanel.
   * limit defaults to 6.
   */
  getRecommendations(contextBook: Book, limit?: number): Promise<Book[]>

  /**
   * Returns recommendations when no context book is available.
   * Used by CataloguePage when no filters are active.
   * Falls back to global top-by-sales.
   */
  getFallbackRecommendations(limit?: number): Promise<Book[]>
}
```

### Scoring algorithm (CatalogueRecommendationService)

1. Collect candidate books using three separate queries:
   - Same category: `bookRepository.getRelatedBooks(contextBook.id, categoryIds)` (existing, reused)
   - Same author: `bookRepository.getBooks({ search: contextBook.author_name })` filtered by `author_name` exact match
   - Same publisher: `bookRepository.getBooks({ publisherId: contextBook.publisher_id })` (only if publisher_id is non-null)
2. Build a `Map<bookId, { book, score }>` — deduplicate across signal sets, accumulating the matching signal weights
3. Exclude the context book itself
4. Sort descending by score, then by `copies_sold` as tie-breaker
5. Return the top `limit` results (default 6)

---

## Sub-Tasks

---

### Sub-Task 1 — Define the `RecommendationService` interface

**Status:** `[x] done`

**Intent**
Establish the contract that all recommendation implementations must satisfy. UI code imports from this file only — it never imports a concrete class.

**Expected Outcomes**
- A new file `e-book-store-fe/src/services/RecommendationService.ts` exists
- It exports the `RecommendationService` interface with `getRecommendations` and `getFallbackRecommendations`
- It imports `Book` from `@/types/book` — no other dependencies

**Todo List**
1. Create `e-book-store-fe/src/services/RecommendationService.ts`
2. Define and export `RecommendationService` interface:
   - `getRecommendations(contextBook: Book, limit?: number): Promise<Book[]>`
   - `getFallbackRecommendations(limit?: number): Promise<Book[]>`
3. Export nothing else from this file — keep it a pure type contract

**Relevant Context**
- Pattern to mirror: [`e-book-store-fe/src/repositories/BookRepository.ts`](e-book-store-fe/src/repositories/BookRepository.ts) — interface-only, no implementation, imported by hooks
- `Book` type: [`e-book-store-fe/src/types/book.ts`](e-book-store-fe/src/types/book.ts)

---

### Sub-Task 2 — Implement `CatalogueRecommendationService`

**Status:** `[x] done`

**Intent**
The concrete implementation of the scoring algorithm. Accepts `bookRepository` in its constructor so it can be replaced with any `BookRepository` implementation (Supabase or mock). Optionally accepts `orderRepository` for future purchase-history signals.

**Expected Outcomes**
- A new file `e-book-store-fe/src/services/CatalogueRecommendationService.ts` exists
- It implements `RecommendationService`
- `getRecommendations(contextBook, limit = 6)`:
  1. Runs three parallel candidate fetches (same category via `getRelatedBooks`, same author via `getBooks({ search: author_name })` filtered to exact author name match, same publisher via `getBooks({ publisherId })` when publisher_id is non-null)
  2. Scores candidates: same-author books get 3 pts, same-category books get 2 pts, same-publisher books get 1 pt; a book matching multiple signals accumulates all applicable points
  3. Deduplicates by `book.id`, excludes the context book
  4. Sorts by score descending, then `copies_sold` descending
  5. Returns the top `limit` results
- `getFallbackRecommendations(limit = 6)` calls `bookRepository.getRecommendedBooks()` and returns up to `limit` results
- Class accepts `bookRepository: BookRepository` and `orderRepository?: OrderRepository` as constructor parameters

**Todo List**
1. Create `e-book-store-fe/src/services/CatalogueRecommendationService.ts`
2. Import `BookRepository` from `@/repositories/BookRepository` and `OrderRepository` from `@/repositories/OrderRepository`
3. Implement `getRecommendations`:
   - Extract `categoryIds` from `contextBook.categories ?? []`
   - Run same-category fetch (`getRelatedBooks(contextBook.id, categoryIds)`) — this returns up to 3 books; pass through as candidates
   - Run same-author fetch (`getBooks({ search: contextBook.author_name })`) — filter result to `book.author_name === contextBook.author_name` (exact match) and exclude `contextBook.id`
   - Run same-publisher fetch only when `contextBook.publisher_id` is non-null: `getBooks({ publisherId: contextBook.publisher_id })` — exclude `contextBook.id`
   - Build score map, sort, slice to `limit`
4. Implement `getFallbackRecommendations`:
   - Call `bookRepository.getRecommendedBooks()` and return the first `limit` items
5. Use `Promise.allSettled` (not `Promise.all`) so a single failing signal does not block the others — treat rejected promises as empty arrays

**Relevant Context**
- `BookRepository` interface: [`e-book-store-fe/src/repositories/BookRepository.ts`](e-book-store-fe/src/repositories/BookRepository.ts)
- `OrderRepository` interface: [`e-book-store-fe/src/repositories/OrderRepository.ts`](e-book-store-fe/src/repositories/OrderRepository.ts) — inject but do not use yet
- Existing `getRelatedBooks` implementation for reference: [`e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts:352`](e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts:352)
- `getBooks` supports `publisherId` and `search` filters: [`e-book-store-fe/src/repositories/BookRepository.ts:15`](e-book-store-fe/src/repositories/BookRepository.ts:15)

---

### Sub-Task 3 — Implement `MockRecommendationService`

**Status:** `[x] done`

**Intent**
Provide a test-safe, network-free implementation that runs the identical scoring logic in-process against the mock book array. This keeps the mock/test environment consistent with the production algorithm.

**Expected Outcomes**
- A new file `e-book-store-fe/src/services/mock/MockRecommendationService.ts` exists
- It implements `RecommendationService`
- It accepts a `BookRepository` in its constructor (receives `MockBookRepository` at runtime)
- Scoring logic is identical to `CatalogueRecommendationService` (same weights, same deduplication, same tie-breaking)
- `getFallbackRecommendations` uses `bookRepository.getRecommendedBooks()`

**Todo List**
1. Create `e-book-store-fe/src/services/mock/MockRecommendationService.ts`
2. Implement `getRecommendations` identically to `CatalogueRecommendationService` — same scoring, same `Promise.allSettled` pattern, so both use the same `BookRepository` interface methods
3. Implement `getFallbackRecommendations` — call `bookRepository.getRecommendedBooks()`, return up to `limit`
4. No delay() simulation is needed — the mock repositories already introduce their own delays

**Relevant Context**
- `MockBookRepository` already implements all `BookRepository` methods correctly, including `getRelatedBooks`, `getBooks`, and `getRecommendedBooks`: [`e-book-store-fe/src/repositories/mock/MockBookRepository.ts`](e-book-store-fe/src/repositories/mock/MockBookRepository.ts)
- Note: since both `CatalogueRecommendationService` and `MockRecommendationService` call the same `BookRepository` interface methods, they can share scoring logic — consider extracting a `scoreAndRank` pure function into a shared `services/scoring.ts` helper if the logic is non-trivial

---

### Sub-Task 4 — Wire services in `services/index.ts`

**Status:** `[x] done`

**Intent**
Create the single instantiation point for all services, mirroring the pattern in `repositories/index.ts`. All application code imports from `@/services`, not from service implementation files.

**Expected Outcomes**
- A new file `e-book-store-fe/src/services/index.ts` exists
- It exports `recommendationService` as an application-wide singleton
- It uses the same `VITE_USE_SUPABASE` env var to select `CatalogueRecommendationService` vs `MockRecommendationService`
- It imports `bookRepository` and `orderRepository` from `@/repositories` — no new Supabase client instantiation

**Todo List**
1. Create `e-book-store-fe/src/services/index.ts`
2. Import `bookRepository`, `orderRepository` from `@/repositories`
3. Import `CatalogueRecommendationService` and `MockRecommendationService`
4. Export `recommendationService`:
   ```
   export const recommendationService: RecommendationService = useSupabase
     ? new CatalogueRecommendationService(bookRepository, orderRepository)
     : new MockRecommendationService(bookRepository)
   ```
5. Export type `{ RecommendationService }` re-exported from `./RecommendationService`

**Relevant Context**
- Pattern to mirror exactly: [`e-book-store-fe/src/repositories/index.ts`](e-book-store-fe/src/repositories/index.ts:59)
- `VITE_USE_SUPABASE` is read from `import.meta.env` — import it the same way

---

### Sub-Task 5 — Add React Query hooks for the service

**Status:** `[x] done`

**Intent**
Provide the same React Query integration layer that exists for the catalogue data. All components use hooks — they never call the service directly.

**Expected Outcomes**
- A new file `e-book-store-fe/src/hooks/useRecommendations.ts` exists
- Exports two hooks:
  - `useRecommendations(contextBook: Book | undefined, limit?: number)` — for book detail / RelatedReadsPanel
  - `useFallbackRecommendations(limit?: number)` — for catalogue home
- Both hooks use `useQuery` from `@tanstack/react-query`
- `useRecommendations` is disabled (`enabled: false`) when `contextBook` is `undefined`
- Query keys follow the existing convention: `['recommendations', 'context', contextBook.id, limit]` and `['recommendations', 'fallback', limit]`

**Todo List**
1. Create `e-book-store-fe/src/hooks/useRecommendations.ts`
2. Import `recommendationService` from `@/services`
3. Implement `useRecommendations(contextBook, limit = 6)`:
   - `queryKey: ['recommendations', 'context', contextBook?.id ?? null, limit]`
   - `queryFn: () => recommendationService.getRecommendations(contextBook!, limit)`
   - `enabled: !!contextBook`
4. Implement `useFallbackRecommendations(limit = 6)`:
   - `queryKey: ['recommendations', 'fallback', limit]`
   - `queryFn: () => recommendationService.getFallbackRecommendations(limit)`
5. Do not add `staleTime` — let the default React Query cache behaviour apply

**Relevant Context**
- Pattern to mirror: [`e-book-store-fe/src/hooks/useCatalogueData.ts`](e-book-store-fe/src/hooks/useCatalogueData.ts)
- Existing `useRelatedBooks` for comparison: [`e-book-store-fe/src/hooks/useBookDetail.ts:16`](e-book-store-fe/src/hooks/useBookDetail.ts:16)

---

### Sub-Task 6 — Update `BookDetailPage` and `RelatedReadsPanel`

**Status:** `[x] done`

**Intent**
Replace the `useRelatedBooks` call in `BookDetailPage` with `useRecommendations`. `RelatedReadsPanel` receives `Book[]` and has no knowledge of where the data came from — its interface does not change.

**Expected Outcomes**
- `BookDetailPage` imports `useRecommendations` instead of `useRelatedBooks`
- The hook is called with `book` as the context (once the book is loaded)
- `RelatedReadsPanel` receives the same `books` prop as before — no changes to that component
- `useRelatedBooks` is no longer called from `BookDetailPage` (the hook itself can remain in the file for now — it will be removed when `getRelatedBooks` is eventually retired from `BookRepository`)

**Todo List**
1. In [`e-book-store-fe/src/pages/BookDetailPage.tsx`](e-book-store-fe/src/pages/BookDetailPage.tsx:14), replace the `useRelatedBooks` import with `useRecommendations` from `@/hooks/useRecommendations`
2. Replace the `useRelatedBooks(bookId, categoryIds)` call with `useRecommendations(book, 6)` — note: `book` may be `undefined` during loading, which is handled by the hook's `enabled` guard
3. Rename the destructured variable to `{ data: recommendedBooks = [], isLoading: recommendedLoading }` for clarity
4. Pass `recommendedBooks` and `recommendedLoading` to `<RelatedReadsPanel>` in place of the old `relatedBooks` / `relatedLoading` — the prop names on `RelatedReadsPanel` remain `books` and `loading`

**Relevant Context**
- `BookDetailPage`: [`e-book-store-fe/src/pages/BookDetailPage.tsx`](e-book-store-fe/src/pages/BookDetailPage.tsx)
- `RelatedReadsPanel`: [`e-book-store-fe/src/components/book-detail/RelatedReadsPanel.tsx`](e-book-store-fe/src/components/book-detail/RelatedReadsPanel.tsx)
- The `categoryIds` derivation (`book?.categories?.map(c => c.id)`) is no longer needed after this change

---

### Sub-Task 7 — Update `CataloguePage` "Recommended for You"

**Status:** `[x] done`

**Intent**
Replace the `useRecommendedBooks` call in `CataloguePage` with `useFallbackRecommendations`. The section title, layout, and `BookSection` component are unchanged.

**Expected Outcomes**
- `CataloguePage` uses `useFallbackRecommendations` from `@/hooks/useRecommendations`
- `useRecommendedBooks` is no longer imported or called in `CataloguePage`
- The "Recommended for You" `BookSection` displays the same number of books as before (capped at 3 by `BookSection` default)
- `useCatalogueData.ts` retains `useRecommendedBooks` — it is not deleted (other places or tests may use it)

**Todo List**
1. In [`e-book-store-fe/src/pages/CataloguePage.tsx`](e-book-store-fe/src/pages/CataloguePage.tsx:15), add `useFallbackRecommendations` to the imports from `@/hooks/useRecommendations`
2. Remove `useRecommendedBooks` from the import list of `useCatalogueData`
3. Replace `const { data: recommended = [], isLoading: recLoading } = useRecommendedBooks()` with `const { data: recommended = [], isLoading: recLoading } = useFallbackRecommendations(6)`
4. Verify the `<BookSection title="Recommended for You" books={recommended} loading={recLoading} ... />` call is unchanged

**Relevant Context**
- `CataloguePage`: [`e-book-store-fe/src/pages/CataloguePage.tsx`](e-book-store-fe/src/pages/CataloguePage.tsx)
- `useCatalogueData.ts` is not modified in this sub-task

---

## Cross-cutting notes

### Why `BookRepository.getRelatedBooks` is preserved

`getRelatedBooks` is reused internally by `CatalogueRecommendationService` as the "same category" signal source. It is not removed from the `BookRepository` interface. Removing it would be a separate clean-up task once all consumers have migrated.

### `getRecommendedBooks` on `BookRepository` is preserved

`getFallbackRecommendations` delegates to `bookRepository.getRecommendedBooks()`. The method stays on `BookRepository`. The only change is that `CataloguePage` stops calling it directly.

### Future purchase-history extension point

`CatalogueRecommendationService` receives `orderRepository` in its constructor but does not use it. When `OrderRepository` gains a `getOrders(userId: string): Promise<Order[]>` method, the service can add a fourth signal:
- Fetch user's past orders → extract `order_items[].book_id` → resolve those books' `category_ids` → apply a `previously-purchased-category` score of, say, 2 pts per matching category

This extension requires only changes inside `CatalogueRecommendationService.getRecommendations`, no UI changes.

### No database migration required

All signals are derived from existing tables: `books`, `book_categories`, `order_items`. No schema changes.

### Mock/test environment

`MockRecommendationService` calls the same `BookRepository` interface methods as `CatalogueRecommendationService`. All existing catalogue tests continue to pass without modification.
