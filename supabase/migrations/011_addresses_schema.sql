-- 011_addresses_schema.sql
-- User delivery addresses table.
-- Each user can have multiple saved addresses; exactly one can be the default.

CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'India',
  pin         TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX addresses_user_id_idx ON addresses (user_id);

-- Ensure at most one default address per user (partial unique index)
CREATE UNIQUE INDEX addresses_user_default_idx ON addresses (user_id) WHERE is_default = true;
