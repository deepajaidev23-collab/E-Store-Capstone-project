# Error-Handling Architecture and Implementation Plan

## Top-Level Overview

This plan establishes an end-to-end error handling, resilient retry, fallback UI, logging, and offline strategy across the BookWorm application. The architecture encompasses:
- React 19 / Vite frontend infrastructure (React Error Boundaries, route-level `errorElement` fallbacks, centralized toast/alert system, accessible live announcements)
- TanStack React Query retry and cache recovery policies with fine-grained error classification
- Domain-specific error handling for Authentication, Catalogue, Product Details, Wishlist, Cart, Checkout, Payment, Orders, and Reviews
- Supabase error normalization, rate limiting, and network drop recovery
- Structured logging utility with privacy-sensitive payload scrubbing

---

## Sub-Tasks

### Sub-Task 1: Core Logging & Error Classification Utilities
- **Intent**: Provide a structured logging framework and standardized error taxonomy across all application layers, ensuring consistent error normalization and sensitive data scrubbing.
- **Expected Outcomes**:
  - Centralized logger module supporting `DEBUG`, `INFO`, `WARN`, `ERROR`, and `FATAL` log levels.
  - Automatic PII/sensitive credential sanitization (passwords, payment numbers, CVVs, tokens).
  - Enhanced error taxonomy classifying Supabase, Network, Auth, and Business validation errors with standard HTTP/Postgres codes.
- **Todo List**:
  - [ ] Create structured logger utility with configurable log levels and payload sanitization.
  - [ ] Enhance repository error classes to distinguish between transient network issues, authorization failures, constraint conflicts, and validation errors.
  - [ ] Add unit tests for logger sanitization and error classification helpers.
- **Relevant Context**:
  - `e-book-store-fe/src/repositories/supabase/errors.ts`
  - `e-book-store-fe/src/lib/supabase.ts`
- **Status**: [ ] pending

---

### Sub-Task 2: Global & Route-Level Error Boundaries and Fallback UI
- **Intent**: Prevent uncaught component runtime crashes from tearing down the entire app, providing resilient recovery options and route-isolated failure views.
- **Expected Outcomes**:
  - Global `RootErrorBoundary` catching unhandled React rendering errors with action to reload or navigate home.
  - Route-level `errorElement` attached to React Router route definitions to isolate page failures.
  - Reusable `<ErrorState />` and `<NotFoundState />` components standardized across all views.
- **Todo List**:
  - [ ] Create a React Error Boundary component with reload and home redirect actions.
  - [ ] Connect `errorElement` across root and nested routes in the router configuration.
  - [ ] Standardize `<ErrorState />` component props for retry callbacks and contextual messaging.
  - [ ] Add component tests for ErrorBoundary rendering and recovery behavior.
- **Relevant Context**:
  - `e-book-store-fe/src/router.tsx`
  - `e-book-store-fe/src/components/ui/ErrorState.tsx`
  - `e-book-store-fe/src/App.tsx`
- **Status**: [ ] pending

---

### Sub-Task 3: TanStack Query Retry & Network Resilience Configuration
- **Intent**: Configure resilient retry policies, exponential backoff, and offline awareness for data queries and mutations.
- **Expected Outcomes**:
  - Queries automatically retry on transient network errors and 5xx failures using exponential backoff while fast-failing on 4xx client errors.
  - Safe mutation retry defaults to prevent duplicate side effects while supporting idempotent payment/order retries.
  - Connectivity hook / banner notifying users when network connectivity is lost or restored.
- **Todo List**:
  - [ ] Configure global `QueryClient` default retry, retryDelay, and network mode policies.
  - [ ] Implement an online status hook and offline notification banner.
  - [ ] Validate query behavior for offline scenarios and transient drop recovery.
- **Relevant Context**:
  - `e-book-store-fe/src/App.tsx`
  - `e-book-store-fe/src/hooks/useCatalogueData.ts`
  - `e-book-store-fe/src/hooks/useCart.ts`
- **Status**: [ ] pending

---

### Sub-Task 4: Authentication & Session Error Handling
- **Intent**: Handle credential failures, unconfirmed emails, registration conflicts, and stale auth sessions cleanly with user-friendly recovery flows.
- **Expected Outcomes**:
  - User-facing error messages for invalid credentials, existing accounts, and email confirmation requirements.
  - Automatic token refresh handling on 401/403 with graceful redirection to login preserving the return path.
- **Todo List**:
  - [ ] Map Supabase auth error codes to friendly human-readable alerts in login and registration pages.
  - [ ] Strengthen `AuthGuard` and `AuthContext` to handle session expiration and token refresh failures cleanly.
  - [ ] Ensure accessible `role="alert"` announcements for auth validation and feedback.
- **Relevant Context**:
  - `e-book-store-fe/src/context/AuthContext.tsx`
  - `e-book-store-fe/src/components/AuthGuard.tsx`
  - `e-book-store-fe/src/pages/LoginPage.tsx`
  - `e-book-store-fe/src/pages/RegisterPage.tsx`
- **Status**: [ ] pending

---

### Sub-Task 5: Catalogue & Product Details Error Handling
- **Intent**: Deliver graceful degradation for catalogue browsing, filter fetching, book details, and related book carousels.
- **Expected Outcomes**:
  - Failed catalogue filters fallback gracefully without crashing the book grid.
  - Missing book IDs display a dedicated 404 Not Found view with a link back to catalogue.
  - Related book/recommendation fetch failures degrade silently without blocking the primary book detail view.
- **Todo List**:
  - [ ] Add error fallback states to `CataloguePage` for filter and book list query failures.
  - [ ] Update `BookDetailPage` to distinguish between missing books (404) and network query errors.
  - [ ] Wrap recommendation sections in non-blocking error fallbacks.
- **Relevant Context**:
  - `e-book-store-fe/src/pages/CataloguePage.tsx`
  - `e-book-store-fe/src/pages/BookDetailPage.tsx`
  - `e-book-store-fe/src/hooks/useCatalogueData.ts`
- **Status**: [ ] pending

---

### Sub-Task 6: Wishlist, Cart & Reviews Mutation Error Handling & Optimistic Rollbacks
- **Intent**: Ensure optimistic updates in wishlist, cart, and reviews reliably rollback on failure and provide clear, dismissible feedback to the user.
- **Expected Outcomes**:
  - Quantity updates, additions, and deletions revert UI state immediately when a backend request fails.
  - Dismissible alert banners or toasts notify the user of failed operations without disrupting page navigation.
  - Duplicate review submissions (PostgreSQL constraint 23505) display a clean warning without throwing unhandled exceptions.
- **Todo List**:
  - [ ] Verify and harden optimistic cache snapshots and rollback logic in `useCart` and `useWishlist`.
  - [ ] Add inline dismissible alerts for cart and wishlist mutation failures.
  - [ ] Handle review submission duplicate constraints and network failures in `BookDetailPage`.
- **Relevant Context**:
  - `e-book-store-fe/src/hooks/useCart.ts`
  - `e-book-store-fe/src/hooks/useWishlist.ts`
  - `e-book-store-fe/src/pages/CartPage.tsx`
  - `e-book-store-fe/src/pages/WishlistPage.tsx`
  - `e-book-store-fe/src/pages/BookDetailPage.tsx`
- **Status**: [ ] pending

---

### Sub-Task 7: Checkout, Payment & Order Lifecycle Error Handling
- **Intent**: Handle multi-step checkout validation, coupon expiration, RPC order creation failures, payment gateway errors, and order confirmation polling.
- **Expected Outcomes**:
  - Checkout validates address forms and cart items, presenting field-level errors and price discrepancy alerts.
  - Stale or expired coupons are rejected with recalculation feedback before order submission.
  - Payment failure screen displays clear reasons and allows retrying with a new method while preserving idempotency keys.
  - Order confirmation polling handles pending states, transient polling failures, and timeout gracefully.
- **Todo List**:
  - [ ] Add comprehensive checkout pre-flight validation (address, fresh cart stock/price verification, fresh coupon check).
  - [ ] Implement error handling for atomic `create_order_with_items` RPC failures.
  - [ ] Harden `PaymentPage` error states, idempotency key generation, and simulated outcome handling.
  - [ ] Refine `OrderConfirmationPage` polling, timeout, and cancellation states.
- **Relevant Context**:
  - `e-book-store-fe/src/pages/CheckoutPage.tsx`
  - `e-book-store-fe/src/pages/PaymentPage.tsx`
  - `e-book-store-fe/src/pages/OrderConfirmationPage.tsx`
  - `e-book-store-fe/src/repositories/supabase/SupabaseOrderRepository.ts`
- **Status**: [ ] pending

---

### Sub-Task 8: End-to-End Validation & Test Suite Verification
- **Intent**: Verify that all error handling flows, boundaries, retry policies, and test suites pass without regression.
- **Expected Outcomes**:
  - All unit and integration tests passing (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`).
  - Automated tests validating error boundaries, fallback UI states, and repository error mappings.
- **Todo List**:
  - [ ] Run full project test suite (`vitest run`).
  - [ ] Run TypeScript typecheck (`tsc --noEmit`).
  - [ ] Run ESLint verification (`eslint .`).
  - [ ] Verify production build completes successfully (`vite build`).
- **Relevant Context**:
  - `e-book-store-fe/package.json`
- **Status**: [ ] pending
