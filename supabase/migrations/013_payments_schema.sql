-- 013_payments_schema.sql
-- Payment records for orders.
-- No real payment processor: status is set by the application directly.

CREATE TYPE payment_method_enum AS ENUM (
  'credit_card',
  'debit_card',
  'upi',
  'wallet'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending',
  'success',
  'failed'
);

CREATE TABLE payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  method     payment_method_enum  NOT NULL,
  amount     NUMERIC(12, 2)       NOT NULL,
  status     payment_status_enum  NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_id_idx ON payments (order_id);
CREATE INDEX payments_user_id_idx  ON payments (user_id);
