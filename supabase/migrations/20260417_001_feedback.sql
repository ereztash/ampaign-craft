-- Feedback table for /support page.
-- Public inserts (anonymous users can report bugs); admin-only reads.

create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  email text,
  message text not null check (length(message) between 5 and 5000),
  user_agent text,
  page_url text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_feedback_created_at
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Anyone (authenticated or anonymous) may submit feedback
drop policy if exists "anyone can insert feedback" on public.feedback;
create policy "anyone can insert feedback"
  on public.feedback
  for insert
  with check (true);

-- Only admin role can read feedback
drop policy if exists "admins can read feedback" on public.feedback;
create policy "admins can read feedback"
  on public.feedback
  for select
  using (
    public.has_role(auth.uid(), 'admin')
  );
