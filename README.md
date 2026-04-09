# Movexum · AI Token Usage

Dashboard som mäter Movexums totala AI-token-användning och omvandlar den till
energi (kWh) och klimatutsläpp (kg CO₂e).

MVP-versionen visar tre fasta KPI-kort (**Tokens**, **Energi**, **CO₂e**) och
en graf över tokens per dag. Data hämtas server-side från OpenAI:s Usage API,
med deterministisk mockdata som fallback så att dashboarden alltid går att
köra under utveckling.

Hela planen ligger i [`PLAN.md`](./PLAN.md).

## Kör lokalt

```bash
npm install
cp .env.example .env.local
# (valfritt) fyll i OPENAI_ADMIN_KEY i .env.local för live-data
npm run dev
```

Öppna <http://localhost:3000>.

## Environment

| Variabel           | Beskrivning                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `OPENAI_ADMIN_KEY` | OpenAI **admin**-nyckel (`sk-admin-...`). Krävs för live-data, annars mock. |
| `DEFAULT_GRID`     | `global` eller `sweden`. Styr CO₂-intensiteten. Default: `global`.          |

> Admin-nycklar skapas på <https://platform.openai.com/settings/organization/admin-keys>.
> Regulära projekt-nycklar fungerar **inte** mot Usage API.

## Utsläppsberäkning

Baseras på Sam Altmans publicerade siffra (juni 2025): en genomsnittlig
ChatGPT-query ≈ 0,34 Wh. Vi antar ~500 tokens/query vilket ger:

```
kWh per token ≈ 0,34 Wh / 500 / 1000 ≈ 6,8·10⁻⁷ kWh/token
```

CO₂-intensitet:

- **global** = 475 g CO₂e/kWh (IEA)
- **sweden** = 40 g CO₂e/kWh (Energimyndigheten)

Alla koefficienter ligger i [`src/config/emissions.ts`](./src/config/emissions.ts)
och är enkla att uppdatera när OpenAI eller andra källor publicerar nya siffror.

## Struktur

```
src/
├── app/
│   ├── api/usage/route.ts   # Server route som hämtar & aggregerar usage
│   ├── layout.tsx
│   ├── page.tsx             # Dashboard-sida
│   └── globals.css
├── components/
│   ├── dashboard.tsx        # Huvudvyn, klient
│   ├── kpi-card.tsx         # De tre KPI-korten
│   ├── count-up.tsx         # Framer-motion count-up
│   └── usage-chart.tsx      # Recharts area chart
├── config/
│   └── emissions.ts         # Energi- & CO₂-koefficienter
└── lib/
    ├── aggregate.ts         # Bygger UsageSummary inkl. delta mot föreg. period
    ├── mock-data.ts         # Deterministisk mockdata
    ├── openai-usage.ts      # OpenAI Usage API-klient
    ├── types.ts
    └── utils.ts
```

## Scripts

```bash
npm run dev         # Next.js dev server
npm run build       # Produktionsbygge
npm run start       # Starta produktionsbygge
npm run typecheck   # TypeScript utan emit
npm run lint        # (valfritt, när next/lint konfigurerats)
```

## Roadmap

Se [`PLAN.md`](./PLAN.md) avsnitt 11 för hela "EPIC-läget". Nästa steg efter
MVP:

1. Bento-layout + sparklines i KPI-korten
2. Vardagsöversättningar ("motsvarar X bilresor Sthlm–Gbg")
3. Filter: datumintervall, modell, projekt, elnät (global/sweden)
4. Heatmap (GitHub-style) och Sankey (projekt → modell → CO₂e)
5. `/tv`-route för storskärm på kontoret
