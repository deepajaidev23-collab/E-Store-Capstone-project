-- 018_create_order_rpc_server_prices.sql
--
-- Replaces create_order_with_items to fix three security vulnerabilities
-- identified in the production-readiness review:
--
--   CRIT-2  Item prices were accepted from the client payload and inserted
--           verbatim.  An attacker calling the RPC directly could supply
--           price: 0.01 for every item.
--
--   HIGH-2  Reward-points redemption amount was accepted from the client
--           without comparing it to the user's actual balance in profiles.
--
--   HIGH-3  Coupon discount was accepted from the client without
--           re-validating that the coupon is still active and computing
--           the discount server-side.
--
-- Changes from the original (migration 015):
--
--   • p_items no longer uses the client-supplied "price" field.
--     The function SELECTs books.price for each book_id and raises an
--     exception if any book_id is not found.
--
--   • p_reward_points is capped to the caller's actual profiles.reward_points
--     balance.  If p_reward_points exceeds the balance the excess is silently
--     clamped (same behaviour as the UI).
--
--   • When p_coupon_id is non-null, the function fetches the coupons row and
--     verifies is_active = true AND (expires_at IS NULL OR expires_at > now()).
--     If the coupon fails this check the function raises an exception.
--     The discount amount is then computed server-side from the coupon rule
--     and the DB-sourced subtotal, replacing the client-supplied p_discount.
--
--   • All financial aggregates (subtotal, discount, tax, total) are recomputed
--     from the server-authoritative values and the client-supplied p_subtotal /
--     p_discount / p_tax / p_total are ignored entirely.
--
-- The p_items JSONB structure still carries title, cover_url, and quantity so
-- those snapshot fields continue to work as before.

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_user_id           UUID,
  p_subtotal          NUMERIC,   -- kept for interface compat; ignored server-side
  p_discount          NUMERIC,   -- kept for interface compat; ignored server-side
  p_reward_points     INTEGER,
  p_tax               NUMERIC,   -- kept for interface compat; ignored server-side
  p_delivery_charge   NUMERIC,
  p_total             NUMERIC,   -- kept for interface compat; ignored server-side
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
  v_order_id          UUID;
  v_order_row         JSONB;
  v_item              JSONB;
  v_items_out         JSONB    := '[]'::JSONB;
  v_item_row          JSONB;

  -- server-authoritative price fields
  v_book_price        NUMERIC;
  v_computed_subtotal NUMERIC  := 0;
  v_reward_balance    INTEGER;
  v_capped_reward     INTEGER;
  v_coupon_type       TEXT;
  v_coupon_value      NUMERIC;
  v_coupon_min        NUMERIC;
  v_computed_discount NUMERIC  := 0;
  v_discounted_sub    NUMERIC;
  v_tax_base          NUMERIC;
  v_computed_tax      NUMERIC;
  v_computed_total    NUMERIC;
BEGIN
  -- ── 1. Caller identity check ─────────────────────────────────────────────────
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: caller uid does not match p_user_id';
  END IF;

  -- ── 2. Compute server-authoritative subtotal from DB book prices ─────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price INTO v_book_price
      FROM books
     WHERE id = (v_item->>'book_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Book not found: %', v_item->>'book_id';
    END IF;

    v_computed_subtotal := v_computed_subtotal
      + v_book_price * (v_item->>'quantity')::INTEGER;
  END LOOP;

  -- ── 3. Cap reward-points redemption to the user's actual balance ─────────────
  SELECT reward_points INTO v_reward_balance
    FROM profiles
   WHERE id = p_user_id;

  v_reward_balance := COALESCE(v_reward_balance, 0);
  v_capped_reward  := LEAST(GREATEST(p_reward_points, 0), v_reward_balance);

  -- ── 4. Re-validate coupon and compute discount server-side ───────────────────
  IF p_coupon_id IS NOT NULL THEN
    SELECT discount_type, discount_value, min_order_value
      INTO v_coupon_type, v_coupon_value, v_coupon_min
      FROM coupons
     WHERE id       = p_coupon_id
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Coupon is invalid or has expired';
    END IF;

    -- Only apply coupon if subtotal meets min_order_value
    IF v_coupon_min IS NULL OR v_computed_subtotal >= v_coupon_min THEN
      IF v_coupon_type = 'flat' THEN
        v_computed_discount := LEAST(v_coupon_value, v_computed_subtotal);
      ELSE
        -- percent
        v_computed_discount := ROUND(v_computed_subtotal * (v_coupon_value / 100), 2);
      END IF;
    END IF;
  END IF;

  -- ── 5. Compute tax and total ─────────────────────────────────────────────────
  v_discounted_sub := GREATEST(0, v_computed_subtotal - v_computed_discount);
  -- Reward points reduce the tax base (1 pt = ₹1)
  v_tax_base       := GREATEST(0, v_discounted_sub - v_capped_reward);
  v_computed_tax   := ROUND(v_tax_base * 0.12, 2);
  v_computed_total := ROUND(v_tax_base + v_computed_tax, 2);

  -- ── 6. Insert the order row using server-computed values ─────────────────────
  INSERT INTO orders (
    user_id, subtotal, discount, reward_points_redeemed,
    tax, delivery_charge, total, coupon_id,
    addr_first_name, addr_last_name, addr_email, addr_phone,
    addr_address_line, addr_city, addr_state, addr_country, addr_pin
  )
  VALUES (
    p_user_id,
    v_computed_subtotal,
    v_computed_discount,
    v_capped_reward,
    v_computed_tax,
    p_delivery_charge,
    v_computed_total,
    p_coupon_id,
    p_addr_first_name, p_addr_last_name, p_addr_email, p_addr_phone,
    p_addr_address_line, p_addr_city, p_addr_state, p_addr_country, p_addr_pin
  )
  RETURNING id INTO v_order_id;

  -- ── 7. Insert order_items using DB prices ────────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price INTO v_book_price
      FROM books
     WHERE id = (v_item->>'book_id')::UUID;

    INSERT INTO order_items (order_id, book_id, title, cover_url, price, quantity)
    VALUES (
      v_order_id,
      (v_item->>'book_id')::UUID,
      v_item->>'title',
      v_item->>'cover_url',
      v_book_price,                         -- DB price, not client-supplied
      (v_item->>'quantity')::INTEGER
    )
    RETURNING to_jsonb(order_items.*) INTO v_item_row;

    v_items_out := v_items_out || jsonb_build_array(v_item_row);
  END LOOP;

  -- ── 8. Return combined result ────────────────────────────────────────────────
  SELECT to_jsonb(orders.*) INTO v_order_row
    FROM orders
   WHERE id = v_order_id;

  RETURN v_order_row || jsonb_build_object('order_items', v_items_out);
END;
$$;
