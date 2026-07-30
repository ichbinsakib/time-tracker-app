-- Time Tracker schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query) once, before seed.sql.

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_hourly_rate numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  entry_date date not null,
  hours_worked numeric not null default 0,
  details text,
  hourly_rate numeric not null default 0,
  payable_amount numeric generated always as (round(hours_worked * hourly_rate, 2)) stored,
  previous_due numeric not null default 0,
  paid_status text not null default 'UNPAID' check (paid_status in ('PAID', 'UNPAID')),
  remarks text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists time_entries_worker_idx on time_entries (worker_id, entry_date desc);

insert into workers (name, default_hourly_rate)
values ('EMON', 80), ('TUHIN', 95)
on conflict (name) do nothing;

-- Row Level Security: this app is deployed publicly (GitHub Pages), so only
-- signed-in users (via Supabase Auth) may read or write. Create your login
-- user under Authentication -> Users in the Supabase dashboard.
alter table workers enable row level security;
alter table time_entries enable row level security;

create policy "Authenticated read workers" on workers
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write workers" on workers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated read time_entries" on time_entries
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write time_entries" on time_entries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
