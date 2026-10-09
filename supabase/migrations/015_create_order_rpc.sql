-- 015_create_order_rpc.sql
-- Atomic order creation via a single Postgres function.
-- Both the `orders` row and all `order_items` rows are inserted inside one
-- transaction — if any step fails the entire call rolls back, eliminating
-- the partial-order gap that existed when the two inserts were separate.
--
-- The function is called via supabase-js: client.rpc('create_order_with_items', payload)
--
-- Parameters:
--   p_user_id            UUID
--   p_subtotal           NUMERIC
--   p_discount           NUMERIC
--   p_reward_points      INTEGER
--   p_tax                NUMERIC
--   p_delivery_charge    NUMERIC
--   p_total              NUMERIC
--   p_coupon_id          UUID (nullable)
--   p_addr_first_name    TEXT
--   p_addr_last_name     TEXT
--   p_addr_email         TEXT
--   p_addr_phone         TEXT
--   p_addr_address_line  TEXT
--   p_addr_city          TEXT
--   p_addr_state         TEXT
--   p_addr_country       TEXT
--   p_addr_pin           TEXT
--   p_items              JSONB  — array of {book_id, title, cover_url, price, quantity}
--
-- Returns: JSONB  — the new order row merged with its items array
--
-- Security: SECURITY DEFINER so the function runs as its owner (postgres) and
-- can bypass RLS for the internal order_items insert that goes through the
-- orders ownership check.  The caller must be authenticated (auth.uid() check
-- guards the user_id equality).

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_user_id           UUID,
  p_subtotal          NUMERIC,
  p_discount          NUMERIC,
  p_reward_points     INTEGER,
  p_tax               NUMERIC,
  p_delivery_charge   NUMERIC,
  p_total             NUMERIC,
  p_coupon_id         UUID,
  p_addr_first_name   TEXT,
  p_addr_last_name    TEXT,
  p_addr_email        TEXT,
  p_addr_phone        TEXT,
  p_addr_address_line TEXT,
  p_addr_city         TEXT,
  p_addr_state        TEXT,
  p_addr_country      TEXT,
  p_addr_pin          TEXT,
  p_items             JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id  UUID;
  v_order_row JSONB;
  v_item      JSONB;
  v_items_out JSONB := '[]'::JSONB;
  v_item_row  JSONB;
BEGIN
  -- Verify the caller is the same user they are creating the order for.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: caller uid does not match p_user_id';
  END IF;

  -- ── Insert the order row ─────────────────────────────────────────────────────
  INSERT INTO orders (
    user_id, subtotal, discount, reward_points_redeemed,
    tax, delivery_charge, total, coupon_id,
    addr_first_name, addr_last_name, addr_email, addr_phone,
    addr_address_line, addr_city, addr_state, addr_country, addr_pin
  )
  VALUES (
    p_user_id, p_subtotal, p_discount, p_reward_points,
    p_tax, p_delivery_charge, p_total, p_coupon_id,
    p_addr_first_name, p_addr_last_name, p_addr_email, p_addr_phone,
    p_addr_address_line, p_addr_city, p_addr_state, p_addr_country, p_addr_pin
  )
  RETURNING id INTO v_order_id;

  -- ── Insert each order_item row ───────────────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, book_id, title, cover_url, price, quantity)
    VALUES (
      v_order_id,
      (v_item->>'book_id')::UUID,
      v_item->>'title',
      v_item->>'cover_url',
      (v_item->>'price')::NUMERIC,
      (v_item->>'quantity')::INTEGER
    )
    RETURNING to_jsonb(order_items.*) INTO v_item_row;

    v_items_out := v_items_out || jsonb_build_array(v_item_row);
  END LOOP;

  -- ── Build and return the combined result ─────────────────────────────────────
  SELECT to_jsonb(orders.*) INTO v_order_row
  FROM orders
  WHERE id = v_order_id;

  RETURN v_order_row || jsonb_build_object('order_items', v_items_out);
END;
$$;
