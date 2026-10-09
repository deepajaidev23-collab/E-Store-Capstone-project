# Phase 5 — Book Detail Page Plan

## Top-Level Overview

Implement the `/books/:bookId` route as a full product detail page that matches the
design screenshot: a two-column desktop layout (detail ~70% / Related Reads ~30%),
collapsing to single-column on mobile with Related Reads below.

The page is **publicly accessible** (no auth guard). Auth is only checked at the
action level — Add to Cart and Add to Wishlist redirect unauthenticated users to
`/login?next=/books/:bookId`.

All data comes through the existing `BookRepository` abstraction. Supabase is **not**
connected. Reviews are submitted to in-memory state only.

---

## Component Hierarchy

```
BookDetailPage                          ← route page, owns all data hooks
├── Breadcrumbs                         ← Home / Catalogue / {category} / {title}
├── [two-column layout]
│   ├── [left column — ~70%]
│   │   ├── BookDetailHero              ← covers + core metadata + action buttons
│   │   │   ├── CoverGallery            ← main cover + back-cover thumbnail
│   │   │   └── BookMeta                ← title, author link, publisher link, price,
│   │   │                                  format, language, genre tags, rating, sales
│   │   │   └── BookActions             ← Add to Cart + Add to Wishlist buttons
│   │   ├── AuthorCard                  ← avatar placeholder, bio text
│   │   └── ReviewsSection              ← leave-review form + list of seeded reviews
│   │       ├── ReviewForm              ← textarea (0/100), star picker, Submit
│   │       └── ReviewList              ← list of ReviewItem cards
│   └── [right column — ~30%]
│       └── RelatedReadsPanel           ← "Related Reads" heading + up to 3 ProductCards
```

---

## Data Flow

```
useBookDetail(bookId)            → Book | null   (getBookById)
useRelatedBooks(bookId, book)    → Book[]        (getRelatedBooks — new repo method)
useBookReviews(bookId)           → Review[]      (getReviews — new repo method)
useSubmitReview()                → mutation fn   (submitReview — new repo method)
```

All hooks follow the exact pattern in `src/hooks/useCatalogueData.ts`:
- `useQuery` with `queryKey: ['books', bookId, ...]`
- Destructure `{ data, isLoading, isError, refetch }`

---

## Sub-Tasks

---

### Sub-Task 1 — Extend Repository Layer

**Status:** `[x] done`

**Intent:**
Add `getReviews`, `submitReview`, and `getRelatedBooks` to the
`BookRepository` interface and implement them in `MockBookRepository`.
Seed mock review data. No UI changes.

**Expected Outcomes:**
- `BookRepository` interface has three new method signatures
- `MockBookRepository` implements all three
- Mock data contains ≥ 2 seeded reviews per seeded book (or at minimum for
  the books we know will be tested against)
- `repositories/index.ts` singleton needs no change (class already exported)

**Todo List:**
1. In `src/types/review.ts` confirm the `Review` interface is sufficient
   (fields: id, book_id, user_id, rating, body, created_at). Add a
   `reviewer_name: string` field for display purposes since there is no
   profile lookup yet.
2. Add three methods to `BookRepository` interface in
   `src/repositories/BookRepository.ts`:
   - `getReviews(bookId: string): Promise<Review[]>`
   - `submitReview(bookId: string, rating: number, body: string): Promise<Review>`
   - `getRelatedBooks(bookId: string, categoryIds: string[]): Promise<Book[]>`
     (returns up to 3 books sharing any of the provided category ids, excluding
     bookId itself)
3. Seed at least 6 mock reviews across 3–4 books in
   `src/repositories/mock/mockData.ts` (REVIEWS constant array)
4. Implement the three methods in
   `src/repositories/mock/MockBookRepository.ts`:
   - `getReviews`: filter REVIEWS array by book_id
   - `submitReview`: push a new Review object (with generated id + timestamp)
     into the in-memory array and return it
   - `getRelatedBooks`: filter BOOKS by shared category slug, exclude current
     book, shuffle deterministically (sort by copies_sold desc), return first 3

**Relevant Context:**
- `src/types/review.ts` — current Review interface (add reviewer_name)
- `src/repositories/BookRepository.ts` — interface to extend
- `src/repositories/mock/mockData.ts` — BOOKS, CATEGORIES already defined; add REVIEWS
- `src/repositories/mock/MockBookRepository.ts` — class to extend
- `src/repositories/index.ts` — no changes needed

---

### Sub-Task 2 — Data Hooks

**Status:** `[x] done`

**Intent:**
Create react-query hooks for book detail data. These are the only files that
know about `bookRepository` — the page and components receive plain data.

**Expected Outcomes:**
- `src/hooks/useBookDetail.ts` exports four named hooks:
  `useBookDetail`, `useRelatedBooks`, `useBookReviews`, `useSubmitReview`
- Hooks follow identical patterns to `src/hooks/useCatalogueData.ts`
- TypeScript compilation passes with no errors

**Todo List:**
1. Create `src/hooks/useBookDetail.ts` with:
   - `useBookDetail(bookId: string)` — `useQuery(['books', bookId], getBookById)`
   - `useRelatedBooks(bookId: string, categoryIds: string[])` — `useQuery(['books', bookId, 'related'], getRelatedBooks)`; disabled when `categoryIds` is empty
   - `useBookReviews(bookId: string)` — `useQuery(['books', bookId, 'reviews'], getReviews)`
   - `useSubmitReview(bookId: string)` — `useMutation` that calls `submitReview`
     and on success invalidates the `['books', bookId, 'reviews']` query via
     `queryClient.invalidateQueries`

**Relevant Context:**
- `src/hooks/useCatalogueData.ts` — pattern to follow exactly
- `src/lib/queryClient.ts` — queryClient singleton for `invalidateQueries`
- `src/repositories/index.ts` — `bookRepository` singleton import
- `@tanstack/react-query` already in dependencies: `useQuery`, `useMutation`,
  `useQueryClient`

---

### Sub-Task 3 — Presentational Components

**Status:** `[x] done`

**Intent:**
Build the five leaf presentational components that the page assembles.
Each receives plain props only — no hooks, no router calls, no repository
imports.

**Expected Outcomes:**
- All five components render correctly when given valid props
- Components use only tokens from `src/index.css` (CSS custom properties)
  and existing UI primitives from `src/components/ui/index.ts`
- No business logic escapes into these components

**Todo List:**

1. **`src/components/book-detail/CoverGallery.tsx`**
   - Props: `title: string`, `mainCoverUrl: string`, `backCoverUrl?: string`
   - Renders: large main cover (`BookCover` size `lg`) + smaller thumbnail
     (`BookCover` size `md`) side by side with a magnifier icon on the
     thumbnail (visual affordance from screenshot)
   - Uses `BookCover` from `src/components/ui/ProductCard.tsx`

2. **`src/components/book-detail/BookMeta.tsx`**
   - Props: title, author_name, publisher name, description, price,
     original_price, format, language, average_rating, copies_sold, categories
   - Renders: title (`Heading` h1), author as link-styled text
     (`text-[var(--color-tag)]`), publisher link, description paragraph,
     `Price` component, `StarRating` + "X copies sold", format/language
     badges, genre category links (navigate to `/catalogue/:slug`)
   - Uses `Heading`, `Text`, `Price`, `StarRating` from the ui barrel

3. **`src/components/book-detail/BookActions.tsx`**
   - Props: `onAddToCart: () => void`, `onAddToWishlist: () => void`,
     `isAuthenticated: boolean`, `isLoading?: boolean`
   - Renders: "Add to Cart" primary `Button` with cart icon, "Add to
     Wishlist" secondary `Button` with heart icon
   - Both buttons fire the callback regardless of auth — the page-level
     handler decides whether to redirect or act

4. **`src/components/book-detail/AuthorCard.tsx`**
   - Props: `authorName: string`, `authorBio: string | null`,
     `avatarUrl: string | null`
   - Renders: "About the writer" section heading, circular avatar (image
     or initials fallback), author name, bio paragraph
   - Uses `Card` variant `default`, `Heading` h3, `Text`

5. **`src/components/book-detail/ReviewsSection.tsx`**
   - Props: `bookId: string`, `reviews: Review[]`, `reviewsLoading: boolean`,
     `onSubmit: (rating: number, body: string) => Promise<void>`,
     `submitError: string | null`
   - Renders two sub-sections:
     a. **ReviewForm**: `Textarea` (max 100 chars) with `CharCounter`, 5-star
        interactive rating picker (clicking a star sets the rating), Submit
        `Button`; clears fields on successful submit
     b. **ReviewList**: list of `ReviewItem` — reviewer name, `StarRating`,
        body text, `created_at` formatted date
   - Uses `Textarea`, `Button`, `CharCounter`, `Alert`, `StarRating`,
     `LoadingState`, `EmptyState` from ui barrel

**Relevant Context:**
- `src/components/ui/index.ts` — all available primitives
- `src/components/ui/ProductCard.tsx` — `BookCover`, `StarRating`
- `src/components/ui/Form.tsx` — `CharCounter`
- `src/components/ui/LoadingState.tsx` — `Skeleton`, `LoadingState`
- `src/components/catalogue/BookSection.tsx` — toProductCardBook adapter
  pattern for Related Reads
- `src/index.css` — all CSS tokens

---

### Sub-Task 4 — RelatedReadsPanel Component

**Status:** `[x] done`

**Intent:**
Build the sidebar component that shows up to 3 related books, reusing
`ProductCard` in compact variant. Kept as its own sub-task because it has
a distinct loading/empty pattern and sits in a different column.

**Expected Outcomes:**
- `src/components/book-detail/RelatedReadsPanel.tsx` renders correctly
- Shows `ProductCardSkeleton` ×3 while loading
- Shows `EmptyState` with a browse-catalogue CTA if no related books exist
- Compact `ProductCard` links navigate to `/books/:id`

**Todo List:**
1. Create `src/components/book-detail/RelatedReadsPanel.tsx`:
   - Props: `books: Book[]`, `loading: boolean`
   - Map domain `Book` → `ProductCardBook` using the same adapter pattern as
     `BookSection.tsx` (`toProductCardBook` helper, local to this file)
   - Render "Related Reads" `Heading` h2, then a vertical list of
     `ProductCard variant="compact"` cards
   - Loading: show 3× `ProductCardSkeleton`
   - Empty: show a short message + link to `/catalogue`

**Relevant Context:**
- `src/components/catalogue/BookSection.tsx` lines 26-38 — adapter pattern
- `src/components/ui/ProductCard.tsx` — `ProductCard`, `ProductCardSkeleton`
- `src/components/ui/EmptyState.tsx` — `EmptyState`

---

### Sub-Task 5 — BookDetailPage Assembly

**Status:** `[x] done`

**Intent:**
Wire all hooks and components together in `BookDetailPage`. This file is
the only place that knows about routing params, hooks, auth state, and
cart/wishlist redirect logic.

**Expected Outcomes:**
- `/books/book-001` (and any valid mock id) renders the full page
- Breadcrumbs reflect `Home / Catalogue / {first category name} / {book title}`
- Page-level loading shows a structured skeleton (not a spinner)
- Page-level 404 uses `NotFoundState` component
- Page-level error uses `ErrorState` with Retry
- Add to Cart / Wishlist: if no auth, redirect to `/login?next=/books/:bookId`
  (using `useNavigate` and `useAuth`); if auth, log the action to console
  (actual cart/wishlist implementation is a later phase)
- Responsive: `flex-col` on mobile, `flex-row` on `md:` breakpoint

**Todo List:**
1. Replace the stub in `src/pages/BookDetailPage.tsx` with the full
   implementation:
   a. Read `bookId` from `useParams()`
   b. Call `useBookDetail(bookId)`, `useRelatedBooks`, `useBookReviews`,
      `useSubmitReview`
   c. Derive `categoryIds` from `book.categories` to pass to `useRelatedBooks`
   d. Handle three top-level states: loading (skeleton layout), 404 (book is
      null after load completes), error (repo threw)
   e. Build `breadcrumbItems` from book data
   f. Auth check for cart/wishlist actions using `useAuth()`; if no user,
      call `navigate('/login?next=/books/:bookId')`
   g. Pass `onSubmit` callback from `useSubmitReview` mutation into
      `ReviewsSection`
   h. Responsive two-column layout:
      - Mobile: `flex-col`; Related Reads below reviews
      - Desktop (`md:`): `flex-row`; Related Reads fixed sidebar right

**Relevant Context:**
- `src/router.tsx:27` — route definition
- `src/hooks/useBookDetail.ts` — hooks from Sub-Task 2
- `src/components/book-detail/` — all components from Sub-Tasks 3 & 4
- `src/components/ui/Navigation.tsx` — `Breadcrumbs`
- `src/components/ui/ErrorState.tsx` — `ErrorState`, `NotFoundState`
- `src/components/ui/LoadingState.tsx` — `Skeleton`
- `src/hooks/useAuth.ts` — auth state
- `src/context/AuthContext.tsx` — `AuthContextValue` shape

---

### Sub-Task 6 — Tests

**Status:** `[x] done`

**Intent:**
Validate the new repository methods and the submit-review flow.
No DOM tests for this phase (components are straightforward renders).

**Expected Outcomes:**
- All existing tests continue to pass
- New test file `src/test/bookDetail.test.ts` passes

**Todo List:**
1. Create `src/test/bookDetail.test.ts` covering:
   - `getBookById` returns correct book for known id
   - `getBookById` returns null for unknown id
   - `getRelatedBooks` returns only books sharing a category, excluding self
   - `getRelatedBooks` returns at most 3 results
   - `getReviews` returns only reviews for the given book_id
   - `submitReview` appends review to in-memory store; subsequent `getReviews`
     call returns the new review
   - `submitReview` increments review count correctly across calls
2. Run `npm run typecheck`, `npm run lint`, `npm test` — all must pass

**Relevant Context:**
- `src/test/catalogue.test.ts` — identical test structure/pattern to follow
- `src/repositories/mock/MockBookRepository.ts` — class under test
- `src/repositories/mock/mockData.ts` — BOOKS and REVIEWS seed data

---

## Accessibility Requirements

- `<main>` landmark wraps the left column content
- `<aside>` landmark wraps the Related Reads panel with `aria-label="Related Reads"`
- `Breadcrumbs` uses `<nav aria-label="Breadcrumb">` (already built in)
- Book title is `<h1>`; "About the writer" and "Reviews" are `<h2>`; Review
  form sub-headings are `<h3>`
- Star rating picker: each star is a `<button>` with `aria-label="Rate N out of 5"`
  and `aria-pressed` reflecting current selection
- Review submit button has `type="submit"` with `aria-busy` when loading
- Images: cover images have `alt={book.title}` (already in `BookCover`)
- Genre tags linking to catalogue use `<a>` (via `Link`) not `<button>`
- Review list items have `<article>` with `aria-label="Review by {name}"`

---

## Error & Loading Behaviour

| State | What renders |
|---|---|
| Book loading | Full-page skeleton: cover placeholder + text skeleton lines + sidebar skeletons |
| Book not found (null after load) | `NotFoundState` with "Go to catalogue" button |
| Book fetch error | `ErrorState` with title "Could not load book", Retry button |
| Related books loading | 3× `ProductCardSkeleton` in sidebar |
| Related books empty | Short message + link to catalogue |
| Reviews loading | `LoadingState` spinner inside reviews section |
| Submit review error | `Alert variant="error"` above the form |
| Submit review success | Form clears, new review appears at top of list |

---

## Non-Goals for This Phase

- Actual cart / wishlist persistence (later phase)
- Author profile page
- Supabase integration
- Pagination of reviews
- Image upload for covers
