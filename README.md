# Movexum · AI Token Usage

Dashboard som mäter Movexums totala AI-token-användning och omvandlar den till
energi (kWh) och klimatutsläpp (kg CO₂e).

- **Tre fasta KPI-kort** (Tokens, Energi, CO₂e) med delta mot föregående period
- **Graf** över tokens per dag
- **Supabase** som datalager, **OpenAI Usage API** som källa
- **GitHub Actions** syncar varje timme
- **Live-only:** Supabase först, OpenAI som direkt-fallback. Ingen mockdata —
  om båda fallerar visas ett tydligt fel istället för påhittade siffror.

Hela planen ligger i [`PLAN.md`](./PLAN.md).

---

## Arkitektur

```
┌────────────┐    hourly cron    ┌──────────────┐   OpenAI    ┌────────────┐
│  GitHub    │ ────────────────▶ │  /api/sync   │ ──────────▶ │ Usage API  │
│  Actions   │  Authorization:   │  (Next.js)   │             └────────────┘
└────────────┘   Bearer $SECRET  │              │   upsert    ┌────────────┐
                                 │              │ ──────────▶ │  Supabase  │
                                 └──────────────┘             │ token_...  │
                                                              └────────────┘
                                                                    ▲
                     ┌────────────┐   read                          │
                     │  /api/usage│◀────────────────────────────────┘
                     │  (Next.js) │
                     └────────────┘
                           ▲
                     ┌────────────┐
                     │  Dashboard │
                     │  (browser) │
                     └────────────┘
```

Klientens browser ser **bara** `/api/usage`. `OPENAI_ADMIN_KEY` och
`SUPABASE_SERVICE_ROLE_KEY` lever bara på servern.

---

## Setup

### 1. Installera

```bash
npm install
cp .env.example .env.local
```

### 2. Skaffa nycklarna

| Nyckel | Var | Not |
|---|---|---|
| `OPENAI_ADMIN_KEY` | OpenAI → Settings → Organization → **Admin keys** | Måste börja på `sk-admin-`. Regulära `sk-proj-`-nycklar funkar inte mot Usage API. Ge scope `api.usage.read`. |
| `SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** | Server-only. Skicka aldrig till klient. |
| `CRON_SECRET` | Generera själv: `openssl rand -hex 32` | Delad hemlighet mellan GitHub Actions och `/api/sync`. |

Klistra in allt i `.env.local`.

### 3. Kör migrationen i Supabase

Öppna Supabase Dashboard → **SQL Editor** → New query → klistra in innehållet i
[`supabase/migrations/0001_initial.sql`](./supabase/migrations/0001_initial.sql)
→ Run.

Eller via CLI om du har den installerad:

```bash
supabase link --project-ref <din-project-ref>
supabase db push
```

### 4. Första synken

Kör `/api/sync` en gång för att fylla tabellen:

```bash
npm run dev
curl -X POST http://localhost:3000/api/sync
```

Dashboarden på <http://localhost:3000> läser nu från Supabase.

### 5. Deploy

1. Lägg samma env-variabler i din hosting-plattform (Vercel env vars rek.)
2. Pusha
3. Lägg till två **repository secrets** i GitHub:
   - `DASHBOARD_URL` (t.ex. `https://usage.movexum.com`)
   - `CRON_SECRET` (samma som i hosting env)
4. GitHub Actions kör automatiskt `.github/workflows/sync.yml` varje timme

---

## API

### `GET /api/usage?days=30&grid=global`

Returnerar aggregerat summary för valt intervall.

Källordning:
1. Supabase (`token_usage_daily`) — primär
2. OpenAI direkt (om Supabase är tom eller inte konfigurerad)

Om båda misslyckas returneras `500` med ett JSON-svar:
`{ "error": "...", "details": [...], "hints": [...] }` och dashboarden visar
en felpanel med exakt orsak.

Query-parametrar:

| Param  | Default  | Värden |
|--------|----------|--------|
| `days` | `30`     | `7`–`90` |
| `grid` | `global` | `global` \| `sweden` |

### `POST /api/sync`

Hämtar senaste 35 dagarna från OpenAI Usage API och upsertar till Supabase.
Kräver `Authorization: Bearer $CRON_SECRET`. Anropas av GitHub Actions varje
timme.

---

## Utsläppsberäkning

Baseras på Sam Altmans publicerade siffra (juni 2025): en genomsnittlig
ChatGPT-query ≈ **0,34 Wh**. Vi antar ~500 tokens/query vilket ger:

```
kWh per token ≈ 0,34 Wh / 500 / 1000 ≈ 6,8·10⁻⁷ kWh/token
```

CO₂-intensitet (valbar per request):

- **global** = 475 g CO₂e/kWh (IEA)
- **sweden** = 40 g CO₂e/kWh (Energimyndigheten)

Alla koefficienter ligger i [`src/config/emissions.ts`](./src/config/emissions.ts)
och är enkla att uppdatera när nya siffror publiceras.

---

## Struktur

```
src/
├── app/
│   ├── api/
│   │   ├── sync/route.ts     # OpenAI → Supabase (skyddad med CRON_SECRET)
│   │   └── usage/route.ts    # Supabase → Dashboard
│   ├── layout.tsx
│   ├── page.tsx              # Dashboard-sida
│   └── globals.css
├── components/
│   ├── dashboard.tsx         # Huvudvyn
│   ├── kpi-card.tsx          # De tre KPI-korten
│   ├── count-up.tsx          # Framer-motion count-up
│   └── usage-chart.tsx       # Recharts area chart
├── config/
│   └── emissions.ts          # Energi- och CO2-koefficienter
└── lib/
    ├── aggregate.ts          # UsageSummary + delta
    ├── openai-usage.ts       # OpenAI Usage API-klient
    ├── supabase.ts           # Server-klient (service role)
    ├── sync.ts               # Sync-logik
    ├── types.ts
    └── utils.ts

supabase/
└── migrations/
    └── 0001_initial.sql

.github/workflows/
└── sync.yml                  # Cron varje timme
```

---

## Scripts

```bash
npm run dev         # Next.js dev server
npm run build       # Produktionsbygge
npm run start       # Starta produktionsbygge
npm run typecheck   # TypeScript
```

---

## Secrets-rutin

| Secret | Vilken plattform | Behövs där |
|---|---|---|
| `OPENAI_ADMIN_KEY` | Hosting (Vercel etc.) | För `/api/sync` och live-fallback |
| `SUPABASE_URL` | Hosting | Både `/api/usage` och `/api/sync` |
| `SUPABASE_SERVICE_ROLE_KEY` | Hosting | Båda routes |
| `CRON_SECRET` | Hosting **+** GitHub Secrets | Båda sidor av cron-anropet |
| `DASHBOARD_URL` | GitHub Secrets | GitHub Actions behöver veta vart den ska ringa |

**Lägg aldrig** nycklar i `NEXT_PUBLIC_*`-variabler, `.env` som commitas, eller
frontend-kod. `.env.local` är i `.gitignore`.

---

## Roadmap

Se [`PLAN.md`](./PLAN.md) avsnitt 11 (EPIC-läget). Nästa ambitionsnivå
("Snygg"):

1. Sparklines inne i KPI-korten
2. Vardagsöversättningar ("= X bilresor Sthlm–Gbg")
3. Bento-layout
4. Sankey (projekt → modell → CO₂e) och heatmap
5. `/tv`-route för storskärm
