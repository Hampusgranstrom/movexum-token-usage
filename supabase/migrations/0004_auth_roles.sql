-- ============================================================
-- Migration 0004: Auth roles + brand settings
-- Adds role-based access (admin/superadmin) on top of Supabase
-- Auth, seeds hampus@movexum.se as superadmin, and a key/value
-- brand_settings table used to store the uploaded logo path.
-- ============================================================

-- 1. Role enum ----------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. app_users table -----------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
  id          uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text          NOT NULL UNIQUE,
  role        public.app_role NOT NULL DEFAULT 'admin',
  invited_by  uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_users_email_idx ON public.app_users (email);
CREATE INDEX IF NOT EXISTS app_users_role_idx  ON public.app_users (role);

-- Reuse set_updated_at() from migration 0003
DROP TRIGGER IF EXISTS app_users_set_updated_at ON public.app_users;
CREATE TRIGGER app_users_set_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Trigger: auto-create app_users row on auth.users insert --
-- Reads raw_user_meta_data->>'role' (set by the invite flow),
-- defaults to 'admin'. Hardcodes hampus@movexum.se as superadmin.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF NEW.email = 'hampus@movexum.se' THEN
    v_role := 'superadmin';
  ELSIF (NEW.raw_user_meta_data->>'role') = 'superadmin' THEN
    v_role := 'superadmin';
  ELSE
    v_role := 'admin';
  END IF;

  INSERT INTO public.app_users (id, email, role)
  VALUES (NEW.id, NEW.email, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Backfill: promote hampus if account already exists -------
DO $$
DECLARE
  v_id    uuid;
  v_email text := 'hampus@movexum.se';
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = v_email LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.app_users (id, email, role)
    VALUES (v_id, v_email, 'superadmin')
    ON CONFLICT (id) DO UPDATE SET role = 'superadmin', email = v_email;
  END IF;
END $$;

-- 5. Brand settings -----------------------------------------
-- Simple key/value table. We use it to store 'logo_path' (the
-- Supabase Storage path under the 'brand' bucket). Keeping it
-- generic lets us add things like 'product_name' later without
-- another migration.
CREATE TABLE IF NOT EXISTS public.brand_settings (
  key         text          PRIMARY KEY,
  value       text,
  updated_at  timestamptz   NOT NULL DEFAULT now(),
  updated_by  uuid          REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS brand_settings_set_updated_at ON public.brand_settings;
CREATE TRIGGER brand_settings_set_updated_at
  BEFORE UPDATE ON public.brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.brand_settings (key, value) VALUES
  ('logo_path', NULL),
  ('product_name', 'Startupkompass')
ON CONFLICT (key) DO NOTHING;

-- 6. RLS ----------------------------------------------------
ALTER TABLE public.app_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_settings  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_anon_app_users"      ON public.app_users;
DROP POLICY IF EXISTS "block_anon_brand_settings" ON public.brand_settings;

-- Service role bypasses RLS. Everyone else is blocked.
CREATE POLICY "block_anon_app_users"      ON public.app_users      FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_brand_settings" ON public.brand_settings FOR ALL TO anon, authenticated USING (false);
