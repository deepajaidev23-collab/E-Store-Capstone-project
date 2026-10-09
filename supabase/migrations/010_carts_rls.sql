-- 010_carts_rls.sql
-- Row-Level Security for carts, cart_items, and coupons.

-- ── carts ─────────────────────────────────────────────────────────────────────
alter table public.carts enable row level security;

-- Users can only see their own cart
create policy "carts: owner select"
  on public.carts for select
  using (auth.uid() = user_id);

-- Users can create their own cart
create policy "carts: owner insert"
  on public.carts for insert
  with check (auth.uid() = user_id);

-- Users can update their own cart metadata
create policy "carts: owner update"
  on public.carts for update
  using (auth.uid() = user_id);

-- Users can delete their own cart
create policy "carts: owner delete"
  on public.carts for delete
  using (auth.uid() = user_id);

-- ── cart_items ────────────────────────────────────────────────────────────────
alter table public.cart_items enable row level security;

-- Users can only see items in their own cart
create policy "cart_items: owner select"
  on public.cart_items for select
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

-- Users can add items to their own cart
create policy "cart_items: owner insert"
  on public.cart_items for insert
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

-- Users can update quantity of their own cart items
create policy "cart_items: owner update"
  on public.cart_items for update
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

-- Users can remove items from their own cart
create policy "cart_items: owner delete"
  on public.cart_items for delete
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

-- ── coupons ───────────────────────────────────────────────────────────────────
alter table public.coupons enable row level security;

-- Anyone (authenticated or not) can look up a coupon code
create policy "coupons: public select"
  on public.coupons for select
  using (true);
