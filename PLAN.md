# Plan: Movexum Token Usage & Utsläppsdashboard

Syftet med projektet är att mäta Movexums totala AI-användning (tokens) och
omvandla det till uppskattade klimatutsläpp (kWh och CO₂e). Dashboarden ska
visa både rå token-användning per projekt/modell och den miljöpåverkan som
användningen motsvarar.

---

## 1. Mål

- Följa totalt antal `input_tokens` och `output_tokens` för Movexums OpenAI-org.
- Bryta ned användningen per projekt, modell och dag.
- Räkna om tokens till energi (kWh) och utsläpp (kg CO₂e) med publicerade,
  pålitliga siffror.
- Ge en enkel vy som teamet och ledningen kan titta på.

---

## 2. Bakgrund och vägval

Den enklaste och mest robusta vägen är att bygga en egen liten backend som
hämtar data från OpenAI:s Usage API och eventuellt Costs API, lagrar eller
cachar resultatet, och visar det i en dashboard. OpenAI har också en inbyggd
Usage Dashboard, men om vi vill följa teamets totala `output_tokens`, gruppera
per projekt/modell/dag och kombinera med egna vyer (t.ex. utsläpp) är en
egen dashboard rätt väg.

Det viktiga först:

- Ja, OpenAI ger usage-data via API, inklusive detaljerad användning och en
  separat costs-endpoint.
- Ja, projekt i OpenAI Platform är rätt sätt att separera team, appar eller
  miljöer och följa usage/budget per projekt.
- Nej, OpenAI-nyckeln ska inte ligga i frontend eller i browsern; anropen ska
  gå via vår egen backend.

---

## 3. Rekommenderad setup

### 3.1 Strukturera usage i OpenAI först
Skapa ett eller flera Projects i OpenAI Platform, till exempel:

- `team-prod`
- `team-staging`
- `internal-tools`

Det gör att usage kan brytas ned per projekt och blir mycket enklare att
visualisera. OpenAI säger uttryckligen att projekt används för att organisera
arbete, följa usage och sätta budgetar per projekt.

### 3.2 Bygg en backend som hämtar usage
Backend ska:

- hämta usage dagligen eller varje timme från OpenAI Usage API
- filtrera/gruppera på datum, projekt och modell
- summera särskilt `output_tokens` och `input_tokens`
- räkna om till energi och utsläpp (se avsnitt 5)
- exponera ett eget endpoint som frontend kan läsa

### 3.3 Bygg dashboarden ovanpå den datan
Vanliga val:

- Next.js + API routes + Vercel (rekommenderas)
- Node/Express + React
- Python/FastAPI + React

För just detta väljer vi **Next.js** eftersom vi då får repo, frontend och
backend i samma GitHub-projekt.

### 3.4 Använd Claude för kodgenerering
Claude används för att:

- scaffolda projektet
- skriva komponenter
- skriva queries/aggregationer
- refaktorera och dokumentera

Men datakällan är fortfarande OpenAI:s Usage API. Claude är bara
utvecklingsassistenten i processen.

### 3.5 Lägg allt i GitHub
I GitHub läggs:

- repo med dashboard-koden (`movexum-token-usage`)
- GitHub Actions för lint/test
- deploy till Vercel/Render/Fly.io
- secrets för `OPENAI_ADMIN_KEY`

---

## 4. Vad vi mäter

För en bra team-dashboard visar vi:

- totalt `output_tokens` per dag
- totalt `input_tokens` per dag
- output/input per modell
- output/input per projekt
- kostnad per dag (USD)
- uppskattad **energi (kWh)** per dag
- uppskattad **CO₂e (kg)** per dag
- 7-dagars och 30-dagars trend
- toppdagar och toppmodeller

OpenAI:s Usage API är till för detaljerad usage-insyn och Costs-endpointen ger
spend-data separat. OpenAI noterar också att usage och costs inte alltid
matchar exakt rad för rad.

---

## 5. Beräkning av utsläpp (det nya lagret)

Vi använder en publik, pålitlig siffra från OpenAI själva som grund, och
håller koefficienterna i en tydlig konfig-fil så att de är lätta att uppdatera
när nya siffror publiceras.

### 5.1 Källa: energi per query
Sam Altman (OpenAI) publicerade i juni 2025 att en genomsnittlig ChatGPT-query
använder cirka **0,34 Wh** energi. Det är den mest citerade och officiella
siffran vi har från OpenAI själva idag.

### 5.2 Omvandling från query till token
OpenAI publicerar ingen officiell energisiffra per token. Vi uppskattar därför
en genomsnittlig query (input + output) till ca **500 tokens**, vilket ger:

```
0,34 Wh / 500 tokens ≈ 0,00068 Wh/token
                   ≈ 6,8e-7 kWh/token
```

Antagandet 500 tokens/query dokumenteras i koden som en justerbar konstant
(`AVG_TOKENS_PER_QUERY`). När OpenAI publicerar en per-token-siffra byter vi
direkt till den.

### 5.3 Källa: CO₂-intensitet
För utsläpp använder vi elnätets genomsnittliga CO₂-intensitet. Två rimliga
val:

- **Globalt genomsnitt (IEA):** ca **475 g CO₂e/kWh**
- **Sverige (Energimyndigheten):** ca **40 g CO₂e/kWh**

Vi gör båda valbara i UI:t (toggle "Global" / "Sverige") så att Movexum kan
jämföra, men defaultvärdet är det globala snittet eftersom OpenAI:s datacenter
inte ligger i Sverige.

### 5.4 Formel
```
energy_kwh  = total_tokens * KWH_PER_TOKEN
co2_kg      = energy_kwh * (GRID_G_PER_KWH / 1000)
```

### 5.5 Konfigfil (`src/config/emissions.ts`)
```ts
export const EMISSIONS = {
  // Källa: Sam Altman, "The Gentle Singularity", juni 2025
  WH_PER_QUERY: 0.34,
  // Antagande: genomsnittlig query ≈ 500 tokens (dokumenterat antagande)
  AVG_TOKENS_PER_QUERY: 500,
  // Beräknat: 0.34 / 500 / 1000 kWh per token
  KWH_PER_TOKEN: 0.34 / 500 / 1000,
  // Källor: IEA globalt snitt, Energimyndigheten SE
  GRID_G_PER_KWH: {
    global: 475,
    sweden: 40,
  },
} as const;
```

---

## 6. Säkerhet

API-nyckeln måste hållas på servern. OpenAI:s hjälpcenter är tydligt med att
nyckeln inte ska exponeras i browser eller mobilapp, eftersom det kan leda
till obehörig användning och kostnader.

Konkret:

- `OPENAI_ADMIN_KEY` lagras i Vercel/GitHub som secret
- alla anrop går via Next.js server routes
- inga nycklar i `NEXT_PUBLIC_*`-variabler
- klienten får bara aggregerad JSON från vår backend

---

## 7. Praktisk arkitektur (första versionen)

**Backend**
- Cron-job varje timme (Vercel Cron eller GitHub Actions)
- Hämtar usage senaste 35 dagarna från OpenAI Usage API
- Sparar aggregerat i Postgres eller SQLite

**Datamodell**
```
date            DATE
project_id      TEXT
project_name    TEXT
model           TEXT
input_tokens    INTEGER
output_tokens   INTEGER
cost_usd        NUMERIC
energy_kwh      NUMERIC   -- beräknad kolumn
co2_kg          NUMERIC   -- beräknad kolumn
```

**Frontend**
- KPI-kort överst (tokens idag, tokens 30d, kWh 30d, kg CO₂e 30d, USD 30d)
- Linjediagram för `output_tokens` per dag
- Linjediagram för `co2_kg` per dag
- Tabell per projekt
- Filter: datumintervall, modell, projekt, elnät (global/sverige)

---

## 8. Arbetsflöde med Claude + GitHub

1. Repo finns redan: `hampusgranstrom/movexum-token-usage`
2. Branch: `claude/token-usage-dashboard-poYfP`
3. Claude scaffoldar Next.js-projektet med:
   - dashboard-sida
   - server route `/api/usage`
   - server route `/api/emissions`
   - enkel chart-komponent
4. OpenAI-nyckel läggs som Vercel secret
5. Serverfunktion hämtar Usage API
6. Summera `output_tokens` per dag
7. Räkna om till kWh och CO₂e
8. Visa i frontend
9. Lägg till projekt- och modellfilter
10. Deploya

---

## 9. Exempelprompt till Claude

```
Build a production-ready Next.js dashboard for OpenAI API usage and
estimated emissions.

Requirements:
- Server-side only OpenAI API key usage
- Fetch usage data from the OpenAI Usage API
- Aggregate output_tokens and input_tokens by day, project, and model
- Compute energy (kWh) and CO2e (kg) using constants in
  src/config/emissions.ts (Sam Altman 0.34 Wh/query baseline)
- Add charts for daily tokens, daily kWh, and daily CO2e
- Add filters for date range, model, project, and grid (global/sweden)
- Store cached results in SQLite for now
- Use TypeScript
- Use a clean admin dashboard layout
- Include a setup README and .env.example
- Do not expose secrets to the client
```

---

## 10. Två-stegs-rekommendation

**Steg 1:** Verifiera att OpenAI:s inbyggda Usage Dashboard + CSV-export
räcker för att få en första bild av användningen.

**Steg 2:** Bygg den lilla Next.js-dashboarden i detta repo, med Claude som
kodassistent, data från OpenAI Usage API + Costs API, och utsläppslagret
enligt avsnitt 5.

---

## 11. Öppna frågor

- Hur många OpenAI-projekt ska vi bryta ned på från start?
- Ska vi även mäta Anthropic/Claude-användning i samma dashboard? (Admin API
  stödjer det, men datamodellen behöver en `provider`-kolumn.)
- Ska dashboarden vara publik för hela Movexum eller skyddad bakom SSO?
- Vilket elnät ska vara default — globalt snitt eller svenskt snitt?
