-- 002_catalogue_indexes.sql
-- Indexes that back every filter and sort path used by SupabaseBookRepository.

-- Full-text search on title + author_name (powers getBooks search filter)
create index if not exists books_fts_idx
  on public.books
  using gin(to_tsvector('english', title || ' ' || author_name));

-- Curated-section boolean flags (partial indexes — small, fast)
create index if not exists books_bestseller_idx
  on public.books(is_bestseller)
  where is_bestseller = true;

create index if not exists books_new_launch_idx
  on public.books(is_new_launch)
  where is_new_launch = true;

-- Sort by price
create index if not exists books_price_idx
  on public.books(price);

-- Sort by rating (desc most useful)
create index if not exists books_rating_idx
  on public.books(average_rating desc);

-- Sort by newest
create index if not exists books_created_at_idx
  on public.books(created_at desc);

-- Language filter
create index if not exists books_language_idx
  on public.books(language);

-- Format filter
create index if not exists books_format_idx
  on public.books(format);

-- Publisher filter
create index if not exists books_publisher_idx
  on public.books(publisher_id);

-- Category join (book_categories) — used by category filter and related-books query
create index if not exists book_categories_category_idx
  on public.book_categories(category_id);

create index if not exists book_categories_book_idx
  on public.book_categories(book_id);

-- Reviews lookup by book
create index if not exists reviews_book_idx
  on public.reviews(book_id, created_at desc);
