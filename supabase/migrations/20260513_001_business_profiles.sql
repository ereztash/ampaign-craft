-- business_profiles: one row per user, persists the Funnel Genesis wizard output.
-- moat_score is computed by the TypeScript moatScorer before insert.

create table if not exists public.business_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Step 1 — Company DNA
  company_name    text not null,
  industry        text not null,
  team_size       text not null,
  founded_year    smallint,

  -- Step 2 — The Offer
  offer           text not null,
  icp             text not null,
  price_point     text not null,
  sales_motion    text not null,

  -- Step 3 — Competition
  competitors     jsonb not null default '[]',
  differentiator  text not null default '',

  -- Step 4 — Bottleneck
  bottleneck      text not null,

  -- Step 5 — Win condition
  win_condition   text not null,
  fear            text not null,

  -- Computed by TypeScript moatScorer before insert
  moat_score      smallint not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint business_profiles_user_unique unique (user_id)
);

alter table public.business_profiles enable row level security;

create policy "Users manage their own business profile"
  on public.business_profiles
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
