-- 014_checkout_rls.sql
-- Row Level Security policies for addresses, orders, order_items, payments.

-- ── Enable RLS ────────────────────────────────────────────────────────────────

ALTER TABLE addresses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;

-- ── Addresses — owner full CRUD ───────────────────────────────────────────────

CREATE POLICY "addresses.owner select"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "addresses.owner insert"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses.owner update"
  ON addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses.owner delete"
  ON addresses FOR DELETE
  USING (auth.uid() = user_id);

-- ── Orders — owner can select and insert; no client-side update/delete ────────

CREATE POLICY "orders.owner select"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders.owner insert"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Order items — owner can select (via order join) and insert ────────────────

CREATE POLICY "order_items.owner select"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items.owner insert"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- ── Payments — owner can select and insert; no client-side update/delete ──────

CREATE POLICY "payments.owner select"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "payments.owner insert"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
