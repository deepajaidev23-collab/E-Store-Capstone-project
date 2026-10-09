# Bibliophile — e-Book Store

A full-stack e-book storefront built with **React 19**, **TypeScript 6**, **Vite**, **Supabase**, and **TailwindCSS v4**.

---

## Features

- Browse, search, and filter a book catalogue
- Bestseller and new-launch landing sections
- Book detail pages with reviews and related reads
- Wishlist and shopping cart (optimistic updates)
- Checkout with address management, coupon codes, and reward points
- Simulated payment flow (credit/debit card, UPI, wallet)
- Order history and per-order receipt pages
- Authenticated user profile with reward-points balance

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Supabase account | (free tier sufficient) |

---

## Local development

### 1. Clone and install

```bash
git clone <repo-url>
cd e-book-store-capstone/e-book-store-fe
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase project values:

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_USE_SUPABASE=true
```

> **Security**: `.env.local` is covered by `.gitignore` (`*.local`). Never commit it.
> Verify with `git ls-files .env.local` — should return nothing.
> If a key is ever accidentally committed, rotate it immediately:
> Supabase dashboard → Settings → API → Rotate anon key.

Set `VITE_USE_SUPABASE=false` (or omit it) to run against in-memory mock repositories — no Supabase project required.

### 3. Apply database migrations

From the repo root, apply all migrations in order to your Supabase project:

```bash
# Using the Supabase CLI (recommended)
npx supabase db push --project-id <project-id>

# Or apply manually in the Supabase SQL editor:
# supabase/migrations/001_catalogue_schema.sql  →  020_profiles_schema.sql
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check then produce a production bundle in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run TypeScript without emitting (fast type validation) |
| `npm run lint` | Run ESLint across all source files |
| `npm run format` | Auto-format with Prettier |
| `npm run format:check` | Verify formatting (use in CI) |
| `npm run test` | Run the Vitest test suite once |
| `npm run test:watch` | Watch mode for development |
| `npm run test:coverage` | Generate coverage report in `lcov` format |
| `npm run gen:types` | Regenerate `src/lib/database.types.ts` from the live Supabase schema (requires `SUPABASE_PROJECT_ID` env var) |

---

## Project structure

```
src/
├── components/          # Shared UI components (ui/) and feature components
├── context/             # React contexts (AuthContext)
├── hooks/               # React Query hooks (data fetching & mutations)
├── lib/                 # Pure utilities: pricing, validation, logger, Supabase client
├── pages/               # Route-level page components
├── repositories/        # Data-access layer
│   ├── <Name>Repository.ts   # Interface (contract)
│   ├── mock/                 # In-memory implementations (no network)
│   └── supabase/             # Supabase-backed implementations
├── services/            # Business logic (recommendation scoring)
├── test/                # Vitest test files
└── types/               # Domain TypeScript interfaces
```

---

## Database migrations

All schema changes live in `supabase/migrations/` and must be applied in numeric order.

| Migration | Description |
|---|---|
| 001–002 | Catalogue schema and indexes |
| 003 | Catalogue RLS |
| 004 | Average-rating trigger |
| 005 | Seed data |
| 006–007 | Wishlists schema and RLS |
| 008–010 | Carts, coupons schema and RLS |
| 011–014 | Addresses, orders, payments schema and RLS |
| 015 | Original `create_order_with_items` RPC |
| 016 | Payment idempotency key and confirm trigger |
| 017 | `cancel_order` SECURITY DEFINER RPC |
| 018 | `create_order_with_items` — server-side price, reward-points, and coupon enforcement |
| 019 | Coupon RLS — restrict to active + non-expired coupons only |
| 020 | Profiles schema, RLS, auto-create trigger on signup, and backfill |

---

## Regenerating database types

The file `src/lib/database.types.ts` must stay in sync with the schema.
After running a migration, regenerate it:

```bash
export SUPABASE_PROJECT_ID=<your-project-id>
npm run gen:types
```

Commit the updated file alongside the migration.

---

## Security notes

- All user data is protected by Row Level Security (RLS) at the Supabase/Postgres level.
- Prices and financial totals are computed server-side inside SECURITY DEFINER RPCs — client-supplied values are not trusted.
- The anon key is intentionally public (it is embedded in the browser bundle) and relies on RLS for security. Never store the `service_role` key in frontend code.

---

## Testing

Tests use **Vitest** with **Testing Library** and run entirely against mock repositories (no network calls):

```bash
npm test                 # single run
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
```
