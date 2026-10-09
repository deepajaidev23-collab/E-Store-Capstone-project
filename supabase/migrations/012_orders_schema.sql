-- 012_orders_schema.sql
-- Orders and order line items.
-- Prices are snapshotted at order creation time — never trust client totals;
-- the application layer re-calculates from DB book prices before inserting.

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
);

-- ── Orders ────────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status                 order_status NOT NULL DEFAULT 'pending',
  -- Price breakdown (all in INR, NUMERIC to avoid floating-point drift)
  subtotal               NUMERIC(12, 2) NOT NULL,
  discount               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reward_points_redeemed INTEGER        NOT NULL DEFAULT 0,
  tax                    NUMERIC(12, 2) NOT NULL,
  delivery_charge        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total                  NUMERIC(12, 2) NOT NULL,
  -- Coupon reference (nullable — order may have no coupon)
  coupon_id              UUID REFERENCES coupons(id) ON DELETE SET NULL,
  -- Shipping address snapshot (denormalised so address changes don't affect history)
  addr_first_name        TEXT NOT NULL,
  addr_last_name         TEXT NOT NULL,
  addr_email             TEXT NOT NULL,
  addr_phone             TEXT NOT NULL,
  addr_address_line      TEXT NOT NULL,
  addr_city              TEXT NOT NULL,
  addr_state             TEXT NOT NULL,
  addr_country           TEXT NOT NULL,
  addr_pin               TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON orders (user_id);

-- ── Order items ───────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id    UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  -- Book snapshot — immutable record of what was purchased
  title      TEXT           NOT NULL,
  cover_url  TEXT           NOT NULL,
  price      NUMERIC(10, 2) NOT NULL,
  quantity   INTEGER        NOT NULL CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);
