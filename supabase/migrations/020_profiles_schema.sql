-- 020_profiles_schema.sql
--
-- Table: profiles
-- Extends auth.users with application-level profile data: display_name,
-- avatar_url, and reward_points.
-- Required by:
--   • create_order_with_items RPC (migration 018) — reads profiles.reward_points
--   • Reviews (migration 001) — joins profiles.display_name for reviewer name
--   • ProfilePage / useProfile hook — user account and reward points display

-- ── 1. Create table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  reward_points INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Enable Row Level Security ────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS Policies ─────────────────────────────────────────────────────────

-- Public read for display_name and avatar_url (needed for reviews display)
-- Or owner-only read. For reviews join, anyone can read profiles.
DO $$ BEGIN
  CREATE POLICY "profiles: public read"
    ON public.profiles FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can update their own profile
DO $$ BEGIN
  CREATE POLICY "profiles: user updates own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Trigger to automatically create a profile for new users ──────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Backfill profiles for existing auth.users ─────────────────────────────

INSERT INTO public.profiles (id, display_name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
