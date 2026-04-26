-- ============================================================
-- Migration 0012: Theme settings for admin/public surfaces
-- Stores the current visual profile as movexum-tema and allows
-- selecting theme per surface.
-- ============================================================

INSERT INTO public.brand_settings (key, value)
VALUES
  (
    'themes',
    '[{"id":"movexum-tema","name":"Movexum-tema","description":"Nuvarande visuella profil för Movexum Startupkompass."}]'
  ),
  ('admin_theme_id', 'movexum-tema'),
  ('public_theme_id', 'movexum-tema')
ON CONFLICT (key) DO NOTHING;
