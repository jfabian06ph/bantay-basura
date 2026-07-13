-- ============================================================
-- Bantay Basura — Operations Center schema
-- Run once in the Supabase SQL editor (or via `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---- Operators (profiles linked to auth.users) ------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  role        text not null default 'operator'
              check (role in ('admin', 'operator', 'viewer')),
  lgu         text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Reports / incidents ----------------------------------------------------
create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  lat            double precision not null,
  lng            double precision not null,
  title          text,
  category       text not null,
  severity       int  not null default 1 check (severity between 1 and 3),
  note           text,
  photo_url      text,
  photo_urls     text[],
  resolved_photo_urls text[],
  status         text not null default 'pending'
                 check (status in ('pending', 'in_review', 'resolved')),
  still_here     int  not null default 0,
  cleared        int  not null default 0,
  reporter_name  text,
  reporter_contact text,
  barangay       text,
  municipality   text,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_created_idx on public.reports (created_at desc);

-- Columns added after the first cut — idempotent so this file stays re-runnable
-- against an existing project (CREATE TABLE IF NOT EXISTS won't alter columns).
alter table public.reports add column if not exists source            text default 'resident';
alter table public.reports add column if not exists after_image_url   text;
alter table public.reports add column if not exists after_uploaded_at timestamptz;
alter table public.reports add column if not exists after_uploaded_by text;
-- Real administrative location (reverse-geocoded at submit) so the app is
-- nationwide, not Zambales-only. `municipality`/`barangay` already exist above.
alter table public.reports add column if not exists province          text;

-- ---- Response teams ---------------------------------------------------------
create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  lgu          text,
  area         text,
  status       text not null default 'available'
               check (status in ('available', 'deployed', 'off_duty')),
  member_count int not null default 0,
  contact      text,
  created_at   timestamptz not null default now()
);

-- ---- Assignments (incident -> team) -----------------------------------------
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references public.reports on delete cascade,
  team_id     uuid references public.teams on delete set null,
  assigned_by uuid references public.profiles on delete set null,
  status      text not null default 'assigned'
              check (status in ('assigned', 'in_progress', 'done')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists assignments_report_idx on public.assignments (report_id);

-- ---- Residents --------------------------------------------------------------
create table if not exists public.residents (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  contact       text,
  barangay      text,
  municipality  text,
  reports_count int not null default 0,
  created_at    timestamptz not null default now()
);

-- ---- Org settings (key/value) ----------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- Public: read reports, create reports (community reporting), confirm counts.
-- Operators (any authenticated profile): full access to the ops tables.
-- ============================================================
alter table public.reports     enable row level security;
alter table public.profiles    enable row level security;
alter table public.teams       enable row level security;
alter table public.assignments enable row level security;
alter table public.residents   enable row level security;
alter table public.settings    enable row level security;

-- Reports: anyone can read + insert; only authenticated can update/delete.
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select using (true);
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert with check (true);
drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports for update using (auth.role() = 'authenticated');

-- Profiles: a user can read/update their own; everyone authenticated can read.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (auth.role() = 'authenticated');
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for update using (auth.uid() = id);

-- Ops tables: authenticated only (all actions).
do $$
declare t text;
begin
  foreach t in array array['teams','assignments','residents','settings'] loop
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format(
      'create policy %I_all on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t, t);
  end loop;
end $$;

-- ============================================================
-- Community actions by anonymous public
-- The reports UPDATE policy is authenticated-only (operators). Residents still
-- need to (a) cast "still here" / "looks clean" confirmations and (b) attach an
-- "after" photo when they complete a cleanup. These SECURITY DEFINER functions
-- perform those *narrow* writes atomically, bypassing RLS without exposing a
-- blanket UPDATE — the only mutations anon can make are the vote counters and
-- the after-photo fields.
-- ============================================================
create or replace function public.confirm_report(rid uuid, kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if kind = 'stillHere' then
    update public.reports set still_here = still_here + 1 where id = rid;
  elsif kind = 'cleared' then
    update public.reports set cleared = cleared + 1 where id = rid;
  else
    raise exception 'unknown confirmation kind: %', kind;
  end if;
end; $$;
grant execute on function public.confirm_report(uuid, text) to anon, authenticated;

create or replace function public.set_after_photo(rid uuid, url text, by_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reports
    set after_image_url   = url,
        after_uploaded_at = now(),
        after_uploaded_by = by_role
    where id = rid;
end; $$;
grant execute on function public.set_after_photo(uuid, text, text) to anon, authenticated;

-- ============================================================
-- Storage — public bucket for report photos
-- Anyone can upload (community reporting) and read; nobody can update/delete
-- through the anon key. Photos are addressed by a random uuid filename.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

drop policy if exists "report photos public read" on storage.objects;
create policy "report photos public read" on storage.objects
  for select using (bucket_id = 'report-photos');

drop policy if exists "report photos anon insert" on storage.objects;
create policy "report photos anon insert" on storage.objects
  for insert with check (bucket_id = 'report-photos');

-- ============================================================
-- Image moderation gate
-- Anonymous uploads go to a PRIVATE quarantine bucket and are only copied into
-- the public bucket above once the `moderate-photo` Edge Function approves them.
-- Anyone can upload (write-only); only the service role can read/list/delete.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('report-quarantine', 'report-quarantine', false)
on conflict (id) do nothing;

drop policy if exists "quarantine anon insert" on storage.objects;
create policy "quarantine anon insert" on storage.objects
  for insert with check (bucket_id = 'report-quarantine');
-- No select/update/delete policy for anon: the private bucket is invisible to
-- the public; the Edge Function touches it with the service-role key.

-- Audit + review queue: one row per moderation decision. No raw PII (IP is
-- hashed). Operators can read it; only the service role writes.
create table if not exists public.moderation_events (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references public.reports on delete cascade,
  kind        text not null default 'report' check (kind in ('report', 'after')),
  status      text not null check (status in ('approved', 'rejected', 'review')),
  scores      jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
create index if not exists moderation_events_status_idx on public.moderation_events (status);
create index if not exists moderation_events_ip_idx on public.moderation_events (ip_hash, created_at desc);

alter table public.moderation_events enable row level security;
drop policy if exists moderation_read on public.moderation_events;
create policy moderation_read on public.moderation_events
  for select using (auth.role() = 'authenticated');
-- Writes happen only via the service role (Edge Function), which bypasses RLS.
