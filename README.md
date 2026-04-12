# Movexum Startupkompass

AI-drivet verktyg for att hantera inflodet av idebarare till Movexums inkubator.

## Funktioner

- **AI-intag** (`/chat`) -- Publik chatbot som hjalper idebarare utforska sina startup-ideer och samtidigt samlar in kontaktinfo
- **Lead-hantering** (`/leads`) -- Tabell med sok, filtrering och statushantering
- **Dashboard** (`/`) -- KPI:er, trendcharts, kallfordelning och konverteringstratt
- **Automatisk lead-extraktion** -- AI extraherar namn, e-post och idesammanfattning fran chatsamtal
- **AI-scoring** -- Varje lead bedoms automatiskt pa en skala 0-100

## Tech stack

- **Next.js 15** + React 19 + TypeScript
- **Supabase** (PostgreSQL + Auth)
- **Anthropic Claude** (AI-assistent + extraktion + scoring)
- **Tailwind CSS** + Framer Motion + Recharts

## Kom igang

1. Kopiera `.env.example` till `.env.local` och fyll i:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Kor migrationen `supabase/migrations/0003_startup_compass.sql` i Supabase SQL Editor
3. Skapa en anvandare i Supabase Auth (for admin-inloggning)
4. `npm install && npm run dev`

## Sidor

| Route | Skyddad | Beskrivning |
|-------|---------|-------------|
| `/` | Ja | Dashboard med KPI:er och charts |
| `/leads` | Ja | Lead-lista med sok och filter |
| `/leads/[id]` | Ja | Lead-detaljvy |
| `/chat` | Nej | Publik AI-assistent for idebarare |
| `/login` | Nej | Inloggning for admin |
