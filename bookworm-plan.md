# BookWorm E-Book Store — Implementation Plan

## Top-Level Overview

BookWorm is a customer-facing e-commerce platform for purchasing physical books and e-books.
The project starts from a clean Vite + React 19 + TypeScript scaffold located at
`e-book-store-fe/`. No routing, styling framework, state library, or Supabase client exists yet.

The plan is divided into 10 phases. Each phase is independently testable and ends with a
Definition of Done checklist. Phases must be completed in order because later phases
depend on artefacts (types, components, data layer) built in earlier ones.

---

## 1. Functional Requirements

### Authentication
- Guest users can browse the catalogue without signing in.
- Registered users sign up / sign in via email+password using Supabase Auth.
- After sign-in the user is redirected to the page they were trying to reach.
- Auth state persists across browser refreshes via Supabase session storage.
- Users can sign out from any page via the navbar.

### Catalogue
- Home page shows three curated rows: Recommended for You, Bestsellers this Month, New Launches.
- Left-hand sidebar lists all categories; selecting one filters the grid.
- Search bar performs text search across title and author.
- Filters: Language, Format (Paperback / eBook / Hard Cover), Price Range.
- Sort: Relevance, Price Low–High, Price High–Low, Newest.
- Clicking a category tag on a book card filters to that category.
- Clicking an author name navigates to an author/publisher filter view.

### Product Details
- Full-page detail view with cover image, title, author, publisher, description, price, format, categories, language, rating, and copies sold.
- "Add to Cart" and "Add to Wishlist" action buttons.
- Author bio section beneath the product details.
- Reviews section: display existing reviews, leave a new review (auth required), star rating.
- Related Reads sidebar: up to 4 books sharing category with the current book.

### Wishlist
- Authenticated users can add/remove books to a personal wishlist.
- Wishlist page shows all saved books with a "Move to Cart" shortcut.

### Cart
- Authenticated users have a persistent server-side cart.
- Guest users see a prompt to sign in when they click "Add to Cart".
- Cart icon in navbar shows item count badge.
- Cart supports quantity increment/decrement (minimum 1) and item removal.
- Cart total updates reactively.

### Checkout
- Accessible only when signed in and cart is non-empty.
- Shows all cart items with per-item quantity controls (mirrored from cart).
- Address section: toggle between entering a new address or using a saved address.
- Order summary panel: subtotal, tax (simulated at 12%), delivery charges (free threshold), coupon input, discount line, grand total.
- "Pay Now" button advances to the Payment screen.

### Payment
- Simulated payment modal / page over a decorative book-themed background.
- Payment method selection: Credit Card, Debit Card, UPI, Wallet.
- Credit/Debit Card form: card number, name on card, CVV, expiry.
- UPI: single VPA field.
- Wallet: balance display.
- Submitting any method calls a Supabase Edge Function that writes a payment record and transitions the order to "confirmed".
- No real payment gateway integration.

### Purchase Confirmation
- Overlay screen with a green success icon, list of purchased items, and a "Continue Shopping" button.
- Cart is cleared after successful payment.

### Orders
- "My Orders" page lists all historical orders in reverse chronological order.
- Each order shows order ID, date, items, status, and total.
- "Buy Again" button on any order item adds that book back to the cart.

### Recommendations
- "Recommended for You" section on home is derived from categories of previously purchased books.
- Falls back to bestsellers for users with no order history and for guests.
- Related Reads on the product detail page are in-category books sorted by copies sold.

### User Profile
- Profile page: update display name, avatar URL.
- Saved addresses: list, add, edit, delete.
- Reward points balance display (simulated — points awarded per order).

---

## 2. Application Routes

```
/                           Home (catalogue with recommendations)
/catalogue                  Catalogue — all books with filters
/catalogue/:categorySlug    Catalogue pre-filtered by category
/books/:bookId              Product detail page
/wishlist                   Wishlist (auth-guarded)
/cart                       Shopping cart (auth-guarded)
/checkout                   Checkout (auth-guarded, non-empty cart)
/payment                    Payment screen (auth-guarded, reached from checkout)
/order-confirmation/:orderId  Purchase confirmation (auth-guarded)
/orders                     Order history (auth-guarded)
/orders/:orderId            Order detail (auth-guarded)
/profile                    User profile + saved addresses (auth-guarded)
/login                      Sign-in page
/register                   Sign-up page
*                           404 Not Found
```

Auth-guarded routes redirect unauthenticated visitors to `/login?next=<intended-path>`.

---

## 3. Component Architecture

### Layouts
- `RootLayout` — navbar + footer wrapper used by every route
- `AuthLayout` — centered card layout for login/register pages

### Pages (one per route)
- `HomePage`
- `CataloguePage`
- `BookDetailPage`
- `WishlistPage`
- `CartPage`
- `CheckoutPage`
- `PaymentPage`
- `OrderConfirmationPage`
- `OrdersPage`
- `OrderDetailPage`
- `ProfilePage`
- `LoginPage`
- `RegisterPage`
- `NotFoundPage`

### Shared / Feature Components

**Navigation**
- `Navbar` — logo, nav links (My Orders, My Wishlist, My Writers), search bar, cart icon with badge, profile icon
- `Footer`

**Catalogue**
- `CategorySidebar` — vertical list of category names
- `BookGrid` — responsive CSS grid of `BookCard` items
- `BookCard` — cover thumbnail, title, author link, format, category tags, price, delivery estimate
- `CatalogueFilters` — language, format, price range dropdowns + sort select
- `SearchBar`
- `SectionRow` — labelled horizontal row with a title (e.g. "Recommended for You") wrapping a `BookGrid` in horizontal scroll

**Book Detail**
- `BookCoverGallery` — primary cover + optional back cover / zoom
- `BookMeta` — title, author, publisher, categories, format, language, rating, copies sold
- `BookActions` — "Add to Cart" + "Add to Wishlist" buttons
- `AuthorBio`
- `ReviewList` — renders existing `ReviewCard` items
- `ReviewForm` — textarea, star selector, submit button
- `RelatedReadsSidebar` — vertical list of up to 4 `BookCard` (compact variant)

**Cart / Checkout**
- `CartItem` — book cover, title, price, quantity stepper, remove button
- `OrderSummaryPanel` — line items, coupon input, totals
- `AddressForm` — new address form fields
- `SavedAddressSelector` — radio group of existing addresses

**Payment**
- `PaymentMethodSelector` — tab/radio for Credit Card / Debit Card / UPI / Wallet
- `CardForm`
- `UpiForm`
- `WalletForm`
- `PaymentModal` — wraps the above over the background

**Orders**
- `OrderCard` — single order summary with "Buy Again" actions per item

**Profile**
- `AddressManager` — list + add/edit/delete for saved addresses
- `ProfileForm`

**UI Primitives (from shadcn/ui)**
- Button, Input, Select, Checkbox, RadioGroup, Badge, Dialog, Tabs, Skeleton, Toast / Sonner

**Guards**
- `AuthGuard` — HOC/wrapper that redirects to `/login` if no session

---

## 4. State Architecture

### Authentication State
- **Source:** Supabase `onAuthStateChange` listener
- **Storage:** React Context (`AuthContext`) — exposes `user`, `session`, `loading`, `signIn`, `signOut`, `signUp`
- Persisted automatically by Supabase client (localStorage)

### Global Client State
- **Cart item count** — derived from the cart query; exposed via context so `Navbar` badge stays live
- **Wishlist item IDs** — small set in context, avoids per-card round trips to determine heart state
- Both are thin derived caches; source of truth is always the server

### Server / Database State
- Managed with **TanStack Query (React Query)**
- Every Supabase table access is wrapped in a query hook (`useBooks`, `useCart`, `useOrders`, etc.)
- Mutations use `useMutation` + `invalidateQueries` to keep data fresh
- No manual caching beyond what React Query provides

### Local UI State
- Filter/sort selections on catalogue page — `useState` in `CataloguePage`
- Form field values — `useState` or `react-hook-form` per form component
- Active payment method tab — `useState` in `PaymentMethodSelector`
- Dialog/modal open state — `useState` in parent component

### What is NOT duplicated
- Cart total is computed from `cart_items` query — not stored separately
- Book details are fetched per route — not placed in global store
- Order history is fetched on route entry — not cached in context

---

## 5. Data Model

All tables live in the Supabase `public` schema unless noted.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | matches `auth.users.id` |
| display_name | text | |
| avatar_url | text | nullable |
| reward_points | integer | default 0 |
| created_at | timestamptz | default now() |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text unique | e.g. "Romance", "Science Fiction" |
| slug | text unique | URL-safe |

### `publishers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| description | text | nullable |

### `books`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text | |
| author_name | text | denormalised for simplicity |
| author_bio | text | nullable |
| author_avatar_url | text | nullable |
| publisher_id | uuid FK → publishers | nullable |
| description | text | |
| cover_url | text | |
| format | text | 'paperback' / 'ebook' / 'hardcover' |
| language | text | default 'English' |
| price | numeric(10,2) | |
| original_price | numeric(10,2) | nullable (for showing discount) |
| copies_sold | integer | default 0 |
| average_rating | numeric(3,2) | maintained by trigger or periodic update |
| is_bestseller | boolean | default false |
| is_new_launch | boolean | default false |
| created_at | timestamptz | default now() |

### `book_categories`
| Column | Type | Notes |
|---|---|---|
| book_id | uuid FK → books | |
| category_id | uuid FK → categories | |
| PRIMARY KEY | (book_id, category_id) | |

### `wishlists`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users unique | one wishlist per user |

### `wishlist_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| wishlist_id | uuid FK → wishlists | |
| book_id | uuid FK → books | |
| added_at | timestamptz | default now() |
| UNIQUE | (wishlist_id, book_id) | |

### `carts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users unique | one cart per user |

### `cart_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| cart_id | uuid FK → carts | |
| book_id | uuid FK → books | |
| quantity | integer | default 1, min 1 |
| UNIQUE | (cart_id, book_id) | |

### `addresses`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| first_name | text | |
| last_name | text | |
| email | text | |
| phone | text | |
| address_line | text | |
| city | text | |
| state | text | |
| country | text | default 'India' |
| pin | text | |
| is_default | boolean | default false |

### `coupons`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| code | text unique | |
| discount_type | text | 'flat' / 'percent' |
| discount_value | numeric(10,2) | |
| min_order_value | numeric(10,2) | nullable |
| expires_at | timestamptz | nullable |
| is_active | boolean | default true |

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| status | text | 'pending' / 'confirmed' / 'shipped' / 'delivered' / 'cancelled' |
| subtotal | numeric(10,2) | |
| tax | numeric(10,2) | |
| delivery_charge | numeric(10,2) | |
| coupon_id | uuid FK → coupons | nullable |
| discount | numeric(10,2) | default 0 |
| total | numeric(10,2) | |
| shipping_address | jsonb | snapshot of address at order time |
| reward_points_redeemed | integer | default 0 |
| created_at | timestamptz | default now() |

### `order_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| book_id | uuid FK → books | |
| title | text | snapshot |
| cover_url | text | snapshot |
| price | numeric(10,2) | snapshot |
| quantity | integer | |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders unique | |
| user_id | uuid FK → auth.users | |
| method | text | 'credit_card' / 'debit_card' / 'upi' / 'wallet' |
| amount | numeric(10,2) | |
| status | text | 'pending' / 'success' / 'failed' |
| created_at | timestamptz | default now() |

### `reviews`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| book_id | uuid FK → books | |
| user_id | uuid FK → auth.users | |
| rating | integer | 1–5 |
| body | text | |
| created_at | timestamptz | default now() |
| UNIQUE | (book_id, user_id) | one review per user per book |

---

## 6. Supabase Row Level Security Policies

### Public (anon) read access
- `books` — SELECT all
- `categories` — SELECT all
- `publishers` — SELECT all
- `book_categories` — SELECT all
- `reviews` — SELECT all

### `profiles`
- SELECT: `auth.uid() = id`
- UPDATE: `auth.uid() = id`
- INSERT: `auth.uid() = id` (triggered automatically on sign-up via DB function)

### `wishlists` / `wishlist_items`
- SELECT / INSERT / DELETE: `auth.uid() = user_id` (joined via `wishlists.user_id` for items)

### `carts` / `cart_items`
- SELECT / INSERT / UPDATE / DELETE: `auth.uid() = user_id` (joined for items)

### `addresses`
- SELECT / INSERT / UPDATE / DELETE: `auth.uid() = user_id`

### `orders` / `order_items`
- SELECT: `auth.uid() = user_id` (joined for items)
- INSERT: `auth.uid() = user_id` (creation only; status changes via Edge Function)
- UPDATE / DELETE: denied from client; only Edge Function (service role) may update status

### `payments`
- SELECT: `auth.uid() = user_id`
- INSERT: denied from client; only via Edge Function (service role)

### `reviews`
- SELECT: public
- INSERT: `auth.uid() = user_id`
- UPDATE / DELETE: `auth.uid() = user_id`

### `coupons`
- SELECT: all authenticated users (needed for validation display)
- All writes: service role only

---

## 7. Feature Implementation Order

### Phase 0 — Project Bootstrap
Install and configure: React Router, Tailwind CSS, shadcn/ui, Supabase JS client,
TanStack Query, and react-hook-form. Set up path aliases, base layout, and
`AuthContext`. Wipe the Vite starter template content.

### Phase 1 — Authentication
Sign-up and sign-in pages, `AuthGuard` component, navbar with conditional auth links,
Supabase Auth hooks. Profile is auto-created via DB trigger.

### Phase 2 — Catalogue (Read-Only)
Supabase schema + seed data, `useBooks` / `useCategories` query hooks,
`HomePage` with three curated sections, `CataloguePage` with sidebar, filters,
search, and sort. `BookCard` component. No cart/wishlist actions yet.

### Phase 3 — Book Detail Page
`BookDetailPage` with full metadata, author bio, reviews display, `RelatedReadsSidebar`.
Read-only at this stage (no cart or wishlist buttons wired).

### Phase 4 — Wishlist
`useWishlist` hooks, wishlist toggle on `BookCard` and `BookDetailPage`,
`WishlistPage`, auth guard on wishlist actions.

### Phase 5 — Cart
`useCart` hooks, "Add to Cart" wired on `BookDetailPage` and `WishlistPage`,
`CartPage` with quantity controls and remove, cart badge in navbar.

### Phase 6 — Checkout
`CheckoutPage` with cart items, `AddressForm`, `SavedAddressSelector`,
`OrderSummaryPanel` with coupon input and totals calculation.
Order record created in Supabase when "Pay Now" is clicked.

### Phase 7 — Payment & Confirmation
`PaymentPage` with simulated method forms, Supabase Edge Function to write
payment record + update order status + award reward points.
`OrderConfirmationPage`. Cart is cleared on success.

### Phase 8 — Order History
`OrdersPage`, `OrderDetailPage`, `OrderCard` with "Buy Again".

### Phase 9 — User Profile & Addresses
`ProfilePage`, `ProfileForm`, `AddressManager` (CRUD for saved addresses),
reward points display.

### Phase 10 — Recommendations & Polish
Order-history-based recommendations on home page, visual polish, loading skeletons,
empty states, 404 page, responsive refinements, final accessibility pass.

---

## 8. Testing Strategy

### Unit Tests (Vitest)
- Pure utility functions: price formatting, coupon discount calculation, tax computation,
  slug generation.
- Query hook factories: verify correct Supabase query construction against mocked client.

### Component Tests (Vitest + React Testing Library)
- `BookCard` renders title, author, price, and format correctly.
- `CartItem` quantity stepper increments and decrements; remove button fires callback.
- `OrderSummaryPanel` computes and displays correct totals with and without coupon.
- `AddressForm` validates required fields and rejects malformed pin codes.
- `ReviewForm` enforces the star-rating requirement before allowing submission.
- `AuthGuard` redirects when no session is present.

### Integration Tests (Vitest + MSW for Supabase API mocking)
- Full add-to-cart flow: unauthenticated redirect, authenticated insert, badge update.
- Checkout order creation: address selection, coupon application, order record written.
- Payment submission: Edge Function called, order status updated, cart cleared.
- Wishlist toggle: add, verify persistence, remove.

### End-to-End Tests (Playwright)
- New user registration → lands on home → browses catalogue → opens product detail →
  adds to cart → checks out → pays → sees confirmation → checks order history.
- Returning user → applies coupon → reward points shown → completes purchase.
- Guest user attempts cart → redirected to login → completes flow after login.

---

## 9. Definition of Done

### Phase 0
- [ ] `npm run dev` starts without errors inside `e-book-store-fe/`
- [ ] Tailwind classes apply correctly in the browser
- [ ] Supabase client initialises without console errors (env vars present)
- [ ] React Router renders the home route
- [ ] TanStack Query `QueryClientProvider` is in the tree
- [ ] `AuthContext` exposes user/session (null initially)
- [ ] `RootLayout` renders navbar and footer on every route

### Phase 1
- [ ] User can register with email + password
- [ ] User can sign in and out
- [ ] Navbar shows auth-aware links
- [ ] `AuthGuard` redirects unauthenticated users and restores intended path after login
- [ ] `profiles` row is created automatically on sign-up

### Phase 2
- [ ] Home page renders all three curated sections with real Supabase data
- [ ] Category sidebar filters the book grid
- [ ] Search narrows results to matching title/author
- [ ] Format, language, and price-range filters work in combination
- [ ] Sort options reorder the grid correctly

### Phase 3
- [ ] Product detail page shows all required metadata
- [ ] Author bio section renders
- [ ] Reviews list shows existing records from Supabase
- [ ] Related Reads sidebar shows up to 4 in-category books
- [ ] Breadcrumb reflects category path

### Phase 4
- [ ] Heart icon on `BookCard` and detail page toggles correctly for authenticated users
- [ ] Unauthenticated click redirects to login
- [ ] `WishlistPage` lists all saved books
- [ ] Removing from wishlist reflects immediately

### Phase 5
- [ ] "Add to Cart" inserts or increments the `cart_items` row
- [ ] `CartPage` shows all items with correct quantities and prices
- [ ] Quantity stepper and remove actions persist to Supabase
- [ ] Navbar badge reflects live cart count

### Phase 6
- [ ] Checkout page is unreachable with an empty cart
- [ ] Address form validates all required fields
- [ ] Saved address toggle works
- [ ] Coupon code validates against `coupons` table and applies discount
- [ ] Order record is written to Supabase with status "pending" when "Pay Now" is clicked

### Phase 7
- [ ] Payment page is reachable only from a confirmed checkout flow
- [ ] All four payment method forms render and validate
- [ ] Edge Function writes `payments` row and updates order to "confirmed"
- [ ] Cart is emptied after successful payment
- [ ] Confirmation screen shows purchased items
- [ ] Reward points are incremented on the profile

### Phase 8
- [ ] Orders page lists all user orders in reverse chronological order
- [ ] Order detail shows all `order_items` with snapshots
- [ ] "Buy Again" adds the book to the active cart

### Phase 9
- [ ] Profile form saves display_name changes
- [ ] Address list shows all saved addresses
- [ ] User can add, edit, and delete addresses
- [ ] Reward points balance is displayed

### Phase 10
- [ ] Recommendations on home page are category-derived for users with order history
- [ ] All pages have loading skeletons and non-empty states
- [ ] 404 page renders for unknown routes
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] ESLint reports zero errors

---

## 10. Risks

### Data model snapshot drift
`order_items` stores a snapshot of price, title, and cover at order time.
If the book record is updated after purchase the snapshot must remain unchanged.
Risk: AI may query the live `books` table when rendering order history instead of
using the snapshot columns. Verify every order history render uses only `order_items` columns.

### RLS policy gaps
Supabase RLS must be enabled on every table. AI-generated migrations commonly
forget to `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or add policies only for
`SELECT` while omitting `INSERT`. Review every migration file before applying.

### Cart/wishlist creation race conditions
`carts` and `wishlists` have a 1:1 relationship with `auth.users`.
AI may assume the row already exists and fail on `INSERT INTO cart_items` when
the cart row has never been created. Use `upsert` on cart/wishlist creation and
ensure the row is created in the sign-up trigger.

### Payment simulation boundary
The payment page must not accept or transmit real card data. Risk: AI may add
form validation that looks like real PCI-scoped handling. Keep the form clearly
labelled as simulation and do not store raw card numbers.

### TanStack Query stale state after mutations
After checkout empties the cart, the cart badge may show a stale count if
`invalidateQueries` is not called for all affected query keys. AI tends to
invalidate only the direct mutation key. Audit each mutation to ensure cascading
cache invalidation (cart, cart count, orders, profile points).

### Auth redirect loop
If `AuthGuard` is implemented naively it can redirect to `/login` which itself
renders inside `AuthGuard`, causing an infinite loop. Ensure login and register
routes are explicitly excluded from the guard.

### shadcn/ui component version mismatch
shadcn/ui components are copied into the project, not installed as a package.
AI may generate import paths that reference the package registry instead of the
local `@/components/ui/` path alias. Verify all shadcn imports after scaffolding.

### TypeScript strict mode + React 19 types
The project uses TypeScript 6 with `noUnusedLocals`, `noUnusedParameters`, and
`erasableSyntaxOnly`. AI-generated code frequently includes unused imports or
uses deprecated React 18 type patterns (`React.FC`, `React.VFC`). Run `tsc --noEmit`
after each phase and fix all errors before proceeding.

### Supabase Edge Function cold starts
The payment Edge Function will cold-start on first invocation. In development
this may cause the payment UI to appear to hang. Add a loading state and a
timeout UI hint.

### Recommendation algorithm correctness
The "Recommended for You" query joins `orders → order_items → book_categories`
to find categories, then fetches books in those categories excluding already-purchased books.
This multi-join is easy to get wrong in Supabase's JS client query builder.
Write the query as a Supabase RPC (Postgres function) to keep the logic testable
and auditable.

---

## Relevant Files and Conventions

- All source files live under `e-book-store-fe/src/`
- Path alias `@/` should map to `e-book-store-fe/src/`
- Supabase credentials stored in `e-book-store-fe/.env.local` (not committed)
- Component files use `.tsx` extension; utility/hook files use `.ts`
- shadcn/ui components generated into `src/components/ui/`
- Feature components grouped by domain: `src/components/catalogue/`, `src/components/cart/`, etc.
- Query hooks in `src/hooks/` (e.g. `useBooks.ts`, `useCart.ts`)
- Supabase client singleton in `src/lib/supabase.ts`
- Type definitions in `src/types/` (one file per domain: `book.ts`, `order.ts`, etc.)
- Supabase migrations in `supabase/migrations/`
