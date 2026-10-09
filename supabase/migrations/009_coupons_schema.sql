-- 009_coupons_schema.sql
-- Creates the coupons lookup table.
-- Coupons are read-only from the client side; only admins (service role) insert them.

create type if not exists public.discount_type_enum as enum ('flat', 'percent');

create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  discount_type    public.discount_type_enum not null,
  discount_value   numeric(10,2) not null check (discount_value > 0),
  min_order_value  numeric(10,2) null,
  expires_at       timestamptz null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint coupons_code_unique unique (code)
);

-- Index for fast coupon-code lookups
create index if not exists coupons_code_idx on public.coupons (code);
