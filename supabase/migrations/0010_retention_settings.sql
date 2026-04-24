-- ============================================================
-- Migration 0010: Configurable retention settings
-- Adds admin-configurable retention windows and updates run_retention()
-- to use values from brand_settings.
-- ============================================================

INSERT INTO public.brand_settings (key, value)
VALUES
  ('retention_declined_months', '12'),
  ('retention_inactive_months', '24')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.run_retention()
RETURNS TABLE (anonymized_count bigint) LANGUAGE plpgsql AS $$
DECLARE
  v_count bigint := 0;
  v_declined_months integer := 12;
  v_inactive_months integer := 24;
BEGIN
  SELECT COALESCE(NULLIF(value, '')::integer, 12)
  INTO v_declined_months
  FROM public.brand_settings
  WHERE key = 'retention_declined_months';

  SELECT COALESCE(NULLIF(value, '')::integer, 24)
  INTO v_inactive_months
  FROM public.brand_settings
  WHERE key = 'retention_inactive_months';

  v_declined_months := GREATEST(1, v_declined_months);
  v_inactive_months := GREATEST(1, v_inactive_months);

  WITH targets AS (
    SELECT id FROM public.leads
    WHERE anonymized_at IS NULL
      AND (
        (status = 'declined' AND updated_at < now() - make_interval(months => v_declined_months))
        OR (updated_at < now() - make_interval(months => v_inactive_months))
      )
  ),
  anonymized AS (
    UPDATE public.leads l
    SET name = 'Anonymized',
        email = NULL,
        phone = NULL,
        municipality = NULL,
        organization = NULL,
        idea_summary = NULL,
        notes = NULL,
        tags = '{}',
        anonymized_at = now()
    WHERE l.id IN (SELECT id FROM targets)
    RETURNING l.id
  )
  SELECT count(*) INTO v_count FROM anonymized;

  UPDATE public.messages m
  SET content = '[redacted]'
  FROM public.conversations c
  JOIN public.leads l ON l.id = c.lead_id
  WHERE m.conversation_id = c.id
    AND l.anonymized_at IS NOT NULL
    AND m.content <> '[redacted]';

  UPDATE public.conversations c
  SET extracted_data = '{}'::jsonb
  FROM public.leads l
  WHERE c.lead_id = l.id
    AND l.anonymized_at IS NOT NULL
    AND c.extracted_data <> '{}'::jsonb;

  anonymized_count := v_count;
  RETURN NEXT;
END $$;
