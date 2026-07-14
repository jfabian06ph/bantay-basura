-- QA feedback from beta testers (in-app widget). Run this on BOTH the staging
-- and production Supabase projects (it's harmless on prod — the widget only
-- writes to it on non-production builds).
--
-- Anonymous by design: anyone can INSERT (no account), nobody can SELECT with
-- the anon key. Operators read submissions via an authenticated session or the
-- Supabase dashboard.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  message     text not null,
  category    text,
  page        text,
  app_env     text,
  user_agent  text,
  viewport    text,
  status      text not null default 'new'  -- new | triaged | resolved
);

alter table public.feedback enable row level security;

-- Anonymous testers can submit.
drop policy if exists "feedback_anon_insert" on public.feedback;
create policy "feedback_anon_insert"
  on public.feedback for insert
  to anon
  with check (true);

-- Signed-in operators can read + update (triage) in the Ops Center.
drop policy if exists "feedback_auth_read" on public.feedback;
create policy "feedback_auth_read"
  on public.feedback for select
  to authenticated
  using (true);

drop policy if exists "feedback_auth_update" on public.feedback;
create policy "feedback_auth_update"
  on public.feedback for update
  to authenticated
  using (true)
  with check (true);
