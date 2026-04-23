# ROADMAP — Movexum Startupkompass

Från dagens beta till ett internationellt ledande inflödesverktyg. Fyra faser:

- **Fas 0** — Produktionshärdning (2 veckor)
- **Fas 1** — Dynamiska moduler per målgrupp (3 veckor)
- **Fas 2** — Frågemotor + A/B-test + analytics (3 veckor)
- **Fas 3** — Integrationer + grundarportal + skalbarhet (4 veckor)
- **Fas 4** — Differentieringsfeatures som gör det världsledande (löpande)

---

## Fas 0 — Produktionshärdning

**Mål:** Från "fungerar i dev" till "fungerar i prod under tillsyn, uppfyller GDPR/OWASP/AI Act".

### 0.1 Säkerhetshygien
- **CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy** via `src/middleware.ts`. CSP-nonce för eventuella inline-script.
- **Rate limiting** på `/api/chat` och `/api/admin/users` (invite) via Upstash Redis eller Supabase Edge. 10 req/min per IP på chat, 5/min på invite.
- **2FA** för superadmin — kräver Supabase MFA-aktivering; bygg UI för enrollment i `/admin/security`.
- **Secret rotation rutine** dokumenteras; alla nycklar byts innan go-live.
- **Dependabot + `npm audit --production`** i CI.
- **Sentry** för error tracking + source maps, PII-redaktion aktiverad (`beforeSend`).

### 0.2 Juridik och spårbarhet
- Skapa `/docs/rop-record.md`, `/docs/dpia.md`, `/docs/threat-model.md`, `/docs/model-card.md`, `/docs/incident-response.md` enligt mallar.
- Signera DPA med Anthropic och Supabase.
- `consent_events`-tabell (`id, lead_id, module_slug, consent_text_version, accepted_at, ip_hash, user_agent_hash`). Chatten blockeras tills consent-knappen klickats.
- `security_events`-tabell (`id, actor_id, event_type, metadata jsonb, created_at, ip_hash`) — logga login, invite, role_change, delete, logo_upload, lead_export, lead_delete.
- **Anonymiserings-jobb** (Supabase Edge scheduled function) som tar `leads` äldre än retentiongräns och nullar PII-fält.
- **DSR-UI** i `/admin/leads/[id]`: "Exportera JSON" + "Radera permanent" (superadmin-only, loggas).

### 0.3 Tillgänglighet och kvalitet
- Lägg till `label`, `aria-live` på chatten. Kör axe-core i CI.
- **Vitest + Testing Library** för komponenter (≥50% täckning på `src/lib/` och API-routes).
- **Playwright** för 5 flöden: founder-chat, admin-login, invite→accept, lead-status-change, brand-upload.
- `npm run typecheck && npm run lint && npm test && npm run build` i GitHub Actions på varje PR.

### 0.4 Observability
- **Structured logging** via pino eller Next.js built-in, PII-redaction på väg ut.
- **Uptime-monitoring** (BetterStack / UptimeRobot) på `/api/health`.
- `/api/health` endpoint: kollar Supabase + Anthropic-reachability, returnerar 200/503.

### 0.5 Infrastruktur
- Hosting: Vercel (EU-region) eller själv-hostad Next.js på Hetzner (EU).
- Supabase projekt i EU-region.
- Custom domain + HTTPS, HSTS preload.
- Backups: Supabase PITR 7 dagar (paid).

**Leveransmått:** pen-test-rapport från extern part, CSP utan warnings, axe score ≥95, 0 vulns i `npm audit`.

---

## Fas 1 — Dynamiska moduler per målgrupp (`/m/<slug>`)

**Mål:** En intake-URL per målgrupp med egen framtoning, systemprompt, fälturval, lead-källa och samtyckestext.

### Användningsfall
- `/m/founders` — klassiskt grundar-intag (default)
- `/m/investors` — investerare söker portfolio-översikt
- `/m/partners` — partnerorganisationer (offentliga, akademi)
- `/m/ideas` — öppen idé-inlämning för idéstadium
- `/m/event-x` — tillfälliga URL för en specifik mässa/kampanj (UTM automatiskt)

### Datamodell (migration `0005_modules.sql`)

```sql
create table public.modules (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  description       text,
  target_audience   text,                                -- 'founders', 'investors', 'partners', 'custom'
  welcome_title     text,
  welcome_body      text,
  system_prompt     text not null,
  lead_source_id    text references lead_sources(id),    -- default-källa
  consent_text      text not null,
  consent_version   integer not null default 1,
  theme_overrides   jsonb default '{}',                  -- accent-färg, hero-bild, etc.
  is_active         boolean not null default true,
  require_email     boolean not null default true,
  require_phone     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id)
);

create table public.consent_events (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid references leads(id) on delete cascade,
  module_id         uuid references modules(id),
  consent_version   integer not null,
  accepted_at       timestamptz not null default now(),
  ip_hash           text,       -- sha256 av IP+salt
  user_agent_hash   text
);

-- Utöka leads med module-koppling
alter table public.leads
  add column module_id uuid references modules(id);
create index leads_module_id_idx on public.leads (module_id);
```

### Routing och UI
- `src/app/m/[slug]/page.tsx` — server-komponent som hämtar modulen och renderar `<ModuleIntake>`.
- `<ModuleIntake>` tar promptversion + consent-text + theme och visar anpassad hero-header + chatt.
- `src/app/api/chat/route.ts` utvidgas: `moduleId` i body → hämtar modulens `system_prompt` istället för det globala.
- 404 om modul saknas eller `is_active=false`.

### Admin-CRUD
- `/admin/modules` — listar moduler, duplicera, aktivera/avaktivera.
- `/admin/modules/[id]` — wizard: grundinfo → systemprompt (med preview) → consent → tema → fälturval → aktivera.
- `/admin/modules/[id]/preview` — riggar upp modulen i en sandbox utan att skriva till DB.

### URL-policyer
- Slug: `[a-z0-9-]{3,40}`.
- Reserverade slugs: `admin`, `api`, `login`, `chat`, `accept-invite`.
- Mjuka redirects från gammalt `/chat` → `/m/founders` (default-modul).

---

## Fas 2 — Frågemotor + A/B-test + analytics

**Mål:** Istället för bara en AI-prompt kan varje modul ha en strukturerad frågelista där varje fråga kan A/B-testas och alla svar statistikförs.

### Designprincip
En modul kan köra i tre lägen:
1. **Pure AI** (som idag): bara systemprompt, Claude styr samtalet.
2. **Hybrid**: AI-samtal tills definierade `key_fields` är besvarade; sedan byts till strukturerad form.
3. **Wizard**: ren form-baserad, ingen LLM — för entreprenörer som föredrar struktur.

### Datamodell (migration `0006_question_engine.sql`)

```sql
create type question_type as enum (
  'short_text','long_text','email','phone','url',
  'single_choice','multi_choice','number','scale_1_5','file_upload','consent'
);

create table public.question_sets (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references modules(id) on delete cascade,
  name              text not null,
  ordering          text not null default 'linear',     -- 'linear' | 'branching' | 'adaptive'
  is_active         boolean not null default true
);

create table public.questions (
  id                uuid primary key default gen_random_uuid(),
  question_set_id   uuid not null references question_sets(id) on delete cascade,
  key               text not null,                       -- 'idea_summary', 'market_size', ...
  display_order     integer not null,
  type              question_type not null,
  required          boolean not null default false,
  help_text         text,
  options           jsonb default '[]',                  -- för single/multi choice
  validation        jsonb default '{}',                  -- min/max, regex
  depends_on        jsonb default '[]',                  -- [{question_key, equals}]
  created_at        timestamptz not null default now()
);

create table public.question_variants (
  id                uuid primary key default gen_random_uuid(),
  question_id       uuid not null references questions(id) on delete cascade,
  label             text not null,                       -- 'control', 'friendly', 'direct'
  text              text not null,
  weight            integer not null default 50,         -- 0-100, summan per fråga = 100
  is_control        boolean not null default false,
  started_at        timestamptz default now(),
  ended_at          timestamptz,
  created_at        timestamptz not null default now()
);

create table public.question_responses (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid references leads(id) on delete cascade,
  question_id       uuid not null references questions(id),
  variant_id        uuid references question_variants(id),
  answer            jsonb,                               -- typ-specifik
  response_time_ms  integer,
  skipped           boolean not null default false,
  created_at        timestamptz not null default now()
);

create table public.module_sessions (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references modules(id),
  session_id        text not null,                       -- från client (samma som conversations.session_id)
  started_at        timestamptz not null default now(),
  completed_at     timestamptz,
  abandoned_at     timestamptz,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  referer          text,
  device_hash      text,
  locale           text
);

create index qr_question_idx on question_responses (question_id, created_at desc);
create index qr_lead_idx     on question_responses (lead_id);
create index ms_module_idx   on module_sessions (module_id, started_at desc);
```

### Variant-tilldelning
- Deterministisk hash av `(session_id, question_id, experiment_salt)` → välj variant baserat på kumulativ weight. Samma användare får samma variant om hen kommer tillbaka inom samma session.
- Spara alltid `variant_id` på `question_responses` — utan det är A/B-datat värdelöst.

### Statistik-endpoints
- `GET /api/admin/modules/[id]/stats` — summerar:
  - Total views, completions, completion rate, median time-to-complete
  - Per fråga: visningar, svar, skip rate, avg response time
  - Per variant: visningar, svar, conversion rate (definierat per experiment som "nådde slutet" eller "blev accepted")
  - Trender: 7/30-dagarsgraf, källfördelning
- Materialiserad vy för prestanda: `refresh materialized view concurrently module_stats_daily`.

### A/B-analys
- Enkel Bayesian A/B-beräknare (Beta-Binomial conjugate prior) server-side — inga externa bibliotek.
- UI visar: *"Variant B har 87% sannolikhet att slå control med +14% relativ lyft."*
- Autowinner: när sannolikhet > 95% och minsta urval ≥ 200 per variant → markera vinnare, routa 100% trafik dit (men lämna loser öppet för manuell stänkning).

### Admin-UI
- `/admin/modules/[id]/questions` — drag-and-drop ordning, nya frågor, duplicera, förhandsgranska.
- `/admin/modules/[id]/experiments` — starta A/B, ge varianter namn, justera weights, se live-stats.
- `/admin/insights` — överblick över alla moduler: vilka frågor har högst skip rate, vilka variant-vinster finns outnyttjade.

---

## Fas 3 — Integrationer + grundarportal + skalbarhet

### Grundarportal (`/founders/[token]`)
- Magic-link per lead: "Uppdatera min idé", "Se status", "Ladda upp pitch deck".
- Ingen egen inloggning, ingen `app_user` — bara en signerad token per lead med TTL.
- GDPR-vänligt: grundaren ser sin egen data, kan be om radering.

### E-post och notiser
- Transaktionella via Resend eller AWS SES (DPA i EU).
- Trigger: status-byte → e-post till grundare (AI-drafted, människa godkänner eller auto-sänder beroende på status).
- Admin får daglig digest eller Slack-notis på nya leads med `score >= 75`.

### Integrationer
- **Slack** — notiser via inkommande webhook. Superadmin konfigurerar URL i `/admin/integrations`.
- **Calendar** — Cal.com eller Google Calendar-integration: när status sätts till `meeting-booked` öppnas en embeddad bokning för grundaren.
- **HubSpot / Pipedrive** — valfri envägssyncning av accepted leads.
- **Zapier/Make webhook-out** — send lead events till valfritt system.
- **Webhook-in** — externa event kan skapa leads (t.ex. eventplattform efter registrering).

### Filuppladdning
- Supabase Storage-bucket `pitch-decks`, signed URLs, max 20 MB, virusskanning via clamav Edge Function.
- Lead-detail visar "Pitch deck" som pdf preview.

### Dedupe
- Normalisera e-post (lowercase, strippa `+tag`), telefon (E.164), orgnummer. Flagga duplicates i UI — "Matchar lead X från 2026-01-15". Ingen auto-merge.

### Skalbarhet
- Supabase connection pooling via pgbouncer.
- Stream Claude-svar (Server-Sent Events) → lägre TTFB.
- Edge functions för cron-jobb (anonymisering, stats-refresh).
- CDN-cacha publika moduler (`/m/<slug>`-HTML kan cache:as 60 s, klient-logik läser live state).

---

## Fas 4 — Differentiering som gör det världsledande

Dessa är förslag, prioriteras separat mot faktiska användarbehov.

### 4.1 Intelligens och matchning
- **Auto-matchning mot mentorer.** När en accepted lead sparas → AI matchar mot en interndatabas av Movexum-mentorers expertområden, föreslår top-3.
- **Similaritet mot portfolio.** Embeddings på idea_summary → hitta existerande portföljbolag som liknar → admin ser "liknande bolag" i lead-detail.
- **Trendanalys.** Veckorapport: *"Denna vecka såg vi 40% fler AI-relaterade idéer än snittet"* — AI-genererad från senaste periodens data.
- **Automatisk summering.** På lead-detail: 2-raders sammanfattning av hela chatten, auto-uppdaterad.
- **Smart follow-up.** Om lead stått i `contacted` > 7 dagar → AI föreslår e-post-utkast anpassat efter senaste chattinnehåll.

### 4.2 Flerspråkighet
- Modulen har `supported_locales: ['sv','en']`, UI auto-detekterar. System-prompten översätts och versioneras per locale.
- Claude hanterar språken inbyggt i svaret; vår egen UI-text kommer från i18n-bundlar (next-intl).

### 4.3 Embed + multichannel
- **Embed widget** — en `<script>`-tag som bäddar chatten på extern sajt (t.ex. partnerns webbsida), bundled som ESM, kontextsbevarad via `postMessage`.
- **QR-koder** — generera per-event-slug + QR automatiskt i admin; kolla in-flöde per QR.
- **E-post-intake** — unik mailadress per modul; inkommande mail parsas till lead.

### 4.4 Kvalitetsloop
- **Admin-feedback på score.** "Tummen upp / ned" per AI-bedömning. Används som reinforcement-signal för promptoptimering (människa-in-loopen).
- **Prompt-version-A/B.** Två systemprompts kör parallellt; efter 100 leads på var variant visas admin vilken som gav högre team-bedömd kvalitet.
- **Public showcase (opt-in).** Accepted grundare kan välja att visa anonymiserad beskrivning i en publik "Ideas vi tror på"-lista — skapar social proof och inspirerar fler.

### 4.5 Tillitsfeatures
- **Transparent AI.** Lead-detail visar promptversion + modellversion + Claude-responser ord-för-ord. Inget svart-box-hallå.
- **Explainability.** `score_reasoning` delas upp i fyra delpoäng (idé-tydlighet, marknad, grundarmognad, fit) — inte bara ett tal.
- **Audit log per lead.** Vem såg, vem ändrade, när.
- **Data portability self-service.** Admin exporterar hela sitt data-set via 1-klick i superadmin.

### 4.6 Gemenskap
- **Nyhetsbrev-intag per modul.** Grundare kan välja att få månadsrapport från Movexum.
- **Matchning grundare-grundare.** Opt-in "vi vill träffa andra grundare inom X" → AI-matchning inom poolen.

### 4.7 Enterprise-readiness (om ni säljer vidare)
- **Multi-tenant** — en instans, flera inkubatorer; `tenants`-tabell + RLS-policy.
- **SSO** via Supabase OAuth (Google Workspace, Entra ID).
- **SCIM provisioning** för stora kunder.
- **Vit etikettering** — `brand_settings` per tenant.
- **SLA + support-tier** — drift-SLO 99.9%, pagerduty-rotation.

---

## Tidslinje och prioritering

| Vecka | Fas 0 | Fas 1 | Fas 2 | Fas 3 | Fas 4 |
|---|---|---|---|---|---|
| 1–2 | Säkerhet, juridik, testning, observability | | | | |
| 3 | | Modul-schema, routing, admin-CRUD | | | |
| 4 | | Styling/theming per modul, consent | | | |
| 5 | | Migreringar, soft-launch på `/m/founders` | | | |
| 6 | | | Frågeschema, variant-tilldelning | | |
| 7 | | | Stats-views, A/B Bayesian | | |
| 8 | | | Admin-UI för frågor + experiment | | |
| 9 | | | | Grundarportal, e-post, dedup | | 
| 10 | | | | Filuppladdning, integrationer | |
| 11 | | | | Skalbarhet, streaming | |
| 12+ | | | | | Intelligensfeatures löpande |

---

## Success-metrics

Mäts via `module_stats`-views + produktsamtal:

**Kvantitativt**
- Median time-to-complete < 4 min för founder-modulen
- Completion rate (startad chatt → lead skapad) > 60%
- Accept rate (antal accepted / totalt leads) som funktion av vilka moduler som bidrar — mäter kvalitet
- NPS från grundare (eget mini-NPS-steg i slutet av chatten) > 40
- Admin-nöjdhet (kvartalsenkät) > 8/10

**Kvalitativt**
- Zero data incidents efter fas 0
- Inga klagomål till IMY
- Inga kända OWASP-sårbarheter över "Medium"

---

## Beslutsregler under resan

- **Inte bygga:** allt som inte mäter eller inte löser ett konkret användarproblem.
- **Bygga:** när vi har minst 3 riktiga förfrågningar eller en observerad problem-data-point.
- **Kill switch:** varje modul har `is_active`-flagga. Varje feature har en flagga i `feature_flags`-tabell.
- **Rollback:** varje migration har `DROP`-counterpart dokumenterad i samma fil som kommentar.

---

*Roadmappen är hypotes. Uppdatera i slutet av varje fas baserat på vad vi faktiskt lärt oss.*
