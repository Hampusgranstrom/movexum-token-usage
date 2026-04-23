-- ============================================================
-- Migration 0005: Dynamic audience modules + consent + security log
-- ============================================================

-- 1. modules -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text UNIQUE NOT NULL
                    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  name              text NOT NULL,
  description       text,
  target_audience   text,                     -- 'founders' | 'investors' | 'partners' | 'event' | 'other'
  flow_type         text NOT NULL DEFAULT 'wizard'
                    CHECK (flow_type IN ('wizard','chat','hybrid')),
  welcome_title     text,
  welcome_body      text,
  system_prompt     text,
  consent_text      text NOT NULL,
  consent_version   integer NOT NULL DEFAULT 1,
  lead_source_id    text REFERENCES public.lead_sources(id),
  accent_color      text,                     -- hex, overrides theme accent
  hero_eyebrow      text,
  is_active         boolean NOT NULL DEFAULT true,
  require_email     boolean NOT NULL DEFAULT true,
  require_phone     boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS modules_slug_idx   ON public.modules (slug);
CREATE INDEX IF NOT EXISTS modules_active_idx ON public.modules (is_active);

DROP TRIGGER IF EXISTS modules_set_updated_at ON public.modules;
CREATE TRIGGER modules_set_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link leads to their module
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_module_id_idx ON public.leads (module_id);

-- Link conversations to their module
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;

-- 2. consent_events ------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  module_id         uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  session_id        text,
  consent_version   integer NOT NULL,
  consent_text      text NOT NULL,            -- snapshot of text at time of consent
  accepted_at       timestamptz NOT NULL DEFAULT now(),
  ip_hash           text,
  user_agent_hash   text
);

CREATE INDEX IF NOT EXISTS consent_events_session_idx ON public.consent_events (session_id);
CREATE INDEX IF NOT EXISTS consent_events_lead_idx    ON public.consent_events (lead_id);
CREATE INDEX IF NOT EXISTS consent_events_module_idx  ON public.consent_events (module_id);

-- 3. security_events -----------------------------------------
CREATE TABLE IF NOT EXISTS public.security_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  event_type  text NOT NULL,                  -- 'login','logout','invite','role_change','delete_user','delete_lead','export_lead','logo_upload','retention_run'
  target_id   text,
  metadata    jsonb DEFAULT '{}',
  ip_hash     text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_actor_idx ON public.security_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_type_idx  ON public.security_events (event_type, created_at DESC);

-- 4. feature_flags -------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT false,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS feature_flags_set_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_set_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.feature_flags (key, enabled, note) VALUES
  ('modules_wizard',  true,  'Enable wizard flow on /m/<slug>'),
  ('ab_autowinner',   false, 'Auto-switch to winning variant at 95% prob + n>=200')
ON CONFLICT (key) DO NOTHING;

-- 5. Seed default founders module mirroring current /chat ----
-- We insert only if not present.
DO $$
DECLARE
  v_prompt text := 'Du är en varm, nyfiken och kompetent rådgivare från Movexum – en inkubator i Gävleborg som hjälper entreprenörer att växa sina idéer. Ditt jobb är att utforska den som skriver till dig: deras idé, drivkraft, marknad, mognad och behov. Ställ en fråga i taget på svenska, bekräfta det du hör och visa att du förstår. Samla naturligt in namn, e-post och ev. telefonnummer under samtalets gång – aldrig mekaniskt. Undvik att ge råd om Movexums tjänster innan du förstått personens situation. Om du inte vet något, säg det ärligt.';
  v_consent text := 'Genom att fortsätta samtycker du till att Movexum behandlar de uppgifter du lämnar för att utvärdera din idé och kontakta dig. Du kan när som helst be om att få dina uppgifter raderade. Läs mer i vår integritetspolicy.';
BEGIN
  INSERT INTO public.modules (
    slug, name, description, target_audience, flow_type,
    welcome_title, welcome_body, system_prompt,
    consent_text, consent_version, lead_source_id, is_active
  ) VALUES (
    'founders',
    'Grundare',
    'Standardflöde för entreprenörer och idébärare.',
    'founders',
    'chat',
    'Hemmaplan för innovativa idéer',
    'Berätta om din idé så utforskar vi den tillsammans. Movexum erbjuder kostnadsfri rådgivning och stöd för idébärare i Gävleborg.',
    v_prompt,
    v_consent,
    1,
    'ai-chat',
    true
  ) ON CONFLICT (slug) DO NOTHING;
END $$;

-- 6. RLS -----------------------------------------------------
ALTER TABLE public.modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "block_anon_modules"         ON public.modules;
DROP POLICY IF EXISTS "block_anon_consent_events"  ON public.consent_events;
DROP POLICY IF EXISTS "block_anon_security_events" ON public.security_events;
DROP POLICY IF EXISTS "block_anon_feature_flags"   ON public.feature_flags;

CREATE POLICY "block_anon_modules"         ON public.modules         FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_consent_events"  ON public.consent_events  FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_security_events" ON public.security_events FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "block_anon_feature_flags"   ON public.feature_flags   FOR ALL TO anon, authenticated USING (false);
