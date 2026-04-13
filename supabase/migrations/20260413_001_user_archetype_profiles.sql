-- ═══════════════════════════════════════════════════════════════════
-- Migration: user_archetype_profiles
-- Purpose  : Persistent cross-session storage for the UserArchetypeLayer.
--            Stores each user's behaviorally-classified archetype, confidence,
--            raw scores, and top-50 signal history.
-- RLS      : Each row is locked to the owning user (auth.uid()).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.user_archetype_profiles (
  user_id          uuid        not null references auth.users(id) on delete cascade,
  archetype_id     text        not null,
  confidence       float4      not null default 0,
  confidence_tier  text        not null default 'none',
  scores           jsonb       not null default '{}'::jsonb,
  signal_history   jsonb       not null default '[]'::jsonb,
  session_count    int4        not null default 0,
  override_by_user text,
  last_computed_at timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  version          int4        not null default 1,

  constraint user_archetype_profiles_pkey primary key (user_id),
  constraint user_archetype_profiles_archetype_id_check
    check (archetype_id in ('strategist','optimizer','pioneer','connector','closer')),
  constraint user_archetype_profiles_confidence_tier_check
    check (confidence_tier in ('none','tentative','confident','strong')),
  constraint user_archetype_profiles_override_check
    check (override_by_user is null or override_by_user in ('strategist','optimizer','pioneer','connector','closer'))
);

-- ── Indexes ──────────────────────────────────────────────────────────
create index if not exists idx_user_archetype_profiles_archetype_id
  on public.user_archetype_profiles (archetype_id);

create index if not exists idx_user_archetype_profiles_confidence_tier
  on public.user_archetype_profiles (confidence_tier);

-- ── Auto-update updated_at ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_archetype_profiles_updated_at on public.user_archetype_profiles;
create trigger trg_user_archetype_profiles_updated_at
  before update on public.user_archetype_profiles
  for each row execute function public.set_updated_at();

-- ── Trim signal_history to last 50 entries on upsert ─────────────────
create or replace function public.trim_archetype_signal_history()
returns trigger language plpgsql as $$
begin
  -- Keep only the last 50 signals (array slice from end)
  if jsonb_array_length(new.signal_history) > 50 then
    new.signal_history := (
      select jsonb_agg(elem)
      from (
        select elem
        from jsonb_array_elements(new.signal_history) with ordinality as t(elem, ord)
        order by ord desc
        limit 50
      ) sub
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_archetype_trim_signals on public.user_archetype_profiles;
create trigger trg_user_archetype_trim_signals
  before insert or update on public.user_archetype_profiles
  for each row execute function public.trim_archetype_signal_history();

-- ── Row Level Security ────────────────────────────────────────────────
alter table public.user_archetype_profiles enable row level security;

-- Users can only read their own profile
create policy "user_archetype_profiles_select"
  on public.user_archetype_profiles
  for select
  using (user_id = auth.uid());

-- Users can only insert their own profile
create policy "user_archetype_profiles_insert"
  on public.user_archetype_profiles
  for insert
  with check (user_id = auth.uid());

-- Users can only update their own profile
create policy "user_archetype_profiles_update"
  on public.user_archetype_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete their own profile (GDPR Article 17)
create policy "user_archetype_profiles_delete"
  on public.user_archetype_profiles
  for delete
  using (user_id = auth.uid());

-- ── Grant access to authenticated users ──────────────────────────────
grant select, insert, update, delete
  on public.user_archetype_profiles
  to authenticated;
