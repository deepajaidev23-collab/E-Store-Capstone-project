# Reviews Feature Plan

## Overview

The reviews feature is **already partially implemented**. The database schema, RLS, average-rating trigger, repository methods, React Query hooks, and the base `ReviewsSection` UI component all exist. What is missing is the **edit flow**, the **unauthenticated-user prompt**, and two small corrections (body character limit, query invalidation on submit).

No new database migrations are needed. No new repository methods are needed. The work is entirely in the frontend.

### Scope

**In scope**
- Extend body character limit from 100 → 500 characters
- Show a "Sign in to leave a review" prompt when the user is not logged in
- Detect when the current user already has a review for the book
- Hide the submit form and instead show the user's own review with an "Edit" button
- Inline edit mode: clicking "Edit" replaces the static `ReviewItem` with an editable form
- Fix `useSubmitReview` to also invalidate `['books', bookId]` so the displayed `average_rating` in `BookMeta` refreshes after submit/edit
- Update the `updated_at`-aware display text ("Reviewed on" vs "Last edited on") in `ReviewItem` — only if an `updated_at` column is added to the schema; otherwise omit
- Keep reviews permanent (no delete)

**Out of scope**
- Purchase restriction (any authenticated user may review)
- Delete capability
- Pagination of the review list
- Backend/API changes (no server-side code)
- Admin moderation

### Key decisions recorded

| Decision | Choice |
|---|---|
| Purchase required to review? | No — any authenticated user |
| Delete allowed? | No — reviews are permanent |
| Body character limit | 500 |
| Unauthenticated experience | Show a sign-in link prompt in place of the form |
| Edit mechanism | Inline, in the review list; submit form hidden when user already has a review |
| Edit data path | Reuse existing `submitReview` upsert — no new repository method |

---

## Architecture

The feature follows the existing pattern: `BookDetailPage` → React Query hooks → `BookRepository` interface → `SupabaseBookRepository` → Supabase.

```
BookDetailPage
  ├─ useBookReviews(bookId)           → reads reviews list
  ├─ useSubmitReview(bookId)          → upsert (create or edit)
  ├─ useAuth()                        → determines if user is logged in + user.id
  └─ ReviewsSection
       ├─ [unauthenticated]  SignInPrompt
       ├─ [user has review]  ReviewItem (with Edit button → inline edit form)
       ├─ [no review yet]    SubmitForm
       └─ Review list (other users' reviews)
```

---

## Sub-Tasks

---

### Sub-Task 1 — Fix `useSubmitReview` cache invalidation

**Status:** `[ ] pending`

**Intent**
After a user submits or edits a review, `books.average_rating` is updated by the database trigger. The displayed rating in `BookMeta` (which reads from the cached `['books', bookId]` query) will be stale unless that cache entry is also invalidated.

**Expected Outcomes**
- After a review submit or edit, the `average_rating` shown in `BookMeta` updates without a full page reload.

**Todo List**
1. In `e-book-store-fe/src/hooks/useBookDetail.ts`, inside `useSubmitReview`'s `onSuccess` callback, add a second `queryClient.invalidateQueries` call for key `['books', bookId]` (in addition to the existing `['books', bookId, 'reviews']` invalidation).

**Relevant Context**
- Hook: [`useSubmitReview`](e-book-store-fe/src/hooks/useBookDetail.ts:32)
- Book query key used by `useBookDetail`: `['books', bookId]`

---

### Sub-Task 2 — Extend body character limit to 500

**Status:** `[ ] pending`

**Intent**
The current 100-character cap is too short for a meaningful review body. The DB has no CHECK constraint on body length (it is `text not null default ''`), so this is purely a UI change.

**Expected Outcomes**
- `MAX_CHARS` in `ReviewsSection` is 500.
- The `CharCounter` shows the new limit.
- The textarea's `onChange` slice is updated to 500.

**Todo List**
1. In [`ReviewsSection`](e-book-store-fe/src/components/book-detail/ReviewsSection.tsx:23), change `const MAX_CHARS = 100` to `const MAX_CHARS = 500`.

**Relevant Context**
- Component: [`ReviewsSection`](e-book-store-fe/src/components/book-detail/ReviewsSection.tsx)
- The `CharCounter` component already accepts `current` and `max` props — no change needed there.

---

### Sub-Task 3 — Add unauthenticated-user prompt

**Status:** `[ ] pending`

**Intent**
Unauthenticated visitors should see a clear call to action to sign in rather than the review form. This matches the pattern used elsewhere in the app (cart, wishlist) where auth-gated actions redirect to `/login?next=...`.

**Expected Outcomes**
- When `user` is `null`, `ReviewsSection` renders a "Sign in to leave a review" message with a link to `/login?next=/books/{bookId}`.
- The textarea form is not rendered at all for unauthenticated users.
- The review list is still visible to everyone.

**Todo List**
1. Add a `user` prop (type `User | null` from `@supabase/supabase-js`) and a `bookId` prop to the `ReviewsSectionProps` interface in [`ReviewsSection.tsx`](e-book-store-fe/src/components/book-detail/ReviewsSection.tsx:9).
2. In the JSX, replace the form block with a conditional: if `!user`, render a sign-in prompt (`<Alert>` or a simple styled `<p>` with a `<Link to={...}>Sign in</Link>`); otherwise render the existing form.
3. In [`BookDetailPage.tsx`](e-book-store-fe/src/pages/BookDetailPage.tsx:188), pass `user={user}` and `bookId={bookId}` to `<ReviewsSection>`.

**Relevant Context**
- Auth state access: [`useAuth`](e-book-store-fe/src/hooks/useAuth.ts) — already used in `BookDetailPage` line 29
- Similar auth-gated redirect pattern: `handleAddToCart` in [`BookDetailPage.tsx`](e-book-store-fe/src/pages/BookDetailPage.tsx:68)
- UI primitives: `Alert`, `Button` from `@/components/ui`
- React Router `Link` is available via `react-router-dom`

---

### Sub-Task 4 — Detect and surface the current user's existing review

**Status:** `[ ] pending`

**Intent**
Before showing the submit form to an authenticated user, we need to check whether they have already reviewed this book. If they have, the submit form should be replaced by their existing review card (with an Edit button).

**Expected Outcomes**
- `BookDetailPage` derives `userReview` (the `Review` object where `review.user_id === user?.id`, or `undefined` if none).
- This value is passed down to `ReviewsSection`.
- `ReviewsSection` uses `userReview` to decide which panel to show (submit form vs "your review").
- The review list renders the remaining reviews (excluding the user's own, to avoid duplication), or all reviews if not logged in.

**Todo List**
1. In [`BookDetailPage.tsx`](e-book-store-fe/src/pages/BookDetailPage.tsx:60), after `const { data: reviews = [] }`, derive: `const userReview = reviews.find((r) => r.user_id === user?.id)`.
2. Add a `userReview?: Review` prop to `ReviewsSectionProps`.
3. Pass `userReview={userReview}` to `<ReviewsSection>`.
4. In the review list inside `ReviewsSection`, filter out the user's own review from the `reviews` map (since it's displayed separately in its own panel).

**Relevant Context**
- `Review` type: [`e-book-store-fe/src/types/review.ts`](e-book-store-fe/src/types/review.ts)
- `reviews` array already loaded via `useBookReviews` hook

---

### Sub-Task 5 — Implement the inline edit flow in `ReviewsSection`

**Status:** `[ ] pending`

**Intent**
When a logged-in user already has a review, show it in a "Your Review" panel with an Edit button. Clicking Edit replaces that panel with an editable form (pre-filled with the existing rating and body). Saving calls `onSubmit` (the existing upsert), which updates the record and refreshes the list.

**Expected Outcomes**
- Authenticated users who have a review see a "Your Review" heading, their `ReviewItem`, and an "Edit" button.
- Clicking "Edit" shows an editable version of the form, pre-filled with their current `rating` and `body`.
- The submit button in edit mode says "Save changes" instead of "Submit".
- After a successful save, the form returns to view mode and the updated review is shown.
- Cancelling returns to view mode without changes.
- The global submit form (for new reviews) is completely hidden when `userReview` is set.

**Todo List**
1. Add `isEditing` local state (boolean, default `false`) inside `ReviewsSection`.
2. Add a "Your Review" section above the general review list: rendered only when `userReview` is defined and `user` is not null.
3. In the "Your Review" section:
   - When `!isEditing`: render `<ReviewItem review={userReview}>` plus an "Edit" button that sets `isEditing = true` and pre-fills `rating` and `body` state from `userReview`.
   - When `isEditing`: render the form (star picker + textarea + `CharCounter`) pre-filled, with "Save changes" as the submit label and a "Cancel" button that sets `isEditing = false`.
4. On successful save, set `isEditing = false` and `setSuccess(true)`.
5. Wrap the existing "Leave Your Review" form block in a condition: only render it when `userReview` is `undefined`.

**Relevant Context**
- Existing form state in `ReviewsSection`: `body`, `rating`, `hovered`, `submitting`, `success` — these can be reused for both the create and edit forms since only one can be active at a time.
- `handleSubmit` already calls `onSubmit` which maps to `submitReviewMutation` (upsert) — no changes needed in the mutation path.
- `ReviewItem` component: [`ReviewsSection.tsx:155`](e-book-store-fe/src/components/book-detail/ReviewsSection.tsx:155)

---

## Cross-cutting notes

### No database migration required
The schema is already correct:
- `reviews` table: `unique (book_id, user_id)`, `rating smallint check (rating between 1 and 5)`, `body text not null default ''`
- `submitReview` already uses `.upsert(..., { onConflict: 'book_id,user_id' })` — so an edit is just a re-upsert
- Average-rating trigger fires on INSERT and UPDATE, so edits automatically recalculate the book rating
- No DELETE RLS policy is needed

### No new repository methods required
The existing `BookRepository.submitReview(bookId, rating, body)` handles both create and edit via upsert.

### `updated_at` column
The `reviews` table does **not** currently have an `updated_at` column. The UI should therefore not show "Last edited on" messaging. If a future migration adds `updated_at`, the `ReviewItem` and `Review` type can be updated then.

### `database.types.ts`
No changes required. The `reviews.Update` type already includes optional `rating` and `body` fields which cover the upsert payload.
