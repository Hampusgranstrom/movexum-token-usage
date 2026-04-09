-- Movexum Token Usage · initial schema
--
-- Lagrar daglig token-användning från OpenAI Usage API. Dashboarden läser
-- från den här tabellen i stället för att anropa OpenAI direkt, vilket är
-- snabbare och håller admin-nyckeln på en enda plats (Supabase).
--
-- Kör i Supabase SQL Editor eller via `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists public.token_usage_daily (
  -- Datum i UTC (ISO) som tabellen grupperas på
  day              date        not null,
  -- Frivillig uppdelning per projekt och modell. Tomsträng = "aggregerat".
  project_id       text        not null default '',
  model            text        not null default '',

  input_tokens     bigint      not null default 0,
  output_tokens    bigint      not null default 0,
  total_tokens     bigint      generated always as (input_tokens + output_tokens) stored,

  -- Beräknade fält skrivs in av sync-jobbet så att Next.js slipper räkna om
  -- dem för varje request.
  energy_kwh       numeric(20, 10) not null default 0,
  co2_kg_global    numeric(20, 10) not null default 0,
  co2_kg_sweden    numeric(20, 10) not null default 0,

  source           text        not null default 'openai-usage-api',
  updated_at       timestamptz not null default now(),

  primary key (day, project_id, model)
);

create index if not exists token_usage_daily_day_idx
  on public.token_usage_daily (day desc);

-- Trigger som håller updated_at färsk vid uppdatering
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists token_usage_daily_set_updated_at on public.token_usage_daily;
create trigger token_usage_daily_set_updated_at
  before update on public.token_usage_daily
  for each row
  execute function public.set_updated_at();

-- Row Level Security: ingen läsning från anon-klienter. Dashboarden läser
-- alltid via Next.js server routes som använder service role key.
alter table public.token_usage_daily enable row level security;

-- Service role har alltid full access (den bypassar RLS), så vi behöver
-- bara explicit blockera anon/authenticated.
drop policy if exists "block anon reads" on public.token_usage_daily;
create policy "block anon reads"
  on public.token_usage_daily
  for select
  to anon, authenticated
  using (false);
