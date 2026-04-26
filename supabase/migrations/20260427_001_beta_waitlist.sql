-- beta_waitlist: captures pre-launch email sign-ups from the public landing page.
-- utm_* columns preserve acquisition attribution for cohort analysis.
-- No auth required — anyone can insert, nobody can read their own row from client.

create table if not exists public.beta_waitlist (
  id            uuid        not null default gen_random_uuid(),
  email         text        not null,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  ref           text,
  created_at    timestamptz not null default now(),
  constraint beta_waitlist_pkey primary key (id),
  constraint beta_waitlist_email_unique unique (email)
);

-- RLS: allow anonymous insert only; no select/update/delete from client
alter table public.beta_waitlist enable row level security;

create policy "anon_insert_beta_waitlist"
  on public.beta_waitlist for insert
  to anon, authenticated
  with check (true);

-- Index for dedup lookups and admin reporting
create index if not exists idx_beta_waitlist_email      on public.beta_waitlist (email);
create index if not exists idx_beta_waitlist_created_at on public.beta_waitlist (created_at desc);
create index if not exists idx_beta_waitlist_utm_source on public.beta_waitlist (utm_source) where utm_source is not null;
