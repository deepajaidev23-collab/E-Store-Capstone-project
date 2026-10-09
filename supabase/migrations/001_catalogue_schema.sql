-- 001_catalogue_schema.sql
-- Creates the book_format enum and the five catalogue tables:
--   categories, publishers, books, book_categories, reviews
--
-- All PKs are uuid. Timestamps default to now().
-- author_name / author_bio are intentionally denormalised on books —
-- the domain type and all UI components use these fields directly.

-- ── Enum ─────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.book_format as enum ('paperback', 'ebook', 'hardcover');
exception
  when duplicate_object then null;
end $$;

-- ── categories ────────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  constraint categories_name_unique unique (name),
  constraint categories_slug_unique unique (slug)
);

-- ── publishers ────────────────────────────────────────────────────────────────

create table if not exists public.publishers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text
);

-- ── books ─────────────────────────────────────────────────────────────────────

create table if not exists public.books (
  id                uuid          primary key default gen_random_uuid(),
  title             text          not null,
  author_name       text          not null,
  author_bio        text,
  author_avatar_url text,
  publisher_id      uuid          references public.publishers(id) on delete set null,
  description       text          not null default '',
  cover_url         text          not null default '',
  format            public.book_format not null,
  language          text          not null default 'en',
  price             numeric(10,2) not null,
  original_price    numeric(10,2),
  copies_sold       integer       not null default 0,
  average_rating    numeric(3,2)  not null default 0.00,
  is_bestseller     boolean       not null default false,
  is_new_launch     boolean       not null default false,
  created_at        timestamptz   not null default now()
);

-- ── book_categories ───────────────────────────────────────────────────────────

create table if not exists public.book_categories (
  book_id     uuid not null references public.books(id)      on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (book_id, category_id)
);

-- ── reviews ───────────────────────────────────────────────────────────────────
-- reviewer_name is resolved at query time via a join to profiles.display_name.
-- A unique constraint on (book_id, user_id) enforces one review per user per book.

create table if not exists public.reviews (
  id         uuid        primary key default gen_random_uuid(),
  book_id    uuid        not null references public.books(id) on delete cascade,
  user_id    uuid        not null references auth.users(id)   on delete cascade,
  rating     smallint    not null check (rating between 1 and 5),
  body       text        not null default '',
  created_at timestamptz not null default now(),
  constraint reviews_book_user_unique unique (book_id, user_id)
);
