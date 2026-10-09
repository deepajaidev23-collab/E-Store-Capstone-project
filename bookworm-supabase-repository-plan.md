# BookWorm — Supabase Repository Migration Plan

## Top-Level Overview

**Goal:** Replace `MockBookRepository` with `SupabaseBookRepository` by
implementing a real Postgres-backed version of the `BookRepository` interface
that supports all 11 methods needed by the existing Catalogue and Book Detail
pages. The UI, hooks, query keys, and component tree stay completely unchanged.
The switch is a single-line change in `src/repositories/index.ts`.

**Scope:**
- PostgreSQL schema, migrations, and seed data for: books, categories,
  publishers, book_categories, reviews
- Supabase-generated TypeScript types wired to the Supabase client
- `SupabaseBookRepository` class implementing every method of `BookRepository`
- Full-text search, filter, sort, pagination-ready query design
- Database indexes for every filter/sort path
- RLS policies for public read-only access to catalogue tables
- A trigger to auto-maintain `average_rating` on `books`
- Error handling, loading, and type safety strategy throughout
- Environment variable setup and `.env.example` documentation

**Out of scope for this plan:**
- Cart, wishlist, orders, payments, addresses, coupons (later phases)
- Auth-gated mutations beyond `submitReview`
- Edge Functions, storage buckets
- Supabase CLI local dev stack setup (assumed to exist or be set up separately)

**Key constraint:** Every React component, hook, and page file that currently
compiles and tests must continue to compile and test without modification.

---

## Sub-Tasks

---

### Sub-Task 1 — Supabase Client Type-Safety

**Intent:**
The existing `supabase.ts` client is created without the `Database` generic
type, meaning all query results are typed as `any`. This sub-task wires the
generated `Database` type (from `supabase gen types typescript`) into the
client so every query in `SupabaseBookRepository` gets compile-time safety on
column names, return shapes, and inserted row shapes.

**Expected Outcomes:**
- `src/lib/supabase.ts` exports `createClient<Database>(url, key)` where
  `Database` is imported from a generated type file.
- `src/lib/database.types.ts` exists and contains the generated types (seeded
  initially as a hand-written stub that matches the schema; will be regenerated
  after real Supabase project is set up).
- `noUnusedLocals` / `noUnusedParameters` TypeScript checks still pass.

**Todo List:**
1. Create `src/lib/database.types.ts` — a hand-written type stub (or CLI-
   generated) that declares `Database` with `public.Tables` for: `books`,
   `categories`, `publishers`, `book_categories`, `reviews`. Shape must match
   the columns designed in Sub-Task 2.
2. Update `src/lib/supabase.ts`: import `Database`, pass it as the generic to
   `createClient<Database>(url, key)`.
3. Export a `SupabaseClient` convenience type alias for use in the repository.
4. Verify `npm run typecheck` still passes.

**Relevant Context:**
- `e-book-store-fe/src/lib/supabase.ts` — current untyped client
- `@supabase/supabase-js` v2.50.2 — `createClient<Database>` generic is the
  v2 pattern
- `tsconfig.app.json` — `noUnusedLocals: true` means unused imports in
  `supabase.ts` must be removed

---

### Sub-Task 2 — SQL Migrations (Schema + Indexes + Seed Data)

**Intent:**
Create the full SQL migration set for the catalogue-related tables. This is
the Postgres source of truth. Migrations must be idempotent (`create if not
exists`, `create policy if not exists`) so they can be re-applied safely
during local development.

**Expected Outcomes:**
- `supabase/migrations/` directory with numbered migration files.
- Migration 001: enum type `book_format`, tables `categories`, `publishers`,
  `books`, `book_categories`, `reviews`.
- Migration 002: all indexes on `books` (FTS GIN, price, rating, created_at,
  language, format, publisher_id, is_bestseller, is_new_launch).
- Migration 003: RLS enable + public-read policies for `categories`,
  `publishers`, `books`, `book_categories`, `reviews`.
- Migration 004: trigger `update_book_average_rating` that recalculates
  `books.average_rating` on every `reviews` insert/update/delete.
- Migration 005: seed data — the same 20 categories, 5 publishers, 15 books
  and 9 reviews that currently live in `mockData.ts`, expressed as SQL
  `insert` statements. UUIDs are hardcoded so they can be referenced in
  foreign-key seed rows without randomness.

**Todo List:**
1. Create `supabase/migrations/001_catalogue_schema.sql` — enum + 5 tables
   with all columns matching `src/types/book.ts` and `src/types/review.ts`
   exactly (same field names, compatible types).
2. Create `supabase/migrations/002_catalogue_indexes.sql` — all 9 indexes
   documented in phase-6 plan §3 `books` table section.
3. Create `supabase/migrations/003_catalogue_rls.sql` — `enable row level
   security` + public-read policies for the 5 catalogue tables.
4. Create `supabase/migrations/004_average_rating_trigger.sql` — PL/pgSQL
   function + trigger that recomputes `books.average_rating` from `avg(rating)`
   whenever `reviews` changes.
5. Create `supabase/migrations/005_seed_data.sql` — SQL inserts derived
   from `src/repositories/mock/mockData.ts`. Use the exact same id strings
   (e.g. `'cat-self-help'`) cast to UUID or use a deterministic approach
   (note: mock ids like `'book-001'` are not valid UUIDs — use `gen_random_uuid()`
   seeded values defined at the top of the file as variables).

**Relevant Context:**
- `bookworm-phase6-supabase-plan.md` §3 — column-by-column table definitions
- `src/repositories/mock/mockData.ts` — the data to seed
- `src/types/book.ts`, `src/types/review.ts` — TypeScript shapes that the DB
  columns must match
- `bookworm-phase6-supabase-plan.md` §8–§9 — RLS enable + public-read policies

**Status:** `[x] done`

---

### Sub-Task 3 — `SupabaseBookRepository`: Core Methods

**Intent:**
Implement the read-only catalogue methods of `BookRepository` that serve the
`CataloguePage` and `BookDetailPage`:
- `getCategories()`
- `getPublishers()`
- `getBookById(id)`
- `getBestsellerBooks()`
- `getNewLaunchBooks()`
- `getRecommendedBooks()`

These are the simplest queries (no complex filtering) and establish the
structural pattern — error wrapping, DB-to-domain type mapping — that all
other methods follow.

**Expected Outcomes:**
- `src/repositories/supabase/SupabaseBookRepository.ts` exists and implements
  `BookRepository`.
- Each method uses the typed Supabase client, maps DB rows to domain types
  (`Book`, `Category`, `Publisher`), and throws a typed `RepositoryError` on
  Supabase errors.
- `getBookById` eagerly embeds `publisher` (via FK) and `categories` (via
  `book_categories` join) in a single round trip so the returned `Book` shape
  is identical to what `MockBookRepository` returns.
- `getBestsellerBooks()` and `getNewLaunchBooks()` filter on the boolean flags;
  `getRecommendedBooks()` fetches books ordered by `copies_sold desc` limited
  to 3 (replacing the static `RECOMMENDED_IDS` list).
- `npm run typecheck` passes with no `any` casts in the new file.

**Todo List:**
1. Create `src/repositories/supabase/SupabaseBookRepository.ts` with class
   skeleton and constructor accepting `SupabaseClient`.
2. Define a `RepositoryError` class (or type alias) wrapping Supabase's
   `PostgrestError` — used by every method to throw consistently.
3. Implement a private `mapBook(row)` helper that converts a DB row (with
   embedded publisher + categories join) to the domain `Book` type.
4. Implement `getCategories()` — `select *` from `categories`.
5. Implement `getPublishers()` — `select *` from `publishers`.
6. Implement `getBookById(id)` — single row with publisher + categories embedded.
7. Implement `getRecommendedBooks()` — `order by copies_sold desc, limit 3`.
8. Implement `getBestsellerBooks()` — `eq('is_bestseller', true)`.
9. Implement `getNewLaunchBooks()` — `eq('is_new_launch', true)`.
10. Write a unit test that stubs the Supabase client and verifies `mapBook`
    produces a correctly shaped `Book` from a DB row.

**Relevant Context:**
- `src/repositories/BookRepository.ts` — the interface to implement
- `src/types/book.ts` — `Book`, `Category`, `Publisher` domain types
- `src/lib/supabase.ts` — the typed client from Sub-Task 1
- `bookworm-phase6-supabase-plan.md` §7 — class structure and query designs
- `src/repositories/mock/MockBookRepository.ts` — reference for the expected
  return shapes

**Status:** `[x] done`

---

### Sub-Task 4 — `SupabaseBookRepository`: `getBooks` with Filtering, Search & Sort

**Intent:**
Implement `getBooks(filters: BookFilters)` — the most complex method. This is
the query that powers the full catalogue: free-text search, category filter,
language, format, price range, publisher, and all sort orders. Uses PostgREST's
composable query builder.

**Expected Outcomes:**
- `getBooks` builds its Supabase query by conditionally chaining filter
  clauses based on which `BookFilters` fields are set. No clause is added for
  an absent filter.
- Free-text search uses `textSearch('title_author_fts', query)` (or equivalent
  `@@` GIN index approach via `.filter()`).
  Alternatively, uses `ilike` on `title` + `author_name` if the FTS index is
  not yet set up, with a note that it degrades to seq-scan on large datasets.
- Category filter joins through `book_categories` — uses the
  `book_categories!inner(category_id)` PostgREST relationship filter.
- Price range uses `.gte('price', min).lte('price', max)`.
- Sort maps `SortField` to `.order(column, { ascending })` pairs.
- Returns `{ books: Book[], total: number }` where `total` uses the
  `count: 'exact'` option on the Supabase query header.
- The method throws `RepositoryError` on any Supabase error.
- Pagination: the method signature accepts an optional `page` and `pageSize`
  parameter (default `pageSize = 50`) appended to `BookFilters` and uses
  `.range(from, to)`. The UI does not use pagination yet but the plumbing is
  in place.

**Todo List:**
1. Extend `BookFilters` in `BookRepository.ts` with optional `page?: number`
   and `pageSize?: number` fields (both optional, defaulting to page 1 /
   pageSize 50 inside the implementation — no UI change needed).
2. Implement `getBooks(filters)` in `SupabaseBookRepository.ts`:
   a. Start query: `supabase.from('books').select('*, publisher:publishers(*), categories:book_categories(category:categories(*))', { count: 'exact' })`.
   b. Conditionally apply: textSearch, category join filter, language eq,
      format eq, price range gte/lte, publisher eq.
   c. Apply sort: map `SortField` → `.order()` call.
   d. Apply pagination: `.range(from, to)`.
   e. Check error, throw `RepositoryError` if present.
   f. Map rows through `mapBook()`, return `{ books, total: count }`.
3. Unit-test: stub client returns 2 rows + `count: 2`; verify result shape.
4. Integration test note (no actual DB needed): verify that passing
   `categorySlug: 'self-help'` produces a query that contains the
   `book_categories` join condition (inspect the query builder call sequence).

**Relevant Context:**
- `src/repositories/BookRepository.ts` — `BookFilters`, `BooksResult`,
  `SortField`
- `bookworm-phase6-supabase-plan.md` §7 `getBooks` section — query design
- `src/repositories/mock/MockBookRepository.ts` `getBooks` — filter logic to
  mirror
- `src/hooks/useCatalogueData.ts` — queryKey includes `filters` object, so
  changes to `BookFilters` type only need to keep the existing optional fields

**Status:** `[x] done`

---

### Sub-Task 5 — `SupabaseBookRepository`: Reviews

**Intent:**
Implement `getReviews(bookId)` and `submitReview(bookId, rating, body)`.
Reviews require a join from `reviews` to `profiles` to populate
`reviewer_name`. `submitReview` must be authenticated (uses `user_id` from the
current Supabase session) and upserts to enforce the one-review-per-user
business rule.

**Expected Outcomes:**
- `getReviews` returns `Review[]` with `reviewer_name` populated from
  `profiles.display_name` via a single join query.
- `submitReview` reads the current user from `supabase.auth.getUser()`, throws
  an `UnauthenticatedError` if no session, then upserts on `(book_id, user_id)`.
- The returned `Review` from `submitReview` includes `reviewer_name` resolved
  from the profile (or falls back to the display name from the auth metadata if
  the profile join is unavailable).
- `getReviews` continues to work for unauthenticated users (public read RLS
  policy).

**Todo List:**
1. Implement `getReviews(bookId)`:
   - Select `*, profiles(display_name)` from `reviews` where
     `book_id = bookId`, order `created_at desc`.
   - Map result: set `reviewer_name = row.profiles.display_name`.
2. Implement `submitReview(bookId, rating, body)`:
   - Call `supabase.auth.getUser()`; throw `UnauthenticatedError` if no user.
   - Upsert into `reviews` with `onConflict: 'book_id,user_id'`.
   - Re-fetch the inserted row with the profiles join to return a full `Review`.
3. Add `UnauthenticatedError` to the error types defined in Sub-Task 3.
4. Unit-test: `getReviews` correctly extracts `reviewer_name` from nested
   `profiles` row.
5. Unit-test: `submitReview` with no session throws `UnauthenticatedError`.

**Relevant Context:**
- `src/types/review.ts` — `Review` type with `reviewer_name: string`
- `bookworm-phase6-supabase-plan.md` §7 `getReviews` section
- `src/hooks/useBookDetail.ts` — `useSubmitReview` calls `submitReview` and
  invalidates `['books', bookId, 'reviews']` on success
- `bookworm-phase6-supabase-plan.md` §10 `reviews` — RLS: authenticated users
  can insert/update their own review; all can read

**Status:** `[x] done`

---

### Sub-Task 6 — `SupabaseBookRepository`: Related Books

**Intent:**
Implement `getRelatedBooks(bookId, categoryIds)` — returns up to 3 books that
share any category with the current book, ordered by `copies_sold desc`,
excluding the current book itself.

**Expected Outcomes:**
- Uses a `book_categories` join to filter books by `category_id = any(categoryIds)`.
- Excludes the current book via `.neq('id', bookId)`.
- Limits to 3 results, ordered by `copies_sold desc`.
- Returns early with `[]` if `categoryIds` is empty (matching mock behaviour).
- Each returned book has embedded publisher + categories via `mapBook()`.

**Todo List:**
1. Implement `getRelatedBooks(bookId, categoryIds)` in `SupabaseBookRepository`.
2. Use PostgREST relationship filtering on `book_categories` to match any
   category in the array (`.in()` or `.filter()` with an array value).
3. Apply `.neq('id', bookId)`, `.order('copies_sold', { ascending: false })`,
   `.limit(3)`.
4. Unit-test: 3 books returned when categoryIds match; 0 returned when
   `categoryIds = []`.

**Relevant Context:**
- `bookworm-phase6-supabase-plan.md` §7 `getRelatedBooks` section
- `src/hooks/useBookDetail.ts` — query enabled only when `categoryIds.length > 0`
- `src/repositories/mock/MockBookRepository.ts` `getRelatedBooks` — reference

**Status:** `[x] done`

---

### Sub-Task 7 — Wire Up & Environment Variables

**Intent:**
Connect `SupabaseBookRepository` as the live singleton in
`src/repositories/index.ts` behind an environment-variable feature flag, so
developers can still use the mock locally without a Supabase project, and the
production build uses the real implementation. Document all required env vars.

**Expected Outcomes:**
- `src/repositories/index.ts` conditionally exports either
  `MockBookRepository` or `SupabaseBookRepository` based on
  `VITE_USE_SUPABASE=true`. When unset, the mock is used.
- `.env.example` is updated with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  and `VITE_USE_SUPABASE`.
- `src/lib/supabase.ts` guards against missing env vars at startup and logs a
  clear error in development (not in production).
- All 71 existing tests continue to pass (they use the mock path).
- `npm run typecheck && npm run lint` still pass.

**Todo List:**
1. Update `src/repositories/index.ts`:
   ```ts
   const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true'
   export const bookRepository = useSupabase
     ? new SupabaseBookRepository(supabase)
     : new MockBookRepository()
   ```
2. Add env var guard to `src/lib/supabase.ts`: warn in dev if URL or key is
   empty/placeholder.
3. Create/update `.env.example` with all required vars and comments.
4. Add `src/repositories/supabase/` to the barrel: export
   `SupabaseBookRepository` from `src/repositories/index.ts` for external
   consumers.
5. Run `npm run typecheck && npm run lint && npm test -- --run` and confirm
   all 71 tests pass.

**Relevant Context:**
- `src/repositories/index.ts` — the one-line swap point
- `e-book-store-fe/src/lib/supabase.ts` — env var consumption
- `bookworm-phase6-supabase-plan.md` §2 — env var definitions

**Status:** `[x] done`

---

### Sub-Task 8 — Error Handling & Loading Behaviour

**Intent:**
Define and implement consistent error handling across `SupabaseBookRepository`
so that React Query's `isError` / `error` state is meaningful and the existing
`ErrorState` and `LoadingState` components in the UI light up correctly without
any UI-layer changes.

**Expected Outcomes:**
- `RepositoryError` (defined in Sub-Task 3) carries: `message: string`,
  `code: string` (Supabase PostgrestError code), `hint?: string`.
- `UnauthenticatedError` (Sub-Task 5) extends `RepositoryError` and is
  identifiable with `instanceof`.
- `NotFoundError` is thrown by `getBookById` when the book doesn't exist (not
  just `null` — React Query's `isError` state fires, allowing the
  `NotFoundState` component to be shown from the error boundary instead of the
  null check in `BookDetailPage`).
  Alternatively, `getBookById` can keep returning `null` — document the
  chosen approach.
- All repository methods wrap Supabase's `{ error }` response and throw rather
  than silently returning empty results.
- React Query's default retry behaviour (3 retries) applies for transient
  errors; `useBookDetail` may configure `retry: false` for 404s to avoid
  unnecessary retries.

**Todo List:**
1. Define `RepositoryError`, `UnauthenticatedError` in
   `src/repositories/supabase/errors.ts`.
2. Document the `getBookById` null-vs-throw decision and implement accordingly.
3. Add a `throwOnError` helper: `function throwOnError(error: PostgrestError | null)` — called at the top of every method.
4. Review all 9 implemented methods and confirm each one calls `throwOnError`.
5. Add `retry` configuration to `useBookDetail` for 404-style errors if the
   throw approach is used.
6. Update `src/repositories/supabase/SupabaseBookRepository.ts` with any
   remaining gaps.

**Relevant Context:**
- `src/hooks/useBookDetail.ts` — `isError`, `refetch`, `NotFoundState`
- `src/pages/BookDetailPage.tsx` — already handles `!book` with `NotFoundState`
- `bookworm-phase6-supabase-plan.md` §11 — error handling design

**Status:** `[x] done`

---

### Sub-Task 9 — Type Safety: `database.types.ts` Alignment

**Intent:**
Ensure that the `Database` type stub from Sub-Task 1 is fully aligned with the
actual migration schema from Sub-Task 2, and that the domain types in
`src/types/book.ts` and `src/types/review.ts` can be derived or validated
against the generated types without requiring runtime transformations.

**Expected Outcomes:**
- `database.types.ts` has `Tables<'books'>['Row']`, `Tables<'categories'>['Row']`,
  etc. that exactly match the columns from the migration SQL.
- `mapBook()` in `SupabaseBookRepository` has no `as any` casts — all property
  accesses are type-safe.
- `numeric` columns from Postgres (`price`, `average_rating`) are typed as
  `number` in the TypeScript stub (Supabase JS v2 automatically converts them).
- `book_format` enum column is typed as `'paperback' | 'ebook' | 'hardcover'`
  matching `BookFormat` in `src/types/book.ts`.
- `npm run typecheck` passes with zero errors.

**Todo List:**
1. Cross-check every column in `database.types.ts` against the SQL in
   Sub-Task 2's migrations. Fix any mismatches.
2. Ensure `Tables<'books'>['Row']` includes the foreign key join fields needed
   by `mapBook()` — specifically the `publisher` object and `categories` array
   (these are not raw table columns; they come from the PostgREST select shape
   and must be modelled as a separate Query result type).
3. Define a `BookQueryRow` type in `SupabaseBookRepository.ts` that represents
   the shape returned by the `getBooks` / `getBookById` Supabase select with
   embeddings. Use this as the parameter type for `mapBook()`.
4. Verify `mapBook()` compiles without `as any`.
5. Final `npm run typecheck` run.

**Relevant Context:**
- `src/types/book.ts` — domain types that `mapBook` must produce
- `src/lib/database.types.ts` — the generated/stub type file
- `bookworm-phase6-supabase-plan.md` §6 — generated TypeScript types design

**Status:** `[x] done`

---

## Implementation Order

```
Sub-Task 1  →  Sub-Task 2  →  Sub-Task 3
                                  ↓
                             Sub-Task 4
                                  ↓
                             Sub-Task 5
                                  ↓
                             Sub-Task 6
                                  ↓
                             Sub-Task 8 (error handling — refines 3–6)
                                  ↓
                             Sub-Task 9 (type safety — finalises everything)
                                  ↓
                             Sub-Task 7 (wire-up — done last)
```

Sub-Tasks 1 and 2 can be done in parallel. Sub-Tasks 3–6 build on each other.
Sub-Tasks 7, 8, and 9 are finishing passes that touch everything.

---

## Key Decisions Captured

| Decision | Choice | Rationale |
|---|---|---|
| Author normalisation | Denormalised on `books` table | Domain types and all UI already use `book.author_name`; a separate table would break every component |
| `getBookById` missing book | Returns `null` (not throw) | `BookDetailPage` already handles `!book` with `NotFoundState`; changing to throw would require UI change |
| `getRecommendedBooks` | Top 3 by `copies_sold desc` | Replaces static `RECOMMENDED_IDS` list; no personalisation needed yet |
| Feature flag | `VITE_USE_SUPABASE=true` | Allows tests and local dev without a Supabase project |
| Pagination | Optional `page`/`pageSize` on `BookFilters` | Plumbing in place; UI does not use it yet — no UI change needed |
| `submitReview` conflict | Upsert on `(book_id, user_id)` | One-review-per-user rule; re-submit updates rather than errors |
| FTS search | GIN index with `@@` operator preferred; fall back to `ilike` if FTS not configured | FTS is faster at scale; ilike works for MVP |
| `average_rating` maintenance | DB trigger on `reviews` | Keeps rating always consistent without app-level coordination |

---

## Files Changed / Created

| File | Action |
|---|---|
| `src/lib/database.types.ts` | **Create** — generated/hand-written DB type stub |
| `src/lib/supabase.ts` | **Edit** — add `Database` generic, env var guard |
| `supabase/migrations/001_catalogue_schema.sql` | **Create** |
| `supabase/migrations/002_catalogue_indexes.sql` | **Create** |
| `supabase/migrations/003_catalogue_rls.sql` | **Create** |
| `supabase/migrations/004_average_rating_trigger.sql` | **Create** |
| `supabase/migrations/005_seed_data.sql` | **Create** |
| `src/repositories/BookRepository.ts` | **Edit** — add optional `page`, `pageSize` to `BookFilters` |
| `src/repositories/supabase/errors.ts` | **Create** — `RepositoryError`, `UnauthenticatedError` |
| `src/repositories/supabase/SupabaseBookRepository.ts` | **Create** — full implementation |
| `src/repositories/index.ts` | **Edit** — feature-flag-based instantiation |
| `.env.example` | **Create/Edit** — document all required vars |

**Files NOT changed:** All `src/pages/`, `src/hooks/`, `src/components/`,
`src/types/` files remain untouched.
