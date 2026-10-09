-- 005_seed_data.sql
-- Seed data for the Bibliophile catalogue, derived from mockData.ts.
-- UUIDs are stable constants so foreign-key cross-references resolve correctly.
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING.

-- ── Publishers ────────────────────────────────────────────────────────────────

insert into public.publishers (id, name, description) values
  ('00000000-0000-0000-0000-000000000101', 'ABC Publishers',   'Leading publisher of non-fiction.'),
  ('00000000-0000-0000-0000-000000000102', 'Star Books',       'Fiction & thriller specialists.'),
  ('00000000-0000-0000-0000-000000000103', 'Horizon Press',    'Science & philosophy titles.'),
  ('00000000-0000-0000-0000-000000000104', 'LitHouse',         'Literary fiction and memoirs.'),
  ('00000000-0000-0000-0000-000000000105', 'Young Readers Co', 'Children''s and YA books.')
on conflict (id) do nothing;

-- ── Categories ────────────────────────────────────────────────────────────────

insert into public.categories (id, name, slug) values
  ('00000000-0000-0000-0000-000000000201', 'All',                     'all'),
  ('00000000-0000-0000-0000-000000000202', 'Romance',                 'romance'),
  ('00000000-0000-0000-0000-000000000203', 'Mystery',                 'mystery'),
  ('00000000-0000-0000-0000-000000000204', 'Science Fiction',         'science-fiction'),
  ('00000000-0000-0000-0000-000000000205', 'Fantasy',                 'fantasy'),
  ('00000000-0000-0000-0000-000000000206', 'Historical',              'historical'),
  ('00000000-0000-0000-0000-000000000207', 'Biography',               'biography'),
  ('00000000-0000-0000-0000-000000000208', 'Self-help',               'self-help'),
  ('00000000-0000-0000-0000-000000000209', 'Memoir',                  'memoir'),
  ('00000000-0000-0000-0000-000000000210', 'Travel',                  'travel'),
  ('00000000-0000-0000-0000-000000000211', 'Cooking',                 'cooking'),
  ('00000000-0000-0000-0000-000000000212', 'Children''s',             'childrens'),
  ('00000000-0000-0000-0000-000000000213', 'Young Adult',             'young-adult'),
  ('00000000-0000-0000-0000-000000000214', 'Comics & Graphic Novels', 'comics'),
  ('00000000-0000-0000-0000-000000000215', 'Poetry',                  'poetry'),
  ('00000000-0000-0000-0000-000000000216', 'Drama',                   'drama'),
  ('00000000-0000-0000-0000-000000000217', 'Science',                 'science'),
  ('00000000-0000-0000-0000-000000000218', 'Philosophy',              'philosophy'),
  ('00000000-0000-0000-0000-000000000219', 'Religion',                'religion'),
  ('00000000-0000-0000-0000-000000000220', 'Language Learning',       'language-learning')
on conflict (id) do nothing;

-- ── Books ─────────────────────────────────────────────────────────────────────

insert into public.books
  (id, title, author_name, author_bio, publisher_id, description, cover_url,
   format, language, price, original_price, copies_sold, average_rating,
   is_bestseller, is_new_launch, created_at)
values
  -- Recommended section
  ('00000000-0000-0000-0000-000000000301', 'The Art of Focus',
   'Arjun Patel', 'Arjun Patel is a productivity researcher and bestselling author based in Mumbai.',
   '00000000-0000-0000-0000-000000000101',
   'Practical guide to mastering focus & boosting productivity every day.',
   '', 'paperback', 'en', 399, 499, 3420, 4.50, false, false, '2024-01-15T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000302', 'The Art of Learning',
   'Raj Patel', 'Raj Patel writes about education and lifelong learning.',
   '00000000-0000-0000-0000-000000000101',
   'Master the mindset and methods for effective lifelong learning.',
   '', 'paperback', 'en', 259, 349, 2100, 4.20, false, false, '2024-02-10T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000303', 'The Path to Success',
   'James Wright', 'Motivational author and executive coach.',
   '00000000-0000-0000-0000-000000000102',
   'A practical guide to achieving goals with clarity and confidence.',
   '', 'paperback', 'en', 359, null, 1870, 4.00, false, false, '2024-03-05T00:00:00Z'),

  -- Bestsellers
  ('00000000-0000-0000-0000-000000000304', 'The Midnight Hour',
   'James Adams', 'Thriller writer known for atmospheric noir.',
   '00000000-0000-0000-0000-000000000102',
   'Haunting tale of a man''s journey & the shadows of a forgotten past.',
   '', 'paperback', 'en', 299, 399, 5200, 4.70, true, false, '2023-11-01T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000305', 'Beneath the Stars',
   'Jessica Martin', 'Jessica Martin writes contemporary romance and literary fiction.',
   '00000000-0000-0000-0000-000000000104',
   'A heartwarming tale where two souls discover who you need.',
   '', 'hardcover', 'en', 499, null, 4300, 4.60, true, false, '2023-10-20T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000306', 'The Final Frontier',
   'Laura Mitchell', 'Science fiction author with a background in aerospace engineering.',
   '00000000-0000-0000-0000-000000000103',
   'A mission to space secrets to change humanity forever.',
   '', 'paperback', 'en', 359, 429, 3900, 4.80, true, false, '2023-09-15T00:00:00Z'),

  -- New launches
  ('00000000-0000-0000-0000-000000000307', 'Joy of Minimalism',
   'Daniel Reed', 'Daniel Reed is a productivity coach and advocate for intentional living.',
   '00000000-0000-0000-0000-000000000101',
   'Declutter your life to uncover peace, clarity, and joy.',
   '', 'paperback', 'en', 149, 199, 145, 4.30, false, true, '2025-06-01T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000308', 'The Vanishing House',
   'Clara Nelson', 'Clara Nelson writes psychological thrillers.',
   '00000000-0000-0000-0000-000000000102',
   'A chilling mystery unfolds within a house that disappears.',
   '', 'ebook', 'en', 99, null, 210, 4.10, false, true, '2025-06-10T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000309', 'The Lost Kitten',
   'Emily Parker', 'Emily Parker writes heartwarming stories for all ages.',
   '00000000-0000-0000-0000-000000000105',
   'A heartwarming tale of courage, friendship, and feline adventure.',
   '', 'hardcover', 'en', 339, null, 88, 4.90, false, true, '2025-06-15T00:00:00Z'),

  -- Additional catalogue titles
  ('00000000-0000-0000-0000-000000000310', 'Cosmos Reborn',
   'Sofia Alvarez', 'Astrophysicist-turned-author writing about the universe.',
   '00000000-0000-0000-0000-000000000103',
   'An accessible journey through the latest discoveries in cosmology.',
   '', 'ebook', 'en', 199, 249, 980, 4.40, false, false, '2024-05-20T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000311', 'Letters from Kyoto',
   'Hina Tanaka', 'Japanese travel writer and memoirist.',
   '00000000-0000-0000-0000-000000000104',
   'A lyrical memoir about finding stillness in modern Japan.',
   '', 'paperback', 'en', 279, null, 760, 4.60, false, false, '2024-04-11T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000312', 'The Dragon Code',
   'Martin Blake', 'Epic fantasy author with a love for intricate world-building.',
   '00000000-0000-0000-0000-000000000102',
   'An ancient code could spell doom or salvation for the realm.',
   '', 'hardcover', 'en', 449, 549, 2650, 4.70, true, false, '2023-08-30T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000313', 'Hindi Kavita Sangrah',
   'Priya Sharma', 'Award-winning Hindi poet from Jaipur.',
   '00000000-0000-0000-0000-000000000101',
   'A curated collection of modern Hindi poetry.',
   '', 'paperback', 'hi', 189, null, 530, 4.50, false, false, '2024-03-28T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000314', 'Empire of Sand',
   'Omar Qureshi', 'Historical fiction writer specialising in the Mughal era.',
   '00000000-0000-0000-0000-000000000104',
   'Power, betrayal, and love in the court of the Mughals.',
   '', 'paperback', 'en', 319, 399, 1450, 4.30, false, false, '2024-01-20T00:00:00Z'),

  ('00000000-0000-0000-0000-000000000315', 'Zero to One: Kids Edition',
   'Amy Chen', 'Educator and children''s author from Singapore.',
   '00000000-0000-0000-0000-000000000105',
   'Teaching entrepreneurial thinking to young minds.',
   '', 'hardcover', 'en', 299, null, 690, 4.40, false, true, '2025-05-25T00:00:00Z')
on conflict (id) do nothing;

-- ── Book → Category relationships ─────────────────────────────────────────────

insert into public.book_categories (book_id, category_id) values
  -- The Art of Focus: self-help, biography
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000208'),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000207'),
  -- The Art of Learning: self-help, biography
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000208'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000207'),
  -- The Path to Success: self-help, biography
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000208'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000207'),
  -- The Midnight Hour: mystery
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000203'),
  -- Beneath the Stars: romance, drama
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000202'),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000216'),
  -- The Final Frontier: science fiction, mystery
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000204'),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000203'),
  -- Joy of Minimalism: self-help, biography
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000208'),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000207'),
  -- The Vanishing House: mystery
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000203'),
  -- The Lost Kitten: children's
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000212'),
  -- Cosmos Reborn: science, science fiction
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000217'),
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000204'),
  -- Letters from Kyoto: travel, memoir
  ('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000210'),
  ('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000209'),
  -- The Dragon Code: fantasy
  ('00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000205'),
  -- Hindi Kavita Sangrah: poetry
  ('00000000-0000-0000-0000-000000000313', '00000000-0000-0000-0000-000000000215'),
  -- Empire of Sand: historical
  ('00000000-0000-0000-0000-000000000314', '00000000-0000-0000-0000-000000000206'),
  -- Zero to One Kids Edition: children's, young adult
  ('00000000-0000-0000-0000-000000000315', '00000000-0000-0000-0000-000000000212'),
  ('00000000-0000-0000-0000-000000000315', '00000000-0000-0000-0000-000000000213')
on conflict (book_id, category_id) do nothing;
