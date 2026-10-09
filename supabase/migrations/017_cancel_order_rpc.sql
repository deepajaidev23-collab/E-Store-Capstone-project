-- 017_cancel_order_rpc.sql
-- Secure order cancellation via a SECURITY DEFINER function.
--
-- Problem being fixed (CRIT-4 / security review):
--   The previous implementation issued a direct UPDATE from the client with
--   no server-side status guard.  Although no UPDATE RLS policy existed
--   (making it a silent no-op), the pattern was unsafe: any future policy
--   addition could have allowed cancelling confirmed or delivered orders.
--
-- This function:
--   1. Verifies the caller owns the order (auth.uid() = user_id).
--   2. Only allows cancellation when status = 'pending'.
--   3. Raises an explicit exception for all other cases.
--   4. Runs as SECURITY DEFINER so it can UPDATE the row without an RLS
--      UPDATE policy ever being granted to the client role.
--
-- Called via: client.rpc('cancel_order', { p_order_id: '<uuid>' })

CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_status  order_status;
BEGIN
  -- Load the current owner and status in one read
  SELECT user_id, status
    INTO v_user_id, v_status
    FROM orders
   WHERE id = p_order_id;

  -- Order does not exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Caller must own the order
  IF auth.uid() IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: you do not own this order';
  END IF;

  -- Only pending orders can be cancelled
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Order cannot be cancelled: current status is %', v_status;
  END IF;

  UPDATE orders
     SET status = 'cancelled'
   WHERE id = p_order_id;
END;
$$;
