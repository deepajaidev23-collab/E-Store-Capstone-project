# Accessibility Remediation Plan (WCAG 2.2 AA)

## Overview

This plan documents every accessibility deficiency found across the Bibliophile frontend. Findings are grounded in a full source-code audit of all pages, layouts, UI components, and feature components. Issues are grouped into **five priority tiers** (P1–P5) and ordered for implementation — fixing foundational components first produces the widest cascading improvements.

---

## Color & Contrast context

The application is dark-themed. Key token values:

| Token | Value | Background |
|---|---|---|
| `--color-text-primary` | `#f9fafb` | on `#1a1a2e` — passes AA |
| `--color-text-muted` | `#9ca3af` | on `#1a1a2e` — **≈3.3:1 — fails AA for normal text** |
| `--color-text-link` | `#60a5fa` | on `#1a1a2e` — ≈5.1:1 — passes AA |
| `--color-primary` | `#2563eb` | on `#f9fafb` — **≈3.4:1 — fails AA for normal text** |
| `--color-success` | `#22c55e` | on `#1a1a2e` — **≈4.3:1 — borderline** |
| `--color-warning` | `#f59e0b` | on `#1a1a2e` — **≈3.8:1 — fails AA for normal text** |
| `--color-error` | `#ef4444` | on `#1a1a2e` — **≈3.9:1 — fails AA for normal text** |
| `--color-tag` | `#60a5fa` | on `#16213e` (surface) — ≈4.9:1 — passes |

---

## Priority 1 — Critical: Blocks Task Completion

These deficiencies prevent specific user journeys from being completed by keyboard or screen-reader users.

---

### P1-A — Modal has no focus trap, no initial focus, and no focus restoration

**WCAG:** 2.1.2 (Focus Trap), 2.4.3 (Focus Order), 2.4.11 (Focus Appearance)
**Affects:** AddressPickerModal (Checkout), any future Modal usage, DesignSystem demo modal
**File:** [`src/components/ui/Modal.tsx`](e-book-store-fe/src/components/ui/Modal.tsx:25)

**What is wrong:**
- `dialogRef` is created but never used (line 26)
- The `useEffect` (line 29) only listens for Escape — Tab can leave the dialog entirely
- Focus is not moved into the dialog when it opens
- Focus is not returned to the opener when it closes
- The panel `<div>` has no `tabIndex` so it cannot receive programmatic focus

**What it must be:**
1. Save the `document.activeElement` before opening
2. Move focus to the first focusable element inside the panel (or `dialogRef.current`) on open
3. Intercept Tab/Shift+Tab to cycle within focusable panel elements only
4. On close, restore focus to the saved opener element

**Todo list:**
- Add a `savedFocusRef = useRef<Element | null>(null)` to capture the opener
- Inside `useEffect`, set `savedFocusRef.current = document.activeElement`; then call `dialogRef.current?.focus()`
- Add a `focusTrap` handler that queries all focusable children of `dialogRef`, intercepts Tab/Shift+Tab, and wraps around
- On close (in `onClose` calls and the Escape handler), call `(savedFocusRef.current as HTMLElement)?.focus()`
- Add `tabIndex={-1}` to the panel `<div>` so it can receive programmatic focus

---

### P1-B — Nested `<main>` landmarks on CataloguePage and BookDetailPage

**WCAG:** 1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value)
**Affects:** All screen-reader users — every page load
**Files:**
- [`src/pages/CataloguePage.tsx:103`](e-book-store-fe/src/pages/CataloguePage.tsx:103) — `<main aria-label="Book listings">`
- [`src/pages/BookDetailPage.tsx:147`](e-book-store-fe/src/pages/BookDetailPage.tsx:147) — `<main className="flex-1 min-w-0 ...">` inside the layout `<main>`

**What is wrong:**
`RootLayout` renders a `<main>` (line 89). Both pages render another `<main>` inside it. The HTML spec allows only one `<main>` per document; multiple `<main>` landmarks confuse screen-reader navigation.

**Todo list:**
- In `CataloguePage.tsx`: replace `<main className="flex-1 min-w-0 ...">` with `<section aria-label="Book listings">` (and its closing tag)
- In `BookDetailPage.tsx`: replace `<main className="flex-1 min-w-0 ...">` with `<article>` (represents a book, semantically correct)

---

### P1-C — Address picker `<div role="button">` is missing Space key handler and contains a nested interactive button

**WCAG:** 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value)
**Affects:** Checkout flow — keyboard users cannot change shipping address
**File:** [`src/pages/CheckoutPage.tsx:408`](e-book-store-fe/src/pages/CheckoutPage.tsx:408)

**What is wrong:**
- `<div role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && ...}>` handles Enter but not Space (ARIA pattern requires both)
- Inside this `div[role=button]` is a `<Button>` — nested interactive controls produce two focusable items that do the same thing, and the outer div is a fake button wrapping a real button

**Todo list:**
- Remove the `div[role=button]` wrapper entirely
- Keep only the `<Button variant="ghost" size="sm">Change</Button>` as the single interactive element
- Display the address text as non-interactive prose above or beside the button

---

### P1-D — Payment method selector has no group role or selected-state announcement

**WCAG:** 4.1.2 (Name, Role, Value), 1.3.1 (Info and Relationships)
**Affects:** Payment page — screen readers do not know which method is selected
**File:** [`src/pages/PaymentPage.tsx:285`](e-book-store-fe/src/pages/PaymentPage.tsx:285)

**What is wrong:**
The method tabs are `<button>` elements whose selection state is conveyed only by colour and border. There is no `aria-pressed`, `aria-selected`, or `role="tablist"` pattern. A screen-reader user hears only the button label and cannot determine which tab is active.

**Todo list:**
- Add `role="tablist"` to the method list container
- Add `role="tab"` to each method button
- Add `aria-selected={m === selectedMethod}` to each tab
- Add `tabIndex={m === selectedMethod ? 0 : -1}` (roving tabindex pattern)
- Add ArrowLeft/ArrowRight keyboard navigation within the tablist
- Add `role="tabpanel"` with `aria-labelledby` to the fields container

---

## Priority 2 — Major: Significantly Degrades Usability

These issues do not fully block flows but create significant friction or incorrect information for assistive-technology users.

---

### P2-A — No skip-to-main-content link

**WCAG:** 2.4.1 (Bypass Blocks)
**Affects:** All keyboard and screen-reader users on every page
**File:** [`src/layouts/RootLayout.tsx`](e-book-store-fe/src/layouts/RootLayout.tsx:85)

**What is wrong:**
There is no mechanism to skip the navigation bar. Every keyboard user must Tab through all nav items on every page load.

**Todo list:**
- Add `id="main-content"` to the `<main>` element in `RootLayout.tsx` (line 89)
- Insert a visually-hidden skip link as the first child of `<body>` (or the first element of `RootLayout`) that becomes visible on focus:
  ```html
  <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] ...">
    Skip to main content
  </a>
  ```

---

### P2-B — `FormField` does not link error messages to inputs via `aria-describedby`

**WCAG:** 3.3.1 (Error Identification), 4.1.2 (Name, Role, Value)
**Affects:** All forms — Login, Register, Checkout address, AddressForm, CardFields, UpiFields
**File:** [`src/components/ui/Form.tsx`](e-book-store-fe/src/components/ui/Form.tsx:15)

**What is wrong:**
`FormField` renders an error as `<p role="alert">` but the input has no `aria-describedby` pointing to it. Screen readers announce the field name but not the error unless the user re-focuses the input.

**Todo list:**
- Generate a stable error ID per field: `const errorId = htmlFor ? \`${htmlFor}-error\` : undefined`
- Pass `id={errorId}` to `<FormError>`
- Pass `aria-describedby={error && errorId ? errorId : undefined}` and `aria-invalid={!!error}` to the child via `React.Children.map` (or via context / a render-prop if children can be non-inputs)
- The simplest approach: use `React.cloneElement` on the first child to inject both attributes when `error` is set

---

### P2-C — No per-route page titles

**WCAG:** 2.4.2 (Page Titled)
**Affects:** All routes — browser tab, history, screen-reader page announce
**Files:** [`index.html:7`](e-book-store-fe/index.html:7), [`src/router.tsx`](e-book-store-fe/src/router.tsx)

**What is wrong:**
Every page shows `e-book-store-fe` as the tab/window title.

**Todo list:**
- Create a `usePageTitle(title: string)` hook that calls `document.title = \`${title} — Bibliophile\`` inside a `useEffect`
- Call it at the top of each page component:
  - `HomePage`: "Bibliophile — Discover Your Next Read"
  - `CataloguePage`: "Catalogue — Bibliophile" (or "Self-help — Bibliophile" when category active)
  - `BookDetailPage`: `${book.title} — Bibliophile`
  - `CartPage`: "Shopping Cart — Bibliophile"
  - `CheckoutPage`: "Checkout — Bibliophile"
  - `PaymentPage`: "Payment — Bibliophile"
  - `OrderConfirmationPage`: "Order Confirmed — Bibliophile"
  - `OrdersPage`: "My Orders — Bibliophile"
  - `OrderDetailPage`: "Order #… — Bibliophile"
  - `LoginPage`: "Sign In — Bibliophile"
  - `RegisterPage`: "Create Account — Bibliophile"
  - `ProfilePage`: "My Profile — Bibliophile"
  - `NotFoundPage`: "Page Not Found — Bibliophile"
- Update `index.html` title to `Bibliophile` as the default

---

### P2-D — Active navigation links missing `aria-current="page"`

**WCAG:** 4.1.2 (Name, Role, Value)
**Affects:** All pages — screen-reader users cannot identify the current location
**Files:**
- [`src/components/ui/Navigation.tsx:65`](e-book-store-fe/src/components/ui/Navigation.tsx:65) — navbar links
- [`src/components/catalogue/CategorySidebar.tsx:21`](e-book-store-fe/src/components/catalogue/CategorySidebar.tsx:21) — category buttons use `aria-current="true"` (wrong value)

**Todo list:**
- In `Navigation.tsx`, add `aria-current={active ? 'page' : undefined}` to each nav `<Link>` (line 65)
- In `CategorySidebar.tsx`, change `aria-current={active ? 'true' : undefined}` to `aria-current={active ? 'page' : undefined}` (line 21)

---

### P2-E — Dynamic catalogue results not announced to screen readers

**WCAG:** 4.1.3 (Status Messages)
**Affects:** Catalogue search, filter changes, category switches
**File:** [`src/pages/CataloguePage.tsx`](e-book-store-fe/src/pages/CataloguePage.tsx)

**What is wrong:**
When filters are applied or cleared the results panel updates silently. Screen-reader users have no announcement that 12 books were found or that loading has completed.

**Todo list:**
- Add a visually-hidden `<div role="status" aria-live="polite" aria-atomic="true">` in the CataloguePage
- Update its text content when `booksLoading` transitions to false: `"${booksResult.total} books found"` or `"No books match your filters."`
- Add `aria-busy={booksLoading}` to the book listings container

---

### P2-F — Button spinner replaces accessible name with no replacement

**WCAG:** 4.1.2 (Name, Role, Value), 4.1.3 (Status Messages)
**Affects:** Every `<Button loading={true}>` usage across the app (submit, add to cart, apply coupon, place order, etc.)
**File:** [`src/components/ui/Button.tsx:64`](e-book-store-fe/src/components/ui/Button.tsx:64)

**What is wrong:**
```tsx
{loading ? <Spinner /> : icon && <span>…</span>}
{children && <span>{children}</span>}
```
When `loading` is true, the spinner (which is `aria-hidden`) replaces the icon, but `children` still renders. However, the button also adds `disabled`, which stops screen readers from reading it in some modes. There is no `aria-busy` to announce the in-progress state.

**Todo list:**
- Add `aria-busy={loading}` to the `<button>` element
- The `children` text is already preserved in the span; confirm visually with a test
- If `children` is removed during loading in any callsite, add `aria-label` fallback

---

### P2-G — Cart changes not announced

**WCAG:** 4.1.3 (Status Messages)
**Affects:** Cart page and product card "Add to Cart"
**File:** [`src/pages/CartPage.tsx`](e-book-store-fe/src/pages/CartPage.tsx)

**What is wrong:**
Adding an item, changing quantity, removing an item, and applying a coupon all update the page silently. The cart total changes with no announcement.

**Todo list:**
- Add a `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">` near the cart summary
- Update its text content on each cart mutation: e.g. "Quantity updated", "Item removed", "Coupon applied — ₹50 discount"
- The cart total should be re-read when it changes

---

### P2-H — Coupon inputs lack `aria-describedby` and `aria-invalid`

**WCAG:** 3.3.1, 3.3.3, 4.1.2
**Affects:** Checkout page coupon field, Cart page coupon field
**Files:**
- [`src/pages/CheckoutPage.tsx:466`](e-book-store-fe/src/pages/CheckoutPage.tsx:466)
- [`src/pages/CartPage.tsx:282`](e-book-store-fe/src/pages/CartPage.tsx:282)

**What is wrong:**
Coupon errors are rendered as plain text. The coupon `<input>` has no `aria-describedby` linking to the error, and no `aria-invalid="true"` when an error is present.

**Todo list:**
- Give each coupon error element a stable `id` (e.g. `coupon-error`)
- Add `aria-describedby="coupon-error"` and `aria-invalid={!!couponError}` to the coupon `<input>`
- Wrap the error text in `role="alert"` or an `aria-live="assertive"` region so it is announced immediately

---

## Priority 3 — Moderate: Noticeably Reduces Accessibility

These issues are WCAG AA violations that affect real users but do not block complete flows.

---

### P3-A — `--color-text-muted` fails AA contrast for body text

**WCAG:** 1.4.3 (Contrast Minimum)
**Affects:** Every `muted` text instance — descriptions, hints, dates, author names, placeholder text

**What is wrong:**
`#9ca3af` on `#1a1a2e` = approximately 3.3:1 contrast ratio. WCAG AA requires 4.5:1 for normal text under 18pt/14pt bold.

**Todo list:**
- Increase `--color-text-muted` from `#9ca3af` to at least `#b0b7c3` (≈4.6:1 on `#1a1a2e`) or `#c0c7d3` to provide comfortable margin
- Verify against all background tokens it appears on (`--color-bg-base`, `--color-bg-surface`, `--color-bg-elevated`, `--color-bg-overlay`)
- Update the token in `index.css`

---

### P3-B — `--color-warning` used for star ratings fails AA contrast for normal text

**WCAG:** 1.4.3 (Contrast Minimum)
**Affects:** Star rating components, warning alert text, CharCounter at ≥80% capacity

**What is wrong:**
`#f59e0b` on `#1a1a2e` = approximately 3.8:1. Fails for normal text. Passes for large text (3:1) and non-text elements (3:1) such as icon fills.

**Todo list:**
- For star icon fills: `#f59e0b` is acceptable as a non-text indicator (3:1 ≥ required)
- For warning-status text: increase `--color-warning` to `#fbbf24` (≈4.7:1) or use `--color-text-primary` for the warning message text and reserve the colour for the icon only
- For `CharCounter` warning state text: apply the same fix

---

### P3-C — `--color-error` fails AA contrast for normal text on dark backgrounds

**WCAG:** 1.4.3 (Contrast Minimum)
**Affects:** `FormError` text, inline validation messages

**What is wrong:**
`#ef4444` on `#1a1a2e` = approximately 3.9:1. Fails AA for normal text (requires 4.5:1).

**Todo list:**
- Increase `--color-error` to `#f87171` (≈4.6:1 on `#1a1a2e`) or use a lighter shade like `#fca5a5`
- Verify on all background tokens
- Confirm error icon SVG stroke still visible at the new value

---

### P3-D — Star rating picker touch targets below minimum size

**WCAG:** 2.5.8 (Target Size, Minimum — 2.2 AA)
**Affects:** ReviewsSection — submitting and editing reviews
**File:** [`src/components/book-detail/ReviewsSection.tsx:83`](e-book-store-fe/src/components/book-detail/ReviewsSection.tsx:83)

**What is wrong:**
Star buttons contain 20×20px SVGs with no explicit padding. The rendered click target is likely ≤24×24px CSS pixels.

**Todo list:**
- Add `className="p-1.5"` to each star `<button>` (produces ~23px button with 20px icon; add `p-2` for a 24px+ target meeting the 2.5.8 minimum)
- Alternatively use `min-w-[44px] min-h-[44px]` to meet the enhanced 2.5.5 guideline (44×44px)

---

### P3-E — `IconButton size="sm"` produces sub-24px touch target

**WCAG:** 2.5.8 (Target Size, Minimum)
**Affects:** Quantity controls on cart, small action buttons throughout
**File:** [`src/components/ui/Button.tsx:102`](e-book-store-fe/src/components/ui/Button.tsx:102)

**What is wrong:**
`size="sm"` maps to `p-1` (4px padding each side) which around an 18px icon produces a ~26px target — marginally passes 24px but has no spacing buffer. More concerning, it may be used around smaller icons.

**Todo list:**
- Change `sm: 'p-1'` to `sm: 'p-1.5'` (6px each side → ~30px with 18px icon)
- Add `min-w-[24px] min-h-[24px]` to the base `IconButton` class to enforce the absolute minimum

---

### P3-F — `SearchInput` has no accessible name

**WCAG:** 4.1.2 (Name, Role, Value), 3.3.2 (Labels or Instructions)
**Affects:** Catalogue filter bar search
**File:** [`src/components/ui/Input.tsx:110`](e-book-store-fe/src/components/ui/Input.tsx:110)

**What is wrong:**
`SearchInput` renders a bare `<input>` with no `<label>`, no `aria-label`, and no `aria-labelledby`. The magnifier icon is `aria-hidden`. Consumers must supply an accessible name.

**Todo list:**
- Add an `aria-label` prop (optional, defaults to `"Search"`) to `SearchInput`
- Apply it to the `<input>`: `aria-label={ariaLabel ?? 'Search'}`
- In `CatalogueFiltersBar`, pass `aria-label="Search books by title or author"` when rendering `<SearchInput>`

---

### P3-G — `CharCounter` is not announced to screen readers

**WCAG:** 4.1.3 (Status Messages)
**Affects:** Review form body text
**File:** [`src/components/ui/Form.tsx:63`](e-book-store-fe/src/components/ui/Form.tsx:63)

**What is wrong:**
The character counter (`{current}/{max}`) updates visually but is never announced. A blind user typing a long review gets no feedback about nearing the limit.

**Todo list:**
- Add `aria-live="polite"` and `aria-atomic="true"` to the `<span>` in `CharCounter`
- Optionally, use a `role="status"` wrapper that only speaks at threshold intervals (e.g. at 80%, 90%, 100%) to avoid over-announcement — implement via a `useEffect` with a separate sr-only div

---

### P3-H — `RewardPointsToggle` button state not announced

**WCAG:** 4.1.2 (Name, Role, Value)
**Affects:** Checkout page reward points
**File:** [`src/components/checkout/RewardPointsToggle.tsx:53`](e-book-store-fe/src/components/checkout/RewardPointsToggle.tsx:53)

**What is wrong:**
The button label changes between "Apply" and "Remove" to communicate state, but `aria-pressed` is absent. The button's meaning depends solely on changing label text, which can be misread when focus context is lost.

**Todo list:**
- Add `aria-pressed={isApplied}` to the `<Button>` element
- Optionally add an explicit `aria-label` that includes the amount: `aria-label={isApplied ? \`Remove ${appliedPoints} reward points\` : \`Apply ${availablePoints} reward points\`}`

---

### P3-I — Route navigation does not reset focus

**WCAG:** 2.4.3 (Focus Order)
**Affects:** All client-side route transitions — screen-reader and keyboard users
**File:** [`src/router.tsx`](e-book-store-fe/src/router.tsx)

**What is wrong:**
React Router v7 does not automatically move focus on navigation. After clicking a link, focus may stay on the previous page's link or an off-screen element, meaning the next page's content is never announced.

**Todo list:**
- Create a `RouteChangeAnnouncer` component that lives in `RootLayout` and watches `useLocation()`
- On each location change: move focus to an `h1` element (if present) or the `<main>` element via `document.getElementById('main-content')?.focus()`
- Alternatively, use a sr-only `aria-live="assertive"` region that announces the new page title on route change

---

### P3-J — `AuthLayout` lacks a `<main>` landmark

**WCAG:** 1.3.1 (Info and Relationships)
**Affects:** Login and Register pages
**File:** [`src/layouts/AuthLayout.tsx`](e-book-store-fe/src/layouts/AuthLayout.tsx)

**What is wrong:**
The auth layout renders content in a `<div>` with no `<main>` landmark. Screen-reader users navigating by landmarks (F6/F8 in NVDA, or Landmark shortcut in VoiceOver) cannot jump directly to the form.

**Todo list:**
- Wrap the `<Outlet />` content in `<main id="main-content">` in `AuthLayout.tsx`

---

### P3-K — Card fields use `autoComplete="off"` instead of correct CC tokens

**WCAG:** 1.3.5 (Identify Input Purpose)
**Affects:** Payment page — users with disabilities relying on autofill/password managers
**File:** [`src/components/payment/CardFields.tsx:60,78,94,108`](e-book-store-fe/src/components/payment/CardFields.tsx:60)

**What is wrong:**
All four payment card fields use `autoComplete="off"`, preventing browser autofill, password manager fill, and accessibility tool assistance.

**Todo list:**
- Card number: `autoComplete="cc-number"`
- Name on card: `autoComplete="cc-name"`
- CVV: `autoComplete="cc-csc"`
- Expiry: `autoComplete="cc-exp"`

---

### P3-L — Address form fields missing `autocomplete` tokens

**WCAG:** 1.3.5 (Identify Input Purpose)
**Affects:** Checkout and Address forms
**File:** [`src/components/checkout/AddressForm.tsx`](e-book-store-fe/src/components/checkout/AddressForm.tsx)

**What is wrong:**
Key address fields have no `autocomplete` attribute.

**Todo list:**
- Email field: `autoComplete="email"`
- Phone field: `autoComplete="tel"`
- PIN/postal field: `autoComplete="postal-code"`
- First name: `autoComplete="given-name"`
- Last name: `autoComplete="family-name"`
- Address line: `autoComplete="street-address"`
- City: `autoComplete="address-level2"`
- State: `autoComplete="address-level1"`

---

## Priority 4 — Minor: Degrades Experience but Workable

---

### P4-A — `RootLayout` cart link contains nested interactive `IconButton`

**WCAG:** 4.1.2 (Name, Role, Value)
**Affects:** Keyboard and AT users in the navbar
**File:** [`src/layouts/RootLayout.tsx:29`](e-book-store-fe/src/layouts/RootLayout.tsx:29)

**What is wrong:**
```tsx
<Link to="/cart" aria-label="Shopping cart...">
  <IconButton label="Cart" ...>
```
A focusable `<button>` inside a focusable `<a>` is invalid HTML and creates two tab stops for the same action.

**Todo list:**
- Remove `<IconButton>` from inside the cart `<Link>`
- Style the `<Link>` directly with the icon SVG as its child, keeping the existing `aria-label` on the `<Link>`

---

### P4-B — Loading skeleton containers not marked `aria-busy`

**WCAG:** 4.1.3 (Status Messages)
**Affects:** RelatedReadsPanel, catalogue sections, anywhere `ProductCardSkeleton` appears
**Files:** [`src/components/book-detail/RelatedReadsPanel.tsx:37`](e-book-store-fe/src/components/book-detail/RelatedReadsPanel.tsx:37), [`src/components/catalogue/BookSection.tsx:55`](e-book-store-fe/src/components/catalogue/BookSection.tsx:55)

**What is wrong:**
When `loading={true}`, skeletons render without `aria-busy`. Screen readers present placeholder content as if it were real.

**Todo list:**
- In `RelatedReadsPanel`, add `aria-busy={loading}` and `aria-label="Loading recommendations"` to the outer `<aside>` when `loading` is true
- In `BookSection`, add `aria-busy={loading}` to the section `<div>` when `loading` is true

---

### P4-C — `CoverGallery` uses `aria-label` on a generic `<div>` with no role

**WCAG:** 1.3.1
**Affects:** Book detail page cover area
**File:** [`src/components/book-detail/CoverGallery.tsx:15`](e-book-store-fe/src/components/book-detail/CoverGallery.tsx:15)

**What is wrong:**
`<div aria-label="Book cover images">` — `aria-label` on a non-landmark `<div>` is ignored by most ATs.

**Todo list:**
- Change to `<figure aria-label="Book cover images">` or `<section aria-label="Book cover images">` (figure is most semantically appropriate for image content)

---

### P4-D — `WalletFields` payment summary uses `<div>` instead of `<dl>` for label/value pairs

**WCAG:** 1.3.1
**Affects:** Wallet payment method
**File:** [`src/components/payment/WalletFields.tsx:18`](e-book-store-fe/src/components/payment/WalletFields.tsx:18)

**What is wrong:**
Balance, deduction, and remaining values are plain `<div>/<Text>` elements. There is no semantic relationship between the labels and values.

**Todo list:**
- Wrap the balance summary in `<dl>` with `<dt>` for the label and `<dd>` for the value

---

### P4-E — `CatalogueFiltersBar` uses `role="search"` on a `<div>` instead of a `<form>`

**WCAG:** 1.3.1
**Affects:** Catalogue search
**File:** [`src/components/catalogue/CatalogueFiltersBar.tsx:42`](e-book-store-fe/src/components/catalogue/CatalogueFiltersBar.tsx:42)

**What is wrong:**
`<div role="search">` is valid, but a `<form role="search">` is more semantically correct (enables implicit Enter key submission and form landmark navigation).

**Todo list:**
- Change the `<div role="search">` to a `<form role="search" onSubmit={(e) => e.preventDefault()}>` with appropriate `action="#"` if needed to prevent navigation

---

### P4-F — `UpiFields` uses `autoComplete="off"` without justification

**WCAG:** 1.3.5
**Affects:** UPI payment method
**File:** [`src/components/payment/UpiFields.tsx:24`](e-book-store-fe/src/components/payment/UpiFields.tsx:24)

**Todo list:**
- UPI IDs are user-specific identifiers; remove `autoComplete="off"` and use `autoComplete="on"` or remove the attribute to let the browser decide

---

## Priority 5 — Polish: Best Practice Improvements

---

### P5-A — `Modal` always uses `id="modal-title"` — not unique if multiple modals mount simultaneously

**WCAG:** 4.1.2
**File:** [`src/components/ui/Modal.tsx:74`](e-book-store-fe/src/components/ui/Modal.tsx:74)

**Todo list:**
- Generate a unique ID per modal instance using `useId()` (React 18): `const titleId = useId()` — apply to `id={titleId}` and `aria-labelledby={titleId}`

---

### P5-B — `Button` loading spinner is `aria-hidden` but could announce loading state through the button itself

**WCAG:** 4.1.3
**File:** [`src/components/ui/Button.tsx:87`](e-book-store-fe/src/components/ui/Button.tsx:87)

The spinner is correctly hidden, but P2-F already covers adding `aria-busy` — this is a reminder that the spinner having `aria-hidden="true"` is the right pattern and should be retained.

---

### P5-C — Checkbox in `Input.tsx` renders a wrapping `<label>` that is not connected when `id` is absent

**WCAG:** 1.3.1, 4.1.2
**File:** [`src/components/ui/Input.tsx:84`](e-book-store-fe/src/components/ui/Input.tsx:84)

**What is wrong:**
`Checkbox` uses `htmlFor={id}` on the outer label — if no `id` is passed the label is unconnected. The wrapping label still provides implicit association in most cases, but explicit `id`/`for` is more robust.

**Todo list:**
- Make `id` required (or generate a fallback with `useId()`) to ensure explicit label/input association always works

---

### P5-D — AuthLayout missing skip link

**WCAG:** 2.4.1
**File:** [`src/layouts/AuthLayout.tsx`](e-book-store-fe/src/layouts/AuthLayout.tsx)

Even in the simplified auth layout (no nav bar), a skip link future-proofs the layout if a header is ever added.

**Todo list:**
- Once `<main id="main-content">` is added (P3-J), add the same skip link pattern from P2-A

---

## Issue Summary Table

| ID | File | WCAG | Severity |
|---|---|---|---|
| P1-A | `components/ui/Modal.tsx` | 2.1.2, 2.4.3 | Critical |
| P1-B | `pages/CataloguePage.tsx`, `pages/BookDetailPage.tsx` | 1.3.1 | Critical |
| P1-C | `pages/CheckoutPage.tsx:408` | 2.1.1, 4.1.2 | Critical |
| P1-D | `pages/PaymentPage.tsx:285` | 4.1.2, 1.3.1 | Critical |
| P2-A | `layouts/RootLayout.tsx` | 2.4.1 | Major |
| P2-B | `components/ui/Form.tsx` | 3.3.1, 4.1.2 | Major |
| P2-C | `index.html`, `router.tsx` | 2.4.2 | Major |
| P2-D | `components/ui/Navigation.tsx`, `CategorySidebar.tsx` | 4.1.2 | Major |
| P2-E | `pages/CataloguePage.tsx` | 4.1.3 | Major |
| P2-F | `components/ui/Button.tsx` | 4.1.2, 4.1.3 | Major |
| P2-G | `pages/CartPage.tsx` | 4.1.3 | Major |
| P2-H | `pages/CheckoutPage.tsx`, `pages/CartPage.tsx` | 3.3.1, 4.1.2 | Major |
| P3-A | `src/index.css` | 1.4.3 | Moderate |
| P3-B | `src/index.css` | 1.4.3 | Moderate |
| P3-C | `src/index.css` | 1.4.3 | Moderate |
| P3-D | `components/book-detail/ReviewsSection.tsx` | 2.5.8 | Moderate |
| P3-E | `components/ui/Button.tsx` | 2.5.8 | Moderate |
| P3-F | `components/ui/Input.tsx` | 4.1.2, 3.3.2 | Moderate |
| P3-G | `components/ui/Form.tsx` | 4.1.3 | Moderate |
| P3-H | `components/checkout/RewardPointsToggle.tsx` | 4.1.2 | Moderate |
| P3-I | `src/router.tsx` | 2.4.3 | Moderate |
| P3-J | `layouts/AuthLayout.tsx` | 1.3.1 | Moderate |
| P3-K | `components/payment/CardFields.tsx` | 1.3.5 | Moderate |
| P3-L | `components/checkout/AddressForm.tsx` | 1.3.5 | Moderate |
| P4-A | `layouts/RootLayout.tsx` | 4.1.2 | Minor |
| P4-B | `RelatedReadsPanel.tsx`, `BookSection.tsx` | 4.1.3 | Minor |
| P4-C | `components/book-detail/CoverGallery.tsx` | 1.3.1 | Minor |
| P4-D | `components/payment/WalletFields.tsx` | 1.3.1 | Minor |
| P4-E | `components/catalogue/CatalogueFiltersBar.tsx` | 1.3.1 | Minor |
| P4-F | `components/payment/UpiFields.tsx` | 1.3.5 | Minor |
| P5-A | `components/ui/Modal.tsx` | 4.1.2 | Polish |
| P5-B | `components/ui/Button.tsx` | 4.1.3 | Polish |
| P5-C | `components/ui/Input.tsx` | 1.3.1 | Polish |
| P5-D | `layouts/AuthLayout.tsx` | 2.4.1 | Polish |

---

## Recommended Implementation Order

The most impactful fixes cascade through many components:

1. **P2-B first** — fixing `FormField` aria-describedby fixes all form error linking across login, register, checkout, payment in one change
2. **P1-A** — fixing `Modal` unblocks the checkout address picker and any future modal
3. **P2-A** — skip link is one line in `RootLayout` and `index.css`
4. **P3-A/B/C** — colour token changes in one CSS file fix contrast app-wide
5. **P1-B** — nested `<main>` is a one-line element type swap per page
6. **P2-C** — `usePageTitle` hook used once per page
7. **P3-I** — route focus announcer in `RootLayout` fixes keyboard navigation on every route change
8. **P1-C, P1-D** — checkout and payment keyboard fixes
9. **Remaining P2, P3** — individual component fixes
10. **P4, P5** — polish pass
