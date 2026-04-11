-- ═══════════════════════════════════════════════
-- E6 — Reflective Failures (Adaptive Verifier store)
--
-- Each row records a single reflective ActionCard whose falsifier
-- metric did NOT cross the threshold within the falsifier window.
-- The adaptive verifier reads this table to compute similarity
-- between a new candidate card and past failures, and either
-- reduces the card's confidence or blocks it entirely when the
-- similarity crosses the configured bands.
-- ═══════════════════════════════════════════════

create table if not exists public.reflective_failures (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  user_id text not null,
  engines_used jsonb not null,
  falsifier_metric text not null,
  falsifier_threshold numeric not null,
  falsifier_direction text not null check (falsifier_direction in ('above','below')),
  falsifier_window_days integer not null,
  regime_at_time text,
  coherence_score_at_time numeric,
  observed_value numeric,
  failed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_reflective_failures_engines
  on public.reflective_failures using gin (engines_used);

create index if not exists idx_reflective_failures_metric
  on public.reflective_failures (falsifier_metric);

create index if not exists idx_reflective_failures_user
  on public.reflective_failures (user_id, failed_at desc);

-- ───────────────────────────────────────────────
-- Row Level Security
-- ───────────────────────────────────────────────
-- Users can read their own failure history. Writes are performed by
-- the scheduled task (service role) rather than directly by clients,
-- so there is no client INSERT/UPDATE/DELETE policy by default.

alter table public.reflective_failures enable row level security;

create policy "Users read own reflective failures"
  on public.reflective_failures for select
  to authenticated
  using (auth.uid()::text = user_id);
