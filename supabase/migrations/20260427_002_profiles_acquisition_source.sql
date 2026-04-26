-- Add acquisition_source to profiles to track UTM attribution at signup.
-- Written once (on first login) via useUtmTracking; never overwritten.
-- Nullable so existing rows are unaffected.

alter table public.profiles
  add column if not exists acquisition_source jsonb default null;

comment on column public.profiles.acquisition_source is
  'UTM params captured from first session: utm_source, utm_medium, utm_campaign, ref, etc.';
