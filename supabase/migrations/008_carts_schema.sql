-- 008_carts_schema.sql
-- Creates the carts and cart_items tables.
-- Each user has at most one cart (unique constraint on user_id).
-- cart_items has a unique constraint on (cart_id, book_id) so the same
-- book cannot be added twice — callers increment quantity instead.

create table if not exists public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint carts_user_id_unique unique (user_id)
);

create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.carts(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  quantity   integer not null default 1 check (quantity >= 1),
  added_at   timestamptz not null default now(),
  constraint cart_items_cart_book_unique unique (cart_id, book_id)
);

-- Index for fast per-cart lookups
create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
