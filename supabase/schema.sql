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
