# CLAUDE.md — Utvecklings- och efterlevnadsguide

Detta är arbetsregler för Movexum Startupkompass. Läs igenom innan du (som AI-assistent eller människa) gör ändringar. Den ersätter inte juridisk rådgivning men beskriver hur teamet tolkar och implementerar relevanta regelverk i kod.

---

## 1. Produktöversikt

Ett internt inflödesverktyg som Movexum (inkubator i Gävleborg) använder för att fånga och kvalificera idéer från entreprenörer. Publik AI-chatt (Claude Sonnet 4) samlar idé + kontaktuppgifter. Internt team hanterar leads i en skyddad dashboard. `hampus@movexum.se` är superadmin.

**Rollmatris**
| Roll | Får göra |
|---|---|
| Publik (inkl. grundare) | Använda `/chat` (och framtida `/m/<slug>`) |
| Admin | Se och hantera leads, dashboard |
| Superadmin | Allt admin + bjuda in/ta bort användare, ladda upp logotyp, skapa moduler och frågor |

---

## 2. GDPR — datahantering

### Personuppgifter vi behandlar
Direkta: namn, e-post, telefon, organisation.
Indirekta: idébeskrivning (kan innehålla PII), IP-adress (via Supabase Auth-loggar), chatt-innehåll, AI-bedömning/-score, tilldelning, anteckningar.

### Rättslig grund
- **Lead-intag via chatt:** berättigat intresse (Art. 6.1.f) med tydligt opt-out. Samtycke (Art. 6.1.a) används för eventuell marknadsföring — hållas separat.
- **Admin-inloggning:** avtal (Art. 6.1.b).

### Principer i kod
1. **Datasparsamhet.** Be inte om fler fält än vad som behövs per modul. Se `src/app/api/chat/route.ts` och extraktions-logiken.
2. **Ändamålsbegränsning.** Data från lead-chatt får inte återanvändas för AI-modellträning. Vi skickar inte data till Anthropic för träning (Anthropic API default).
3. **Samtycke dokumenteras.** Varje modul ska visa en `consent_note` innan insamling börjar. Klick/acceptans loggas i `consent_events`-tabellen (byggs i roadmap-fas 1).
4. **Retentions-policy.** Default: leads i `declined`-status anonymiseras efter 12 mån; andra leads anonymiseras 24 mån efter senaste aktivitet. Kör som nattlig Edge Function (roadmap-fas 2). Fält som raderas: `name`, `email`, `phone`, `organization`, `idea_summary` → null; ersätts av hash för dedup.
5. **DSR-flöden.** Superadmin-panel ska ha knappar för "Exportera" (Art. 15) och "Radera" (Art. 17) per lead. Radering är hård cascade över `leads`, `conversations`, `messages`, `question_responses`.
6. **Dataöverföring.** Anthropic (USA) — använd EU Data Residency endpoint när den finns; dokumentera SCC-avtal i DPA-biblan. Supabase kör i EU-region (`eu-central-1` eller `eu-west-1`).
7. **Personuppgiftsbiträde.** Anthropic och Supabase är biträden. Se till att DPA finns påtecknat innan produktionssläpp.
8. **Dataincident.** Loggning i `security_events`-tabell. Rutinen för 72-timmars-anmälan till IMY dokumenteras i `/docs/incident-response.md`.

### Kod-krav
- Logga **aldrig** PII i applog (`console.log`, felhantering). Använd `redactPII()`-hjälpare innan logg/telemetri.
- Validera e-post + telefon server-side innan skrivning.
- Kryptera `notes` i vila? — Supabase gör AES-256 at rest by default; för extra känsliga fält använd pgcrypto-kolumner.
- Minimera data i cookies. Supabase-session = HttpOnly, Secure, SameSite=Lax (default). Gör aldrig egen "remember me"-cookie med PII.

### Registerföring (Art. 30)
`/docs/rop-record.md` uppdateras vid nya fält eller nya integrationer. AI-assistenten ska påminna om detta i PR-kommentar om en migration lägger till personuppgiftsfält.

---

## 3. EU AI Act — riskklassning och transparens

Vårt system klassas som **begränsad risk** (Art. 50): chatbot som interagerar med fysiska personer. Lead-scoring är en profileringsåtgärd men **inte automatiskt beslut med rättsliga effekter**, eftersom en människa alltid utvärderar.

### Obligatoriska åtgärder
1. **Transparens.** Varje publik chatt måste visa "Du pratar med en AI-assistent" innan första frågan. Implementeras i `ChatUI` som persistent chip ovanför fältet.
2. **Utdata-märkning.** AI-genererad text som används i e-post eller exports måste märkas `AI-genererad` i metadata (t.ex. status change-mail som drafas av AI).
3. **Mänsklig tillsyn.** Ingen accept/decline-status får sättas automatiskt. `status=accepted` och `status=declined` kräver manuell knapptryck av admin. Förhindras i API:et.
4. **Loggning för granskning.** `conversations.extracted_data` + `messages` + `leads.score` + `score_reasoning` sparas i minst 6 månader så att bedömningar kan granskas.
5. **Model card.** `/docs/model-card.md` beskriver modell, prompt-version, utvärderingsmetod, kända fel och diskriminerings-mitigering.
6. **Bias-utvärdering.** Kör manuell stickprov var tredje månad: 20 slumpade leads per kön/språk/region → granska score-fördelning. Lägg till i onboarding-checklista för nytt promptversion.

### Förbjudet (Art. 5) — vi gör inte detta
- Social scoring utifrån beteende över tid.
- Biometriska kategoriseringar (kön, etnicitet, politisk åsikt).
- Manipulativa tekniker utöver normal UX.

Om någon frågar efter en sådan funktion — stoppa och eskalera.

---

## 4. OWASP — applikationssäkerhet

### OWASP Top 10 (web) — checklista för varje PR
- **A01 Broken access control.** Middleware + `requireRole` i alla admin-API. Självskydd mot att sista superadmin tas bort.
- **A02 Cryptographic failures.** Ingen egen kryptografi. Använd Supabase + Next.js defaults. HTTPS-only (sätts av värdplattformen).
- **A03 Injection.** Använd Supabase-klientens parametriserade queries — aldrig string-konkatenering in i `.rpc()`. LLM-input: se LLM Top 10.
- **A04 Insecure design.** RLS blockerar authenticated-rollen; service_role är enda väg in. Hotmodellering dokumenteras i `/docs/threat-model.md` (byggs).
- **A05 Security misconfiguration.** Ingen debug i prod. `next.config.mjs` har `poweredByHeader: false`. CSP-headers läggs till i `middleware.ts` (roadmap-fas 0).
- **A06 Vulnerable components.** `npm audit` körs i CI. Dependabot på. Ingen `^` på kritiska paket.
- **A07 Identification/auth.** Supabase hanterar lösenord, 2FA aktiveras för superadmin. Min 12 tecken, NIST-regler (ingen forcerad roterad komplexitet).
- **A08 Data integrity failures.** Subresource Integrity (SRI) för externa scripts. Just nu har vi inga externa scripts.
- **A09 Logging/monitoring.** `security_events`-tabell loggar login, logout, invite, delete, role_change, logo_upload. Integrera med Sentry för errors.
- **A10 SSRF.** Inga endpoints tar URL-input från user.

### OWASP LLM Top 10
- **LLM01 Prompt injection.** Systemprompten ska inte inkludera användarens text rått — den hålls i separata `user`-meddelanden. Extraktion av leaddata görs med separat Claude-call och `tool_use` istället för rå parsning av fri text. Filtrera bort "ignore previous instructions"-mönster i förbehandling? Nej — det är lågt värde; förlita oss istället på skild promptstruktur.
- **LLM02 Insecure output handling.** AI:ns svar renderas som text, aldrig som HTML. Skulle vi någon gång rendera markdown — använd whitelist-parser.
- **LLM03 Training data poisoning.** Vi tränar inte modellen.
- **LLM04 Model DoS.** Rate-limit per IP på `/api/chat` (saknas idag — byggs fas 0) via Upstash Redis eller Supabase Edge.
- **LLM05 Supply chain.** Lås `@anthropic-ai/sdk`-versionen, granska changelog vid uppdatering.
- **LLM06 Sensitive information disclosure.** Aldrig lämna ut andra leads i svaret. Systemprompten förbjuder explicit.
- **LLM07 Insecure plugin design.** Inga plugins ännu.
- **LLM08 Excessive agency.** AI:n får bara läsa (den kan inte skicka mail, skapa leads utan server-kontroll).
- **LLM09 Overreliance.** Scoring är rådgivande, inte beslutande (se AI Act).
- **LLM10 Model theft.** Inga modelvikter lokalt.

### Concrete controls
- CSP: `default-src 'self'; img-src 'self' data: https://*.supabase.co; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.anthropic.com; frame-ancestors 'none';`
- HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via middleware.
- Secrets: **aldrig** i kod. Alltid via env. `.env*` i `.gitignore`. Rotera vid incident.

---

## 5. Tillgänglighet — WCAG 2.2 AA

Ett publikt intag måste vara åtkomligt.
- Kontrast ≥ 4.5:1 för text, 3:1 för ikoner. Vår nya palett (`#0E3F52` på `#EAF5FA`) mäter 10.8:1. Accent `#38B4E3` på vit: 2.4:1 — **använd inte** på stora textytor, bara på knappar med `#FFF`-text eller som bakgrund bakom mörk text.
- All interaktiv UI nås via tangentbord, `:focus-visible` synlig.
- Formulär har `label`, felmeddelanden kopplas med `aria-describedby`.
- Chatt-bubblor har `role="log"` + `aria-live="polite"`.
- SVG-dekorativa element har `aria-hidden`.
- Testa med axe-core i CI (roadmap-fas 0).

---

## 6. AI-assistentens arbetsregler

Följande gäller när du (AI-assistent) jobbar i repot.

### Scope
- Håll förändringar minimalistiska. Ingen spekulativ refaktor.
- Inga nya beroenden utan att förklara i PR-beskrivningen. Motivera kostnad (bundle size, underhåll).
- Följ befintliga mönster: server_role bakom API-routes, RLS blockerar allt annat, `createServerClient` via cookies i middleware.

### Säkerhetsreflexer
- Nytt fält som kan vara PII? — Uppdatera `rop-record.md` i samma PR, föreslå redaction-regel.
- Ny extern tjänst? — Notera DPA-krav; om EU-överföring, notera SCC.
- Nytt admin-API? — `requireRole('superadmin')` i toppen, annars inget.
- Hanterar fri text från användare? — Behandla som osäker.

### När du är osäker
- Fråga med `AskUserQuestion` innan du kodar. Särskilt vid: schemaval, rollbehörigheter, data som kan vara personuppgifter, externa beroenden.

### Förbud
- Ingen `TODO: fix security later`.
- Ingen try/catch som sväljer fel utan logg.
- Ingen `any`-typ utan tydlig anledning.
- Inga `-- @ts-ignore` utan förklaring.
- Aldrig `console.log(lead)` eller liknande som kan läcka PII i prod-logg.

### När du committar
- Svensk eller engelsk prosa, inte imperativ utan subjekt. Förklara *varför*, inte bara *vad*.
- Commit-message-footer med Claude-session-länken.
- Skapa **aldrig** PR utan uttryckligt tillstånd från användaren.

---

## 7. Datamodell — invarianter som inte får brytas

- `leads.source_id` har FK till `lead_sources(id)`. Nya källor kräver migration, inte hårdkodning.
- `app_users.id` = `auth.users.id`. Att skapa en app_user utan motsvarande auth-user bryter triggern.
- Minst en `superadmin`-rad måste alltid finnas — API-guarden `countSuperadmins()` får aldrig kringgås.
- `conversations.lead_id` är nullable (chatt kan existera innan lead skapats). `messages.conversation_id` är NOT NULL.
- `brand_settings` är key/value — lägg inte business logic där. Nya strukturerade inställningar får egen tabell.

---

## 8. Testning och kvalitetsgrind

Idag saknas automatiserade tester. Inom roadmap-fas 0:
- Vitest + React Testing Library för komponenter.
- Playwright för 3–5 kritiska flöden (founder-chat end-to-end, admin-login, lead-status-change, invite-accept).
- Supabase-migrations testas via `supabase db reset` + snapshot i CI.
- CI: typecheck, lint, test, `npm audit --production`, axe-core på chat-sidan.

---

## 9. Release & versionering

- SemVer för appen. Major = breaking admin-API. Minor = nya moduler/features. Patch = fix.
- Migrations numreras löpande (`0005_`, `0006_`), har rollback-dokumentation.
- Feature flags via `brand_settings`-liknande `feature_flags`-tabell (byggs fas 1) — inga sk:a "environment-branch"-pattern.

---

## 10. Referensdokument

- `/ROADMAP.md` — produktionsplan och feature-pipeline
- `/docs/rop-record.md` — registerföring GDPR Art. 30 *(skapas)*
- `/docs/model-card.md` — AI Act-dokumentation *(skapas)*
- `/docs/threat-model.md` — STRIDE-analys *(skapas)*
- `/docs/incident-response.md` — rutin vid personuppgiftsincident *(skapas)*
- `/docs/dpia.md` — Data Protection Impact Assessment *(skapas)*

---

*Denna fil är levande. Uppdatera i samma PR som införandet av ny risk eller ny juridisk realitet. Vid motsägelse mellan denna fil och juridisk rådgivning — juridiken vinner, uppdatera filen.*
