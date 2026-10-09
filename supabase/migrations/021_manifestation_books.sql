-- 021_manifestation_books.sql
-- Adds the "Manifestation" category with The Secret and The Magic (Rhonda Byrne).
-- Mirrors cat-manifestation / book-016 / book-017 in mockData.ts.
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING.

insert into public.categories (id, name, slug) values
  ('00000000-0000-0000-0000-000000000221', 'Manifestation', 'manifestation')
on conflict (id) do nothing;

insert into public.books
  (id, title, author_name, author_bio, publisher_id, description, cover_url,
   format, language, price, original_price, copies_sold, average_rating,
   is_bestseller, is_new_launch, created_at)
values
  ('00000000-0000-0000-0000-000000000316', 'The Secret',
   'Rhonda Byrne', 'Rhonda Byrne is an Australian author and producer, best known for The Secret.',
   '00000000-0000-0000-0000-000000000101',
   'Discover the law of attraction and how your thoughts can shape your life.',
   '', 'paperback', 'en', 399, 499, 6100, 4.60, true, false, '2024-06-01T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000317', 'The Magic',
   'Rhonda Byrne', 'Rhonda Byrne is an Australian author and producer, best known for The Secret.',
   '00000000-0000-0000-0000-000000000101',
   'A 28-day journey of gratitude practices to transform every area of your life.',
   '', 'paperback', 'en', 349, 449, 3800, 4.50, false, false, '2024-06-15T00:00:00Z')
on conflict (id) do nothing;

insert into public.book_categories (book_id, category_id) values
  -- The Secret: manifestation only
  ('00000000-0000-0000-0000-000000000316', '00000000-0000-0000-0000-000000000221'),
  -- The Magic: manifestation only
  ('00000000-0000-0000-0000-000000000317', '00000000-0000-0000-0000-000000000221')
on conflict (book_id, category_id) do nothing;

-- Remove any other category links (e.g. self-help) if this file was applied earlier
delete from public.book_categories
where book_id in ('00000000-0000-0000-0000-000000000316', '00000000-0000-0000-0000-000000000317')
  and category_id <> '00000000-0000-0000-0000-000000000221';
