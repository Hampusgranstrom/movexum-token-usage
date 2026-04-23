-- ============================================================
-- Migration 0005: Partner logos (kommuner/medfinansiärer)
-- Adds a CMS-style list of partner logos that are rendered in
-- a carousel on the public pages. Superadmins manage entries
-- from /admin/partners. Uploaded images live in the public
-- Supabase Storage bucket "partners".
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_logos (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text          NOT NULL,
  logo_path   text,
  url         text,
  sort_order  integer       NOT NULL DEFAULT 0,
  active      boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now(),
  updated_by  uuid          REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS partner_logos_sort_idx
  ON public.partner_logos (sort_order, created_at);

CREATE INDEX IF NOT EXISTS partner_logos_active_idx
  ON public.partner_logos (active);

-- Reuse set_updated_at() from migration 0003.
DROP TRIGGER IF EXISTS partner_logos_set_updated_at ON public.partner_logos;
CREATE TRIGGER partner_logos_set_updated_at
  BEFORE UPDATE ON public.partner_logos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS ----------------------------------------------------
-- Partner logos are publicly readable (shown to anonymous
-- visitors on the intake page). Writes go through the API
-- layer using the service role, so we keep RLS locked down.
ALTER TABLE public.partner_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_partner_logos" ON public.partner_logos;
DROP POLICY IF EXISTS "block_write_partner_logos" ON public.partner_logos;

CREATE POLICY "read_partner_logos"
  ON public.partner_logos FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "block_write_partner_logos"
  ON public.partner_logos FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);
