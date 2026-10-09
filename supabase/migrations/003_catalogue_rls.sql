-- 003_catalogue_rls.sql
-- Enables RLS on catalogue tables and grants public read access to
-- unauthenticated (anon role) visitors so the catalogue is browsable
-- without sign-in. No write access is granted to the anon role.

alter table public.categories      enable row level security;
alter table public.publishers      enable row level security;
alter table public.books           enable row level security;
alter table public.book_categories enable row level security;
alter table public.reviews         enable row level security;

-- categories: public read
do $$ begin
  create policy "anyone can read categories"
    on public.categories for select
    using (true);
exception when duplicate_object then null;
end $$;

-- publishers: public read
do $$ begin
  create policy "anyone can read publishers"
    on public.publishers for select
    using (true);
exception when duplicate_object then null;
end $$;

-- books: public read
do $$ begin
  create policy "anyone can read books"
    on public.books for select
    using (true);
exception when duplicate_object then null;
end $$;

-- book_categories: public read (required for category filter join)
do $$ begin
  create policy "anyone can read book_categories"
    on public.book_categories for select
    using (true);
exception when duplicate_object then null;
end $$;

-- reviews: public read (reviews are visible to all visitors)
do $$ begin
  create policy "anyone can read reviews"
    on public.reviews for select
    using (true);
exception when duplicate_object then null;
end $$;

-- reviews: authenticated users can insert their own review
do $$ begin
  create policy "authenticated users can insert reviews"
    on public.reviews for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- reviews: authenticated users can update their own review
do $$ begin
  create policy "authenticated users can update own reviews"
    on public.reviews for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
