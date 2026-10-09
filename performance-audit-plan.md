# Performance Audit & Optimization Plan — Bibliophile

## Top-Level Overview

This document presents a comprehensive performance audit of the Bibliophile application across front-end bundling, routing, data fetching, database indexing, React rendering, and asset delivery. 

The audit focuses on **meaningful real-world performance improvements** (e.g., initial load time, bandwidth usage, responsive filtering, database query efficiency) rather than premature micro-optimizations.

---

## Performance Audit Findings Summary

### High Impact Issues
1. **No Route-Level Code Splitting**: All pages (including Checkout, Payment, Profile, Order Details, and Design System) are synchronously imported in [`router.tsx`](e-book-store-fe/src/router.tsx:7-21), increasing the initial JS payload for all users.
2. **Missing UI Pagination & Uncapped Queries**: Catalogue queries fetch 50 items by default with `count: 'exact'`, and curated sections (`getBestsellerBooks`, `getNewLaunchBooks`) fetch unbounded rows without `.limit()`. The Catalogue UI renders all returned books at once without pagination or infinite scroll controls.
3. **Database Search Query Mismatch**: Catalogue search uses `ILIKE %term%` on title and author, bypassing the existing Full-Text Search GIN index on `to_tsvector('english', title || ' ' || author_name)`.
4. **Heavy Payload Over-Fetching (`SELECT *`)**: [`SupabaseBookRepository`](e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts:153-157) queries all columns including `description`, `author_bio`, `publisher_description`, and nested categories even for compact card grids.
5. **Missing Image Optimization Attributes**: Images in [`ProductCard`](e-book-store-fe/src/components/ui/ProductCard.tsx:172) and [`CoverGallery`](e-book-store-fe/src/components/book-detail/CoverGallery.tsx:17) lack `loading="lazy"`, `decoding="async"`, and skeleton load states, causing potential layout shifts and eager bandwidth consumption.

### Medium Impact Issues
1. **Auth Context Re-render Cascade**: [`AuthContext.tsx`](e-book-store-fe/src/context/AuthContext.tsx:49-64) instantiates a new context value object and callback references on every render, causing all auth-dependent components to re-render.
2. **Redundant Network Queries on Detail Page**: [`BookDetailPage.tsx`](e-book-store-fe/src/pages/BookDetailPage.tsx:42-60) issues duplicate queries (`useIsInWishlist` and `useWishlist`, plus multi-tier recommendation queries) simultaneously.
3. **Unstabilized Object References in Lists**: `toProductCardBook(book)` in [`BookSection.tsx`](e-book-store-fe/src/components/catalogue/BookSection.tsx:75-81) generates new object references per item per render, defeating memoization on product cards.
4. **Cart Item Upsert Round-Trips**: [`SupabaseCartRepository.addItem`](e-book-store-fe/src/repositories/supabase/SupabaseCartRepository.ts:145-182) uses a fallback catch-and-retry pattern (Insert -> 23505 Conflict -> Select -> Update) requiring up to 3 round-trips.

---

## Prioritized Implementation Sub-Tasks

### Sub-Task 1: Route-Level Code Splitting & Chunk Optimization
- **Intent**: Reduce initial JavaScript bundle size and improve First Contentful Paint (FCP) and Largest Contentful Paint (LCP) for new visitors.
- **Expected Outcomes**:
  - Heavy route pages (`CheckoutPage`, `PaymentPage`, `OrderConfirmationPage`, `OrdersPage`, `ProfilePage`, `DesignSystemPage`) loaded on-demand via `React.lazy` and `Suspense`.
  - Initial JS bundle size reduced by ~30–50%.
- **Todo List**:
  - [ ] Convert static page imports in [`e-book-store-fe/src/router.tsx`](e-book-store-fe/src/router.tsx) to dynamic `React.lazy()` imports.
  - [ ] Wrap router elements in a clean fallback loader / skeleton boundary.
  - [ ] Configure `vite.config.ts` manual chunking for major vendor splits (e.g., Supabase, React Router, TanStack Query).
- **Relevant Context**:
  - [`e-book-store-fe/src/router.tsx`](e-book-store-fe/src/router.tsx)
  - [`e-book-store-fe/vite.config.ts`](e-book-store-fe/vite.config.ts)
- **Status**: `[ ] pending`

---

### Sub-Task 2: Catalogue Pagination & Query Payload Optimization
- **Intent**: Prevent massive payload transfers, lower latency, and provide a scalable catalogue browsing experience.
- **Expected Outcomes**:
  - Catalogue page supports UI pagination controls (or load more) with customizable page size (e.g., 12 or 24 books per page instead of raw dumps).
  - Catalogue and curated list queries fetch only the required card fields (`id`, `title`, `author_name`, `price`, `cover_url`, `rating_avg`, `format`) rather than heavy full descriptions and biographies.
  - Added explicit `.limit()` to curated sections (`bestsellers`, `new-launches`).
- **Todo List**:
  - [ ] Define a lightweight projection/select string for card listings in [`SupabaseBookRepository.ts`](e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts).
  - [ ] Add explicit limits to `getBestsellerBooks(limit = 10)` and `getNewLaunchBooks(limit = 10)`.
  - [ ] Add pagination UI controls to [`CataloguePage.tsx`](e-book-store-fe/src/pages/CataloguePage.tsx) and pass `page`/`pageSize` to [`useCatalogueBooks`](e-book-store-fe/src/hooks/useCatalogueData.ts).
  - [ ] Configure `placeholderData: keepPreviousData` in `useCatalogueBooks` to prevent page jumping during filter/page transitions.
- **Relevant Context**:
  - [`e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts`](e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts)
  - [`e-book-store-fe/src/pages/CataloguePage.tsx`](e-book-store-fe/src/pages/CataloguePage.tsx)
  - [`e-book-store-fe/src/hooks/useCatalogueData.ts`](e-book-store-fe/src/hooks/useCatalogueData.ts)
- **Status**: `[ ] pending`

---

### Sub-Task 3: Database Query & Index Alignment (Search & Cart/Wishlist Lookups)
- **Intent**: Eliminate table scans during catalogue search and optimize cart/wishlist verification lookups.
- **Expected Outcomes**:
  - Search queries leverage PostgreSQL full-text search index (`books_fts_idx`) or trigram index (`pg_trgm`) rather than unindexed ILIKE operations.
  - Composite indexes added for cart and wishlist item lookups where necessary.
- **Todo List**:
  - [ ] Update [`SupabaseBookRepository.getBooks`](e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts) search logic to use Supabase textSearch (`.textSearch('fts', ...)` or matching index expression) or create a migration for `pg_trgm` gin index for substring matching.
  - [ ] Review and optimize `cart_items` and `wishlist_items` indexes in migration scripts.
- **Relevant Context**:
  - [`supabase/migrations/002_catalogue_indexes.sql`](supabase/migrations/002_catalogue_indexes.sql)
  - [`e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts`](e-book-store-fe/src/repositories/supabase/SupabaseBookRepository.ts)
- **Status**: `[ ] pending`

---

### Sub-Task 4: Image Loading, Skeleton Placeholders & Asset Strategy
- **Intent**: Improve Core Web Vitals (LCP, CLS) and prevent network contention from eager image loading.
- **Expected Outcomes**:
  - All product book covers and detail covers use `loading="lazy"` and `decoding="async"`.
  - Proper aspect-ratio containers and image load skeleton/error fallbacks to prevent Cumulative Layout Shift (CLS).
- **Todo List**:
  - [ ] Update [`ProductCard.tsx`](e-book-store-fe/src/components/ui/ProductCard.tsx) and [`BookCover.tsx`](e-book-store-fe/src/components/book-detail/BookCover.tsx) with native `loading="lazy"`, `decoding="async"`, and error fallback states.
  - [ ] Ensure cover image containers have fixed aspect ratios (`aspect-[2/3]`) across all viewports.
- **Relevant Context**:
  - [`e-book-store-fe/src/components/ui/ProductCard.tsx`](e-book-store-fe/src/components/ui/ProductCard.tsx)
  - [`e-book-store-fe/src/components/book-detail/CoverGallery.tsx`](e-book-store-fe/src/components/book-detail/CoverGallery.tsx)
  - [`e-book-store-fe/src/components/book-detail/BookCover.tsx`](e-book-store-fe/src/components/book-detail/BookCover.tsx)
- **Status**: `[ ] pending`

---

### Sub-Task 5: React Rendering & State Memoization
- **Intent**: Eliminate unnecessary component re-renders during interactions (typing in search, toggling filters, opening carts).
- **Expected Outcomes**:
  - Context provider values stabilized with `useMemo` and `useCallback`.
  - Item cards in catalogue grid are memoized (`React.memo`) and mapping functions are stabilized to prevent re-rendering unaffected cards.
- **Todo List**:
  - [ ] Wrap [`AuthContext`](e-book-store-fe/src/context/AuthContext.tsx) methods and context value with `useCallback` and `useMemo`.
  - [ ] Memoize [`ProductCard`](e-book-store-fe/src/components/ui/ProductCard.tsx) with `React.memo`.
  - [ ] Stabilize `toProductCardBook` transformation in [`BookSection.tsx`](e-book-store-fe/src/components/catalogue/BookSection.tsx).
- **Relevant Context**:
  - [`e-book-store-fe/src/context/AuthContext.tsx`](e-book-store-fe/src/context/AuthContext.tsx)
  - [`e-book-store-fe/src/components/ui/ProductCard.tsx`](e-book-store-fe/src/components/ui/ProductCard.tsx)
  - [`e-book-store-fe/src/components/catalogue/BookSection.tsx`](e-book-store-fe/src/components/catalogue/BookSection.tsx)
- **Status**: `[ ] pending`

---

### Sub-Task 6: Deduplication & Optimizations for Detail Page & Mutations
- **Intent**: Reduce redundant network round-trips on book detail pages and multi-step cart mutations.
- **Expected Outcomes**:
  - Wishlist existence check reuses data from query cache instead of issuing independent network requests.
  - Recommendation fetch on detail page scoped and bounded to prevent excessive parallel DB calls.
- **Todo List**:
  - [ ] Refactor detail page hooks to derive existence status from cached collections when available.
  - [ ] Optimize [`CatalogueRecommendationService.ts`](e-book-store-fe/src/services/CatalogueRecommendationService.ts) to avoid redundant search queries and apply `.limit()`.
- **Relevant Context**:
  - [`e-book-store-fe/src/pages/BookDetailPage.tsx`](e-book-store-fe/src/pages/BookDetailPage.tsx)
  - [`e-book-store-fe/src/services/CatalogueRecommendationService.ts`](e-book-store-fe/src/services/CatalogueRecommendationService.ts)
  - [`e-book-store-fe/src/repositories/supabase/SupabaseCartRepository.ts`](e-book-store-fe/src/repositories/supabase/SupabaseCartRepository.ts)
- **Status**: `[ ] pending`
