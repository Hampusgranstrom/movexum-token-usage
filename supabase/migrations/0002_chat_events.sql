-- Movexum Token Usage · chat och per-event-logging
--
-- Tidigare migration (0001) satte upp en aggregerad tabell som fylls av
-- OpenAI Usage API. Det fungerar inte för ChatGPT Business (OpenAI exponerar
-- inte den datan via API). Istället bygger vi en intern chat som ringer
-- OpenAI Platform API och loggar varje anrop själva — då får vi exakt data
-- utan att vara beroende av OpenAI:s admin-API:er.
--
-- Den här migrationen lägger till:
--   - token_usage_events: en rad per OpenAI-anrop från vår egna chat
--   - get_daily_usage: RPC som aggregerar events per dag för dashboarden

create table if not exists public.token_usage_events (
  id              uuid          primary key default gen_random_uuid(),
  created_at      timestamptz   not null default now(),
  -- Vem som gjorde anropet (email, userID, eller "anonymous")
  user_identifier text          not null default 'anonymous',
  model           text          not null,
  input_tokens    integer       not null default 0,
  output_tokens   integer       not null default 0,
  total_tokens    integer       generated always as (input_tokens + output_tokens) stored,
  -- Källan — t.ex. "movexum-chat", "api-call", etc.
  source          text          not null default 'movexum-chat'
);

create index if not exists token_usage_events_created_at_idx
  on public.token_usage_events (created_at desc);

create index if not exists token_usage_events_user_idx
  on public.token_usage_events (user_identifier, created_at desc);

-- RLS: ingen läsning från anon-klienter
alter table public.token_usage_events enable row level security;

drop policy if exists "block anon token_usage_events" on public.token_usage_events;
create policy "block anon token_usage_events"
  on public.token_usage_events
  for select
  to anon, authenticated
  using (false);

-- Aggregering per dag — används av /api/usage
create or replace function public.get_daily_usage(since date)
returns table (
  day date,
  input_tokens bigint,
  output_tokens bigint,
  total_tokens bigint
)
language sql
stable
as $$
  select
    (created_at at time zone 'UTC')::date as day,
    sum(input_tokens)::bigint as input_tokens,
    sum(output_tokens)::bigint as output_tokens,
    sum(total_tokens)::bigint as total_tokens
  from public.token_usage_events
  where (created_at at time zone 'UTC')::date >= since
  group by (created_at at time zone 'UTC')::date
  order by day asc;
$$;

-- Grant execute to service role (implicit, men explicit för tydlighet)
grant execute on function public.get_daily_usage(date) to service_role;
