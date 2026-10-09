# Complete Testing Strategy & Quality Assurance Plan for Bibliophile

## Top-Level Overview

This document outlines the testing strategy for Bibliophile, covering Unit, Component, Integration, and End-to-End (E2E) testing layers. It evaluates current test coverage against requirements, establishes testing standards, identifies testing gaps, and prioritizes critical user journeys.

---

## 1. Test Architecture & Framework Alignment

- **Test Runner & Assertion Engine**: Vitest v4
- **DOM / Component Testing**: `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`
- **Mocking & Isolation**: Vitest `vi.fn()`, `vi.spyOn()`, in-memory mock repositories (`MockBookRepository`, `MockCartRepository`, `MockWishlistRepository`, `MockOrderRepository`, `MockAddressRepository`), and Mock Auth provider wrappers
- **E2E Tooling Candidate**: Playwright / Cypress (or simulated multi-step full-flow Vitest integration tests in jsdom)

---

## 2. Test Coverage Matrix by Layer

```mermaid
flowchart TD
    subgraph Testing_Pyramid [Bibliophile Testing Pyramid]
        E2E["E2E Tests (11 Critical User Journeys)"]
        INT["Integration Tests (Auth, Catalogue, Wishlist, Cart, Checkout, Orders)"]
        COMP["Component Tests (ProductCard, Cart, Checkout, Forms, Dialogs, Filters, Nav)"]
        UNIT["Unit Tests (Pricing, Discounts, Tax, Recommendations, Validation, Utilities)"]
    end

    UNIT --> COMP
    COMP --> INT
    INT --> E2E
```

### Layer 1: Unit Testing

Unit tests validate pure business logic, mathematical precision, domain algorithms, data normalization, and input validation without rendering UI or accessing live external services.

| Domain / Target | Test Scenarios & Cases | Current Status | Priority |
| :--- | :--- | :--- | :--- |
| **Price Calculations** (`pricing.ts`) | • Subtotal computation with single/multiple items<br>• Zero-quantity items<br>• Empty cart handling<br>• Price formatting (`formatPrice`, `formatPriceDecimal`) with INR currency symbols | Covered in `pricing.test.ts` (46 tests) | **P0 - Critical** |
| **Discounts & Coupons** (`pricing.ts`) | • Flat discount deductions (e.g. ₹50 off)<br>• Percentage discount deductions (e.g. 10% off)<br>• Discount exceeding subtotal (flooring at 0)<br>• Min order value thresholds<br>• Inactive / expired coupon rejection | Covered in `pricing.test.ts` | **P0 - Critical** |
| **Tax Computations** (`pricing.ts`) | • GST 12% calculation on discounted subtotal<br>• Rounding precision to 2 decimal places<br>• Zero-tax edge cases | Covered in `pricing.test.ts` | **P0 - Critical** |
| **Reward Points Discount** (`pricing.ts`) | • 100 points = ₹10 conversion rate<br>• Max 20% cap of post-coupon subtotal<br>• Partial points application<br>• Excess points clamping | Covered in `pricing.test.ts` | **P1 - High** |
| **Recommendation Engine** (`scoring.ts`, `CatalogueRecommendationService.ts`) | • Same author match weighting (40 pts)<br>• Category overlap scoring (30 pts)<br>• Bestseller / popular boost (20 pts)<br>• Rating weight (10 pts)<br>• Self-exclusion of active book<br>• Limit capping and deterministic ties | Covered in `recommendations.test.ts` (22 tests) | **P1 - High** |
| **Form Validation Helpers** | • Address validation: 6-digit PIN code, 10-digit phone number, mandatory street/city/state (`validateAddress.ts`)<br>• Payment validation: 16-digit card number, MM/YY expiry, 3-digit CVV, UPI VPA format (`validatePayment.ts`)<br>• Cart items validation: active book presence, positive quantity (`validateCartItems.ts`) | Covered across `checkout.test.ts`, `payment.test.ts` | **P0 - Critical** |
| **Utility Functions** | • Structured logger sanitization for passwords, CVV, cards, tokens (`logger.test.ts`)<br>• Safe redirect URL validator (`auth.test.tsx`)<br>• Error taxonomy classification & user sanitization (`errors.test.ts`)<br>• Network online/offline status hook (`useOnlineStatus.test.ts`) | Covered in `logger.test.ts`, `errors.test.ts`, `useOnlineStatus.test.ts` | **P1 - High** |

---

### Layer 2: Component Testing

Component tests verify isolated UI behavior, accessibility (`aria-*`, keyboard nav), form validation feedback, error banners, loading skeletons, and interactive state changes using React Testing Library.

| Component | Target Scenarios | Verification Points | Priority |
| :--- | :--- | :--- | :--- |
| **ProductCard** | • Vertical & Horizontal card variants<br>• Missing cover image placeholder<br>• Rating stars & review count badge<br>• Bestseller / New Launch badges<br>• Sale price vs original price strike-through | Render structure, responsive layout classes, fallback image handling | **P1 - High** |
| **Cart View Components** | • Quantity increment / decrement buttons<br>• Disable stepper while pending mutation<br>• Item remove button trigger<br>• Coupon input field + Apply button state<br>• Price breakdown summary lines<br>• Empty cart CTA button | Stepper triggers `onQtyChange`, coupon feedback renders `role="alert"`, empty state navigation | **P0 - Critical** |
| **Checkout Components** | • `AddressForm` field binding & inline error alerts<br>• `AddressPickerModal` saved addresses selection<br>• `RewardPointsToggle` dynamic slider/checkbox<br>• Sticky Order Summary sidebar | Accessible labels, keyboard focus trapping in modal, disabled submit during pre-flight | **P0 - Critical** |
| **Forms (Auth & Reviews)** | • `LoginForm` required inputs & error alerts<br>• `RegisterForm` password confirmation match check<br>• `ReviewsSection` star rating selector + review text area validation | Native validation prevention, aria-invalid flags, error message rendering | **P0 - Critical** |
| **Dialogs & Modals** | • `AddressPickerModal`<br>• Confirmation Dialogs<br>• `Modal` backdrop click & Escape key close | `role="dialog"`, `aria-modal="true"`, focus trap, clean unmount | **P1 - High** |
| **Catalogue Filters** | • `CatalogueFiltersBar` search input debouncing<br>• Language, format, price range selects<br>• Publisher dropdown filter<br>• `CategorySidebar` active selection highlight<br>• Reset filters button | Event emission with updated filter criteria, accessibility | **P1 - High** |
| **Navigation & Layout** | • `Navbar` active route indicator<br>• Cart badge counter reflects cart item count<br>• Auth state switch (Sign in link vs Account/Sign Out icon buttons)<br>• `RouteChangeAnnouncer` live region<br>• Skip-to-content link | Screen reader live announcements, link destinations, focus reset | **P1 - High** |

---

### Layer 3: Integration Testing

Integration tests verify data orchestration between React components, custom hooks, React Query cache, and Repositories (both in-memory mock and Supabase backends).

| Domain | Scope & Workflows Tested | Key Assertions & Side Effects | Priority |
| :--- | :--- | :--- | :--- |
| **Authentication Integration** | • Sign in with valid credentials updates `AuthContext`<br>• Invalid credentials display friendly error alert<br>• Sign out clears session & invalidates React Query cache<br>• `AuthGuard` redirects unauthenticated user preserving return URL | Context state transition, storage updates, redirect query params | **P0 - Critical** |
| **Catalogue Integration** | • Filter changes update query parameters and refetch book lists<br>• Category navigation triggers category-filtered query<br>• Search text queries matching books<br>• Empty search results trigger `<EmptyState />` | Query key generation, cache invalidation, presentation updates | **P1 - High** |
| **Wishlist Integration** | • Add to wishlist optimistically updates heart icon and cache<br>• Remove from wishlist removes item and reflects in list query<br>• Mutation failure triggers cache rollback and alert banner<br>• Move to Cart transfers item between repositories | Optimistic cache consistency, rollback on error, cross-repository data flow | **P1 - High** |
| **Cart Integration** | • Adding book increments quantity or adds new cart row<br>• Stepper updates quantity and recalculates totals live<br>• Clear cart empties cart store and cache<br>• Stale price / stock pre-flight check detects disparities | React Query `cartKeys` invalidation, subtotal recalculation | **P0 - Critical** |
| **Checkout & Order Integration** | • Address form submission saves/selects shipping address<br>• Coupon server revalidation before order creation<br>• Atomic order + order items creation via repository RPC<br>• Post-order cart cleanup trigger | Transactional integrity, pricing snapshot in `order_items`, cart cache clearance | **P0 - Critical** |
| **Order History & Detail** | • Orders list queries user's orders sorted by date desc<br>• Order detail queries order items, shipping snapshot, and payment status<br>• Unauthorized order access returns 404/Not Found state<br>• Order cancellation updates status to cancelled | RLS isolation, correct breakdown display | **P1 - High** |

---

### Layer 4: End-to-End (E2E) Critical User Journeys

The 11 prioritized end-to-end user workflows validate seamless traversal of the application from landing to repeat purchase.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest User
    actor User as Registered User
    participant App as Bibliophile Frontend
    participant Auth as Auth Service
    participant Repo as Data Repository / DB

    Note over Guest,App: Journey 1: Guest Browses Catalogue
    Guest->>App: Visits /catalogue & applies search/filters
    App-->>Guest: Displays filtered books

    Note over User,Auth: Journey 2 & 3: Register & Login
    User->>App: Registers with email & password
    App->>Auth: Creates user account
    User->>App: Signs in
    Auth-->>App: Establishes session token

    Note over User,Repo: Journey 4, 5 & 6: Product Details, Wishlist & Cart
    User->>App: Navigates to /books/:bookId
    App->>Repo: Fetches book details & reviews
    User->>App: Clicks "Add to Wishlist" (Journey 5)
    App->>Repo: Persists to wishlist
    User->>App: Clicks "Add to Cart" (Journey 6)
    App->>Repo: Persists item in cart

    Note over User,Repo: Journey 7, 8 & 9: Checkout, Payment & Order Creation
    User->>App: Proceeds to /checkout
    User->>App: Enters Shipping Address & Applies Coupon
    User->>App: Submits Order & redirects to /payment (Journey 7)
    User->>App: Chooses Card/UPI & clicks "Pay Now"
    App->>Repo: Validates payment with Idempotency Key (Journey 8)
    Repo-->>App: Confirms order & creates order record (Journey 9)
    App-->>User: Displays Order Confirmation (/order-confirmation/:orderId)

    Note over User,Repo: Journey 10 & 11: Order History & Buy Again
    User->>App: Navigates to /orders (Journey 10)
    App-->>User: Lists previous orders
    User->>App: Selects previous order and clicks "Buy Again" / re-add (Journey 11)
    App->>Repo: Adds items to cart for repeat purchase
```

#### Detailed E2E Journey Specifications:

1. **Journey 1: Guest Browses Catalogue**
   - **Preconditions**: Unauthenticated guest user on `/` or `/catalogue`.
   - **Steps**: Navigate to catalogue → filter by category "Technology" → search "React" → sort by "Price: Low to High".
   - **Expected Outcome**: Books list updates dynamically, filter tags match selection, URL query params sync correctly.
2. **Journey 2: User Registers**
   - **Preconditions**: Guest user on `/register`.
   - **Steps**: Enter display name, valid email, password, confirm password → Submit.
   - **Expected Outcome**: Account created; either navigates to `/` (auto-confirmed) or displays "Check your email" confirmation screen.
3. **Journey 3: User Logs In**
   - **Preconditions**: Unauthenticated registered user on `/login?next=/cart`.
   - **Steps**: Enter credentials → Submit.
   - **Expected Outcome**: User authenticated, redirected to `/cart` with active session and updated navbar profile icon.
4. **Journey 4: User Views Product Details**
   - **Preconditions**: Any user on `/books/:bookId`.
   - **Steps**: Load page → verify title, author, price, description, reviews list, and related reads panel.
   - **Expected Outcome**: Complete metadata rendered; rating summary reflects review score average.
5. **Journey 5: User Adds Product to Wishlist**
   - **Preconditions**: Authenticated user on product page.
   - **Steps**: Click "Add to Wishlist" heart icon → navigate to `/wishlist`.
   - **Expected Outcome**: Wishlist count increments; saved book appears with correct details and "Move to Cart" button.
6. **Journey 6: User Adds Product to Cart**
   - **Preconditions**: Authenticated user.
   - **Steps**: Click "Add to Cart" on book detail page or catalogue card → navigate to `/cart`.
   - **Expected Outcome**: Cart icon badge updates; cart item list contains book with quantity 1 and correct price breakdown.
7. **Journey 7: User Checks Out**
   - **Preconditions**: User has ≥ 1 item in cart.
   - **Steps**: Navigate to `/cart` → click "Proceed to Checkout" → fill shipping address form or pick saved address → apply valid coupon code → toggle reward points redemption → click "Place Order / Pay Now".
   - **Expected Outcome**: Pre-flight validation passes, atomic order is drafted, user is redirected to `/payment` with `orderId`.
8. **Journey 8: Payment Processing & Idempotency**
   - **Preconditions**: Order in pending status on `/payment`.
   - **Steps**: Select Payment Method (Credit Card / UPI / Wallet) → fill payment details → click "Pay Now" → simulator processes payment.
   - **Expected Outcome**: Payment record created with unique idempotency key; order status advances to `confirmed`.
9. **Journey 9: Order Confirmation & Cart Clearance**
   - **Preconditions**: Payment succeeded.
   - **Steps**: User redirected to `/order-confirmation/:orderId`.
   - **Expected Outcome**: Confirmation view shows confetti / success card, order ID, delivery estimate, and order items. Cart is verified empty (`cart_items` cleared).
10. **Journey 10: User Views Order History**
    - **Preconditions**: Authenticated user with past orders.
    - **Steps**: Navigate to `/orders` → click on specific order to view `/orders/:orderId`.
    - **Expected Outcome**: Lists all past orders with status badges (`confirmed`, `shipped`, `delivered`), totals, and date stamps.
11. **Journey 11: User Buys Again (Repeat Purchase)**
    - **Preconditions**: Authenticated user on `/orders` or past order detail.
    - **Steps**: Click "Buy Again" or "Reorder" for an item in previous order history.
    - **Expected Outcome**: Item added to cart, user redirected to `/cart` ready for immediate checkout.

---

## 3. Prioritized Implementation Roadmap

- **Phase 1 (Critical Path - P0)**: Complete Unit & Integration coverage for Pricing, Cart mutations, Address validation, and Order creation RPC.
- **Phase 2 (User Experience - P1)**: Component tests for Forms, Filter Bar, Modals, Product Cards, and Navigation Live Regions.
- **Phase 3 (End-to-End - P0/P1)**: Automated E2E test runner covering Journeys 1 through 11.
- **Phase 4 (Regression & CI/CD - P2)**: Coverage reporting thresholds, accessibility audits (`axe-core`), and CI pipeline integration.
