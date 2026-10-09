-- 019_coupon_rls_restrict.sql
--
-- Fixes HIGH-4 (security review): the previous coupon SELECT policy used
-- USING (true), which allowed any unauthenticated visitor to enumerate all
-- coupon codes including inactive and future-dated ones via a direct REST call.
--
-- This migration drops the permissive policy and replaces it with one that:
--   • Only exposes coupons that are active (is_active = true).
--   • Only exposes coupons that have not expired (expires_at IS NULL OR > now()).
--
-- The read-path in SupabaseCartRepository.getCoupon() already applies these
-- filters in the query; this policy makes the DB enforce the same constraint
-- for any direct API access.

DROP POLICY IF EXISTS "coupons: public select" ON public.coupons;

CREATE POLICY "coupons: active select"
  ON public.coupons FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
