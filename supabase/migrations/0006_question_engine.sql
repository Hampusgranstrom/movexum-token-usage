-- ============================================================
-- Migration 0006: Question engine + A/B variants + analytics
-- ============================================================

-- 1. Enum for question types ---------------------------------
DO $$ BEGIN
  CREATE TYPE public.question_type AS ENUM (
    'short_text',
    'long_text',
    'email',
    'phone',
    'url',
    'single_choice',
    'multi_choice',
    'number',
    'scale_1_5',
    'consent'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. question_sets -------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  name        text NOT NULL,
  ordering    text NOT NULL DEFAULT 'linear'
              CHECK (ordering IN ('linear','branching','adaptive')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_sets_module_idx ON public.question_sets (module_id);

DROP TRIGGER IF EXISTS question_sets_set_updated_at ON public.question_sets;
CREATE TRIGGER question_sets_set_updated_at
  BEFORE UPDATE ON public.question_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. questions -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id   uuid NOT NULL REFERENCES public.question_sets(id) ON DELETE CASCADE,
  key               text NOT NULL,                    -- 'idea_summary', 'market_size', ...
  display_order     integer NOT NULL,
  type              public.question_type NOT NULL,
  required          boolean NOT NULL DEFAULT false,
  help_text         text,
  options           jsonb NOT NULL DEFAULT '[]',      -- for single/multi choice
  validation        jsonb NOT NULL DEFAULT '{}',      -- { min, max, regex, maxLength }
  depends_on        jsonb NOT NULL DEFAULT '[]',      -- [{ question_key, equals }]
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_set_id, key)
);

CREATE INDEX IF NOT EXISTS questions_set_idx ON public.questions (question_set_id, display_order);

DROP TRIGGER IF EXISTS questions_set_updated_at ON public.questions;
CREATE TRIGGER questions_set_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. question_variants ---------------------------------------
CREATE TABLE IF NOT EXISTS public.question_variants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label        text NOT NULL,                     -- 'control', 'friendly', 'direct'
  text         text NOT NULL,
  help_text    text,
  weight       integer NOT NULL DEFAULT 50
               CHECK (weight >= 0 AND weight <= 100),
  is_control   boolean NOT NULL DEFAULT false,
  started_at   timestamptz DEFAULT now(),
  ended_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_variants_qid_idx ON public.question_variants (question_id);

-- 5. module_sessions -----------------------------------------
CREATE TABLE IF NOT EXISTS public.module_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id         uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  session_id        text NOT NULL,
  lead_id           uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  abandoned_at      timestamptz,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  referer           text,
  locale            text,
  ip_hash           text,
  user_agent_hash   text,
  UNIQUE (module_id, session_id)
);

CREATE INDEX IF NOT EXISTS module_sessions_module_idx ON public.module_sessions (module_id, started_at DESC);
CREATE INDEX IF NOT EXISTS module_sessions_session_idx ON public.module_sessions (session_id);

-- 6. question_responses --------------------------------------
CREATE TABLE IF NOT EXISTS public.question_responses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        text NOT NULL,
  lead_id           uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  question_id       uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  variant_id        uuid REFERENCES public.question_variants(id) ON DELETE SET NULL,
  answer            jsonb,
  response_time_ms  integer,
  skipped           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_question_idx ON public.question_responses (question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qr_session_idx  ON public.question_responses (session_id);
CREATE INDEX IF NOT EXISTS qr_lead_idx     ON public.question_responses (lead_id);
CREATE INDEX IF NOT EXISTS qr_variant_idx  ON public.question_responses (variant_id);

-- 7. RPCs for module stats -----------------------------------

-- Funnel per module: started, completed, abandoned, completion_rate
CREATE OR REPLACE FUNCTION public.get_module_funnel(p_module_id uuid, p_since date DEFAULT NULL)
RETURNS TABLE (started bigint, completed bigint, abandoned bigint, completion_rate numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*)::bigint AS started,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::bigint AS completed,
    COUNT(*) FILTER (WHERE abandoned_at IS NOT NULL)::bigint AS abandoned,
    CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE completed_at IS NOT NULL))::numeric / COUNT(*)::numeric
      ELSE 0
    END AS completion_rate
  FROM public.module_sessions
  WHERE module_id = p_module_id
    AND (p_since IS NULL OR started_at::date >= p_since);
$$;

-- Per-question stats: shown, answered, skipped, avg response time
CREATE OR REPLACE FUNCTION public.get_module_question_stats(p_module_id uuid, p_since date DEFAULT NULL)
RETURNS TABLE (
  question_id uuid,
  question_key text,
  answered bigint,
  skipped bigint,
  avg_ms numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    q.id AS question_id,
    q.key AS question_key,
    COUNT(qr.id) FILTER (WHERE qr.skipped = false)::bigint AS answered,
    COUNT(qr.id) FILTER (WHERE qr.skipped = true)::bigint  AS skipped,
    COALESCE(AVG(qr.response_time_ms) FILTER (WHERE qr.skipped = false), 0)::numeric AS avg_ms
  FROM public.questions q
  JOIN public.question_sets qs ON qs.id = q.question_set_id
  LEFT JOIN public.question_responses qr ON qr.question_id = q.id
    AND (p_since IS NULL OR qr.created_at::date >= p_since)
  WHERE qs.module_id = p_module_id
  GROUP BY q.id, q.key
  ORDER BY q.display_order;
$$;

-- Variant stats for a question: shown, answered, conversion (answered)
CREATE OR REPLACE FUNCTION public.get_question_variant_stats(p_question_id uuid, p_since date DEFAULT NULL)
RETURNS TABLE (
  variant_id uuid,
  label text,
  is_control boolean,
  shown bigint,
  answered bigint,
  skipped bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    v.id AS variant_id,
    v.label,
    v.is_control,
    (COUNT(qr.id))::bigint AS shown,
    COUNT(qr.id) FILTER (WHERE qr.skipped = false)::bigint AS answered,
    COUNT(qr.id) FILTER (WHERE qr.skipped = true)::bigint  AS skipped
  FROM public.question_variants v
  LEFT JOIN public.question_responses qr ON qr.variant_id = v.id
    AND (p_since IS NULL OR qr.created_at::date >= p_since)
  WHERE v.question_id = p_question_id
  GROUP BY v.id, v.label, v.is_control
  ORDER BY v.is_control DESC, v.label ASC;
$$;

-- 8. RLS -----------------------------------------------------
ALTER TABLE public.question_sets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_variants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_anon_question_sets"      ON public.question_sets;
DROP POLICY IF EXISTS "block_anon_questions"          ON public.questions;
DROP POLICY IF EXISTS "block_anon_question_variants"  ON public.question_variants;
DROP POLICY IF EXISTS "block_anon_module_sessions"    ON public.module_sessions;
DROP POLICY IF EXISTS "block_anon_question_responses" ON public.question_responses;

CREATE POLICY "block_anon_question_sets"      ON public.question_sets      FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_questions"          ON public.questions          FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_question_variants"  ON public.question_variants  FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_module_sessions"    ON public.module_sessions    FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_question_responses" ON public.question_responses FOR ALL TO anon, authenticated USING (false);
