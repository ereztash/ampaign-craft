-- user_progress: persists milestone completion, mastery features, achievements,
-- investment metrics, and streak data to Supabase so they survive cross-device
-- sessions and can be aggregated for product analytics (Activation Rate,
-- Retention, Free→Paid Conversion).
--
-- Conflict resolution: all fields are monotonically increasing (milestones only
-- go true, plansCreated only grows, etc.). Merging is always a union/max —
-- no data is ever lost on sync.

create table if not exists public.user_progress (
  user_id             uuid        not null references auth.users(id) on delete cascade,
  milestones          jsonb       not null default '{}',
  investment          jsonb       not null default '{}',
  mastery_features    text[]      not null default '{}',
  achievements        jsonb       not null default '{}',
  streak              jsonb       not null default '{}',
  updated_at          timestamptz not null default now(),
  constraint user_progress_pkey primary key (user_id)
);

-- Automatically refresh updated_at on every row update
create or replace function public.set_user_progress_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_progress_updated_at on public.user_progress;
create trigger trg_user_progress_updated_at
  before update on public.user_progress
  for each row execute procedure public.set_user_progress_updated_at();

-- RLS
alter table public.user_progress enable row level security;

create policy "users_select_own_progress"
  on public.user_progress for select
  using (user_id = auth.uid());

create policy "users_insert_own_progress"
  on public.user_progress for insert
  with check (user_id = auth.uid());

create policy "users_update_own_progress"
  on public.user_progress for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Index used by AARRR analytics queries that filter by updated_at ranges
create index if not exists idx_user_progress_updated_at
  on public.user_progress (updated_at);
