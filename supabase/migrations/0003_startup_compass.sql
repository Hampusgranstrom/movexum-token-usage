-- ============================================================
-- Migration 0003: Startup Compass
-- Drops old token-usage tables and creates the new lead-intake
-- schema for Movexum Startupkompass.
-- ============================================================

-- 1. Drop old objects ----------------------------------------
DROP TABLE IF EXISTS public.token_usage_events;
DROP TABLE IF EXISTS public.token_usage_daily;
DROP FUNCTION IF EXISTS public.get_daily_usage(date);

-- Keep set_updated_at() — we reuse it below.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Lead sources (lookup) -----------------------------------
CREATE TABLE public.lead_sources (
  id          text        PRIMARY KEY,
  label       text        NOT NULL,
  icon        text,
  color       text,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.lead_sources (id, label, icon, color, sort_order) VALUES
  ('event',        'Event',            'Calendar',  '#FACC15', 0),
  ('web',          'Webbformulär',     'Globe',     '#22D3EE', 1),
  ('social-media', 'Sociala medier',   'Share2',    '#A78BFA', 2),
  ('referral',     'Rekommendation',   'Users',     '#4ADE80', 3),
  ('conversation', 'Samtal',           'Phone',     '#FB923C', 4),
  ('ai-chat',      'AI-intag',         'Sparkles',  '#F472B6', 5);

-- 3. Leads ---------------------------------------------------
CREATE TABLE public.leads (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),

  -- Contact
  name            text          NOT NULL,
  email           text,
  phone           text,
  organization    text,

  -- Idea
  idea_summary    text,
  idea_category   text,

  -- Source tracking
  source_id       text          NOT NULL REFERENCES public.lead_sources(id),
  source_detail   text,

  -- Funnel
  status          text          NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','meeting-booked','evaluating','accepted','declined')),

  -- Scoring
  score           integer       CHECK (score >= 0 AND score <= 100),
  score_reasoning text,

  -- Assignment & notes
  assigned_to     text,
  notes           text,
  tags            text[]        DEFAULT '{}'
);

CREATE INDEX leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX leads_source_id_idx  ON public.leads (source_id);
CREATE INDEX leads_status_idx     ON public.leads (status);
CREATE INDEX leads_score_idx      ON public.leads (score DESC NULLS LAST);

CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Conversations -------------------------------------------
CREATE TABLE public.conversations (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               uuid          REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  session_id            text          NOT NULL,
  language              text          NOT NULL DEFAULT 'sv',
  extracted_data        jsonb         DEFAULT '{}',
  total_input_tokens    integer       NOT NULL DEFAULT 0,
  total_output_tokens   integer       NOT NULL DEFAULT 0
);

CREATE INDEX conversations_lead_id_idx    ON public.conversations (lead_id);
CREATE INDEX conversations_session_id_idx ON public.conversations (session_id);
CREATE INDEX conversations_created_at_idx ON public.conversations (created_at DESC);

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Messages ------------------------------------------------
CREATE TABLE public.messages (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid          NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  role              text          NOT NULL CHECK (role IN ('system','user','assistant')),
  content           text          NOT NULL,
  input_tokens      integer       DEFAULT 0,
  output_tokens     integer       DEFAULT 0
);

CREATE INDEX messages_conversation_id_idx ON public.messages (conversation_id, created_at ASC);

-- 6. Analytics events ----------------------------------------
CREATE TABLE public.analytics_events (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz   NOT NULL DEFAULT now(),
  event_type  text          NOT NULL,
  lead_id     uuid          REFERENCES public.leads(id) ON DELETE SET NULL,
  metadata    jsonb         DEFAULT '{}'
);

CREATE INDEX analytics_events_type_idx       ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX analytics_events_lead_id_idx    ON public.analytics_events (lead_id);
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at DESC);

-- 7. RPC functions -------------------------------------------

-- Leads per day per source
CREATE OR REPLACE FUNCTION public.get_leads_per_day(since date)
RETURNS TABLE (day date, source_id text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    source_id,
    COUNT(*)::bigint
  FROM public.leads
  WHERE (created_at AT TIME ZONE 'UTC')::date >= since
  GROUP BY day, source_id
  ORDER BY day ASC, source_id;
$$;

-- Funnel counts
CREATE OR REPLACE FUNCTION public.get_funnel_counts()
RETURNS TABLE (status text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT status, COUNT(*)::bigint
  FROM public.leads
  GROUP BY status;
$$;

-- Source performance
CREATE OR REPLACE FUNCTION public.get_source_summary(since date)
RETURNS TABLE (source_id text, total bigint, with_meeting bigint, accepted bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    source_id,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status IN ('meeting-booked','evaluating','accepted'))::bigint AS with_meeting,
    COUNT(*) FILTER (WHERE status = 'accepted')::bigint AS accepted
  FROM public.leads
  WHERE (created_at AT TIME ZONE 'UTC')::date >= since
  GROUP BY source_id;
$$;

-- 8. Row-Level Security --------------------------------------

ALTER TABLE public.lead_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. Block anon + authenticated.
CREATE POLICY "block_anon_lead_sources"     ON public.lead_sources     FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_leads"            ON public.leads            FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_conversations"    ON public.conversations    FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_messages"         ON public.messages         FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_analytics_events" ON public.analytics_events FOR ALL TO anon, authenticated USING (false);
