-- ============================================================
-- PsikoPanel v0.1 — Veritabanı Şeması
-- Idempotent: defalarca çalıştırılabilir
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLOLAR
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  slug          text unique not null,
  full_name     text not null,
  title         text default 'Psikolog',
  email         text,
  phone         text,
  bio           text,
  session_types text[] default array['Bireysel Terapi','İlk Görüşme','Online Seans'],
  session_price integer default 500,
  avatar_url    text,
  created_at    timestamptz default now()
);

create table if not exists public.clients (
  id              uuid primary key default uuid_generate_v4(),
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  full_name       text not null,
  phone           text,
  email           text,
  session_type    text,
  notes           text,
  status          text default 'active' check (status in ('active','passive','new')),
  created_at      timestamptz default now()
);

create table if not exists public.appointments (
  id              uuid primary key default uuid_generate_v4(),
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  guest_name      text,
  guest_phone     text,
  guest_email     text,
  guest_note      text,
  session_type    text not null default 'Bireysel Terapi',
  starts_at       timestamptz not null,
  duration_min    integer default 50,
  status          text default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  price           integer,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists public.tests (
  id              uuid primary key default uuid_generate_v4(),
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  questions       jsonb not null default '[]',
  is_active       boolean default true,
  created_at      timestamptz default now(),
  unique(psychologist_id, slug)
);

create table if not exists public.test_responses (
  id              uuid primary key default uuid_generate_v4(),
  test_id         uuid not null references public.tests(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  respondent_name text,
  answers         jsonb not null default '[]',
  total_score     integer,
  completed_at    timestamptz default now()
);

create table if not exists public.homework (
  id              uuid primary key default uuid_generate_v4(),
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  questions       jsonb default '[]',
  due_date        date,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  unique(psychologist_id, slug)
);

create table if not exists public.homework_responses (
  id              uuid primary key default uuid_generate_v4(),
  homework_id     uuid not null references public.homework(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  respondent_name text,
  answers         jsonb not null default '[]',
  completed_at    timestamptz default now()
);

create table if not exists public.finance_entries (
  id              uuid primary key default uuid_generate_v4(),
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in ('income','expense')),
  amount          integer not null check (amount > 0),
  description     text not null,
  appointment_id  uuid references public.appointments(id) on delete set null,
  entry_date      date not null default current_date,
  created_at      timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.clients            enable row level security;
alter table public.appointments       enable row level security;
alter table public.tests              enable row level security;
alter table public.test_responses     enable row level security;
alter table public.homework           enable row level security;
alter table public.homework_responses enable row level security;
alter table public.finance_entries    enable row level security;

-- Tüm mevcut policy'leri temizle
do $$ declare r record; begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','clients','appointments','tests',
        'test_responses','homework','homework_responses','finance_entries'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles
create policy "profiles_public_read"  on public.profiles for select using (true);
create policy "profiles_owner_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_owner_delete" on public.profiles for delete using (auth.uid() = id);

-- clients
create policy "clients_owner" on public.clients for all using (auth.uid() = psychologist_id);

-- appointments: psikolog kendi randevularını yönetir + herkese insert
create policy "appts_owner_all"     on public.appointments for all    using (auth.uid() = psychologist_id);
create policy "appts_public_insert" on public.appointments for insert with check (true);

-- tests: psikolog kendi testlerini yönetir + aktif testler herkese görünür
create policy "tests_owner_all"    on public.tests for all    using (auth.uid() = psychologist_id);
create policy "tests_public_read"  on public.tests for select using (is_active = true);

-- test_responses: psikolog kendi testlerine gelen yanıtları görür + herkese insert
create policy "test_resp_owner_read"    on public.test_responses for select
  using (auth.uid() = (select psychologist_id from public.tests where id = test_id));
create policy "test_resp_public_insert" on public.test_responses for insert with check (true);

-- homework
create policy "hw_owner_all"   on public.homework for all    using (auth.uid() = psychologist_id);
create policy "hw_public_read" on public.homework for select using (is_active = true);

-- homework_responses
create policy "hw_resp_owner_read"    on public.homework_responses for select
  using (auth.uid() = (select psychologist_id from public.homework where id = homework_id));
create policy "hw_resp_public_insert" on public.homework_responses for insert with check (true);

-- finance
create policy "finance_owner" on public.finance_entries for all using (auth.uid() = psychologist_id);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_profiles_slug       on public.profiles        (slug);
create index if not exists idx_appts_psych_time    on public.appointments    (psychologist_id, starts_at);
create index if not exists idx_appts_status        on public.appointments    (status);
create index if not exists idx_clients_psych       on public.clients         (psychologist_id);
create index if not exists idx_tests_psych_slug    on public.tests           (psychologist_id, slug);
create index if not exists idx_test_resp_test      on public.test_responses  (test_id);
create index if not exists idx_hw_psych_slug       on public.homework        (psychologist_id, slug);
create index if not exists idx_hw_resp_hw          on public.homework_responses (homework_id);
create index if not exists idx_finance_psych_date  on public.finance_entries (psychologist_id, entry_date);
