-- 006_wishlists_schema.sql
-- Creates wishlists and wishlist_items tables.
--
-- Design:
--   - One wishlist per user (unique on user_id) — created lazily on first add
--   - wishlist_items links a wishlist to a book with an added_at timestamp
--   - unique(wishlist_id, book_id) prevents duplicate items at the DB level

create table if not exists public.wishlists (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlists_user_unique unique (user_id)
);

create table if not exists public.wishlist_items (
  id          uuid        primary key default gen_random_uuid(),
  wishlist_id uuid        not null references public.wishlists(id) on delete cascade,
  book_id     uuid        not null references public.books(id)     on delete cascade,
  added_at    timestamptz not null default now(),
  constraint wishlist_items_unique unique (wishlist_id, book_id)
);

-- Index: list items sorted by most-recently-added (primary query pattern)
create index if not exists wishlist_items_wishlist_idx
  on public.wishlist_items(wishlist_id, added_at desc);

-- Index: isInWishlist check by book_id
create index if not exists wishlist_items_book_idx
  on public.wishlist_items(book_id);
