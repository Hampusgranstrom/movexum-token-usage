-- ============================================================
-- Migration 0007: Retention & anonymization
-- Nulls out PII on old leads. Default policy:
--   declined leads  -> anonymize after 12 months
--   all other leads -> anonymize after 24 months of inactivity
-- Run via GET /api/admin/retention (superadmin) or a cron/Edge
-- schedule that calls public.run_retention().
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

CREATE OR REPLACE FUNCTION public.run_retention()
RETURNS TABLE (anonymized_count bigint) LANGUAGE plpgsql AS $$
DECLARE
  v_count bigint := 0;
BEGIN
  WITH targets AS (
    SELECT id FROM public.leads
    WHERE anonymized_at IS NULL
      AND (
        (status = 'declined' AND updated_at < now() - interval '12 months')
        OR (updated_at < now() - interval '24 months')
      )
  ),
  anonymized AS (
    UPDATE public.leads l
    SET name = 'Anonymized',
        email = NULL,
        phone = NULL,
        organization = NULL,
        idea_summary = NULL,
        notes = NULL,
        tags = '{}',
        anonymized_at = now()
    WHERE l.id IN (SELECT id FROM targets)
    RETURNING l.id
  )
  SELECT count(*) INTO v_count FROM anonymized;

  -- Also scrub the raw messages that backed the above leads
  UPDATE public.messages m
  SET content = '[redacted]'
  FROM public.conversations c
  JOIN public.leads l ON l.id = c.lead_id
  WHERE m.conversation_id = c.id
    AND l.anonymized_at IS NOT NULL
    AND m.content <> '[redacted]';

  -- Scrub extracted_data as well
  UPDATE public.conversations c
  SET extracted_data = '{}'::jsonb
  FROM public.leads l
  WHERE c.lead_id = l.id
    AND l.anonymized_at IS NOT NULL
    AND c.extracted_data <> '{}'::jsonb;

  anonymized_count := v_count;
  RETURN NEXT;
END $$;
