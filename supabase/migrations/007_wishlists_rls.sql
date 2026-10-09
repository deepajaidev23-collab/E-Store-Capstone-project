-- 007_wishlists_rls.sql
-- Enables RLS on wishlists and wishlist_items.
-- All access is restricted to the row owner (auth.uid() = user_id).
-- No anonymous access is permitted.

alter table public.wishlists      enable row level security;
alter table public.wishlist_items enable row level security;

-- ── wishlists ─────────────────────────────────────────────────────────────────

do $$ begin
  create policy "users can read own wishlist"
    on public.wishlists for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "users can insert own wishlist"
    on public.wishlists for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "users can delete own wishlist"
    on public.wishlists for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ── wishlist_items ────────────────────────────────────────────────────────────
-- Policies join through wishlists to confirm ownership.

do $$ begin
  create policy "users can read own wishlist items"
    on public.wishlist_items for select
    using (
      exists (
        select 1 from public.wishlists w
        where w.id = wishlist_id and w.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "users can insert own wishlist items"
    on public.wishlist_items for insert
    with check (
      exists (
        select 1 from public.wishlists w
        where w.id = wishlist_id and w.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "users can delete own wishlist items"
    on public.wishlist_items for delete
    using (
      exists (
        select 1 from public.wishlists w
        where w.id = wishlist_id and w.user_id = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;
