-- 016_payment_idempotency_and_confirm_trigger.sql
--
-- Two changes to the payments table:
--
-- 1. idempotency_key column (TEXT UNIQUE)
--    A client-generated UUID attached to each confirmPayment call.
--    The UNIQUE constraint prevents a second payment row being inserted for
--    the same attempt, protecting against double-charges on network retries.
--    The column is nullable so existing rows (and mock/test rows) are valid.
--
-- 2. Trigger: handle_payment_success
--    AFTER INSERT on payments — when a new payment row with status='success'
--    is inserted, the trigger atomically sets the parent order's status to
--    'confirmed'.  This keeps the Supabase impl in parity with the mock, which
--    already does this inside confirmPayment().
--    A failed payment (status='failed') leaves the order in 'pending' so the
--    user can retry.

-- ── 1. Idempotency key column ─────────────────────────────────────────────────

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Unique index (NULL values are excluded from uniqueness, so NULL is allowed
-- for legacy rows, but two rows with the same non-NULL key are rejected).
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_idx
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── 2. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE orders
    SET    status = 'confirmed'
    WHERE  id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. Attach trigger to payments ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_payment_success ON payments;

CREATE TRIGGER on_payment_success
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_success();

-- ── 4. Allow the trigger (SECURITY DEFINER) to UPDATE orders status ───────────
-- The existing RLS policy only allows the row owner to SELECT and INSERT;
-- no UPDATE policy exists for clients.  The trigger runs as the function owner
-- (postgres / service role) which bypasses RLS — no extra policy needed.
-- We document this explicitly so it is not accidentally added as a client policy.
