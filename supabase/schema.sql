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

-- profiles links a Supabase Auth user to either the admin role (full access)
-- or a specific worker (self-service: log own hours, view own history only).
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'worker')),
  worker_id uuid references workers(id) on delete set null
);

alter table workers enable row level security;
alter table time_entries enable row level security;
alter table profiles enable row level security;

create policy "Users read own profile" on profiles
  for select using (auth.uid() = user_id);

create policy "Admins full access workers" on workers
  for all
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'));
create policy "Workers read own worker row" on workers
  for select using (exists (
    select 1 from profiles p where p.user_id = auth.uid() and p.worker_id = workers.id
  ));

create policy "Admins full access time_entries" on time_entries
  for all
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'));
create policy "Workers select own entries" on time_entries
  for select using (exists (
    select 1 from profiles p where p.user_id = auth.uid() and p.worker_id = time_entries.worker_id
  ));
create policy "Workers insert own entries" on time_entries
  for insert with check (
    exists (select 1 from profiles p where p.user_id = auth.uid() and p.worker_id = time_entries.worker_id)
    and paid_status = 'UNPAID'
    and previous_due = 0
  );

-- After creating your own login under Authentication -> Users, link it as
-- admin (replace the UID with yours from the Users table):
--   insert into profiles (user_id, role) values ('<your-user-uid>', 'admin');
-- After inviting a worker (e.g. TUHIN) and they appear in Users, link them:
--   insert into profiles (user_id, role, worker_id)
--   values ('<their-user-uid>', 'worker', (select id from workers where name = 'TUHIN'));
