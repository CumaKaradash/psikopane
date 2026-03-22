-- ============================================================
-- PsikoPanel — 001_schema.sql
-- Tablolar, view, index'ler, trigger'lar
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLOLAR
-- ============================================================

-- profiles
create table if not exists public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  slug          text        unique not null,
  full_name     text        not null,
  title         text        default 'Psikolog',
  email         text,
  phone         text,
  bio           text,
  session_types text[]      default array['Bireysel Terapi','İlk Görüşme','Online Seans'],
  session_price integer     default 500,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()  -- trigger ile otomatik güncellenir
);

-- clients  [+016: birth_date, address]
create table if not exists public.clients (
  id              uuid        primary key default uuid_generate_v4(),
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  full_name       text        not null,
  phone           text,
  email           text,
  birth_date      date,
  address         text,
  session_type    text,
  notes           text,
  status          text        default 'active'
                  check (status in ('active','passive','new')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()  -- trigger ile otomatik güncellenir
);

-- appointments  [+008: push_subscription, notify_consent]
create table if not exists public.appointments (
  id                uuid        primary key default uuid_generate_v4(),
  psychologist_id   uuid        not null references public.profiles(id) on delete cascade,
  client_id         uuid        references public.clients(id) on delete set null,
  guest_name        text,
  guest_phone       text,
  guest_email       text,
  guest_note        text,
  session_type      text        not null default 'Bireysel Terapi',
  starts_at         timestamptz not null,
  duration_min      integer     default 50,
  status            text        default 'pending'
                    check (status in ('pending','confirmed','cancelled','completed')),
  price             integer,
  notes             text,
  push_subscription jsonb,
  notify_consent    boolean     default false,
  created_at        timestamptz default now()
);

-- tests  [+010: is_public  |  +019: score_ranges  |  +team_shared]
create table if not exists public.tests (
  id              uuid        primary key default uuid_generate_v4(),
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  slug            text        not null,
  title           text        not null,
  description     text,
  questions       jsonb       not null default '[]',
  score_ranges    jsonb       default null,
  is_active       boolean     default true,
  is_public       boolean     not null default false,
  team_shared     boolean     default false,
  created_at      timestamptz default now(),
  unique(psychologist_id, slug)
);

-- test_responses  [+003/007: psychologist_id — N+1 RLS fix]
create table if not exists public.test_responses (
  id              uuid        primary key default uuid_generate_v4(),
  test_id         uuid        not null references public.tests(id) on delete cascade,
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  client_id       uuid        references public.clients(id) on delete set null,
  respondent_name text,
  answers         jsonb       not null default '[]',
  total_score     integer,
  completed_at    timestamptz default now()
);

-- homework  [+team_shared]
create table if not exists public.homework (
  id              uuid        primary key default uuid_generate_v4(),
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  slug            text        not null,
  title           text        not null,
  description     text,
  questions       jsonb       default '[]',
  due_date        date,
  is_active       boolean     default true,
  team_shared     boolean     default false,
  created_at      timestamptz default now(),
  unique(psychologist_id, slug)
);

-- homework_responses  [+003/007: psychologist_id — N+1 RLS fix]
create table if not exists public.homework_responses (
  id              uuid        primary key default uuid_generate_v4(),
  homework_id     uuid        not null references public.homework(id) on delete cascade,
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  client_id       uuid        references public.clients(id) on delete set null,
  respondent_name text,
  answers         jsonb       not null default '[]',
  completed_at    timestamptz default now()
);

-- finance_entries  [+017: amount → numeric(10,2)]
create table if not exists public.finance_entries (
  id              uuid          primary key default uuid_generate_v4(),
  psychologist_id uuid          not null references public.profiles(id) on delete cascade,
  type            text          not null check (type in ('income','expense')),
  amount          numeric(10,2) not null,
  description     text          not null,
  appointment_id  uuid          references public.appointments(id) on delete set null,
  entry_date      date          not null default current_date,
  created_at      timestamptz   default now(),
  constraint finance_amount_positive check (amount > 0)
);

-- files  [+006  |  +team_shared]
create table if not exists public.files (
  id              uuid        primary key default uuid_generate_v4(),
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  file_name       text        not null,
  storage_path    text        not null,
  file_type       text        not null default 'unknown',
  file_size       integer     not null default 0,
  category        text        not null default 'Diğer Dökümanlar',
  notes           text,
  team_shared     boolean     default false,
  created_at      timestamptz default now()
);

-- rss_feeds  [+013]
create table if not exists public.rss_feeds (
  id              uuid        primary key default gen_random_uuid(),
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  url             text        not null,
  label           text,
  created_at      timestamptz not null default now()
);

-- session_notes  [+018]
create table if not exists public.session_notes (
  id              uuid        primary key default uuid_generate_v4(),
  appointment_id  uuid        not null references public.appointments(id) on delete cascade,
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  content         text        not null default '',
  updated_at      timestamptz default now(),
  created_at      timestamptz default now()
);

-- connections  [+009]
create table if not exists public.connections (
  id           uuid        primary key default uuid_generate_v4(),
  requester_id uuid        not null references public.profiles(id) on delete cascade,
  addressee_id uuid        not null references public.profiles(id) on delete cascade,
  status       text        not null default 'pending'
               check (status in ('pending','accepted','rejected')),
  created_at   timestamptz default now(),
  -- updated_at kod tarafında manuel set ediliyor (network/route.ts)
  updated_at   timestamptz default now(),
  unique(requester_id, addressee_id)
);

-- teams  [+009  |  +011: slug, bio, session_types, avatar_url]
create table if not exists public.teams (
  id            uuid        primary key default uuid_generate_v4(),
  name          text        not null,
  slug          text        unique not null,
  description   text,
  owner_id      uuid        not null references public.profiles(id) on delete cascade,
  bio           text,
  session_types text[]      default array['Bireysel Terapi','İlk Görüşme','Online Seans'],
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()  -- trigger ile otomatik güncellenir
);

-- team_members  [+009  |  +015: status — davet sistemi]
create table if not exists public.team_members (
  id              uuid        primary key default uuid_generate_v4(),
  team_id         uuid        not null references public.teams(id) on delete cascade,
  psychologist_id uuid        not null references public.profiles(id) on delete cascade,
  role            text        not null default 'member'
                  check (role in ('owner','member')),
  status          text        not null default 'pending'
                  check (status in ('pending','accepted','rejected','blocked')),
  joined_at       timestamptz default now(),
  unique(team_id, psychologist_id)
);

-- Sahip olarak eklenen üyeleri hemen 'accepted' yap [015 backfill]
-- NOT: Sadece role='owner' hedeflenir. 'pending' olan normal davetlere dokunulmaz.
-- Temiz (yeni) bir DB'de bu satır hiçbir satırı etkilemez; idempotent.
update public.team_members
  set status = 'accepted'
  where role = 'owner' and status = 'pending';

-- ============================================================
-- VIEW: public_profiles  [+004/007 — phone/email gibi hassas alanlar gizli]
-- API'ler bu view yerine profiles tablosunu direkt kullanır ama
-- auth.uid() = id kontrolü sayesinde başkasının hassas alanı görünmez.
-- ============================================================

create or replace view public.public_profiles as
  select id, slug, full_name, title, bio, session_types, session_price, avatar_url
  from public.profiles;

grant usage  on schema public to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- ============================================================
-- INDEX'LER
-- ============================================================

create index if not exists idx_profiles_slug        on public.profiles         (slug);
create index if not exists idx_profiles_email       on public.profiles         (email);
create index if not exists idx_clients_psych        on public.clients          (psychologist_id);
create index if not exists idx_appts_psych_time     on public.appointments     (psychologist_id, starts_at);
create index if not exists idx_appts_status         on public.appointments     (status);
create index if not exists idx_tests_psych_slug     on public.tests            (psychologist_id, slug);
create index if not exists idx_tests_public         on public.tests            (is_public) where is_public = true;
create index if not exists idx_test_resp_test       on public.test_responses   (test_id);
create index if not exists idx_test_resp_psych      on public.test_responses   (psychologist_id);
create index if not exists idx_hw_psych_slug        on public.homework         (psychologist_id, slug);
create index if not exists idx_hw_resp_hw           on public.homework_responses (homework_id);
create index if not exists idx_hw_resp_psych        on public.homework_responses (psychologist_id);
create index if not exists idx_finance_psych_date   on public.finance_entries  (psychologist_id, entry_date);
create index if not exists idx_files_psych          on public.files            (psychologist_id);
create index if not exists idx_files_category       on public.files            (psychologist_id, category);
create index if not exists idx_rss_feeds_owner      on public.rss_feeds        (psychologist_id);
create index if not exists idx_session_notes_psych  on public.session_notes    (psychologist_id);
create index if not exists idx_connections_req      on public.connections      (requester_id);
create index if not exists idx_connections_addr     on public.connections      (addressee_id);
create index if not exists idx_teams_slug           on public.teams            (slug);
create index if not exists idx_teams_owner          on public.teams            (owner_id);
create index if not exists idx_tm_team              on public.team_members     (team_id);
create index if not exists idx_tm_psych             on public.team_members     (psychologist_id);
create index if not exists idx_tm_status            on public.team_members     (status);
create index if not exists idx_tm_team_status       on public.team_members     (team_id, status);

-- session_notes: randevu başına tek not
create unique index if not exists idx_session_notes_appt_unique
  on public.session_notes (appointment_id);

-- ============================================================
-- TRIGGER FONKSİYONU: updated_at otomatik güncelle
-- profiles, clients, teams, session_notes tablolarında kullanılır
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at     on public.profiles;
drop trigger if exists clients_updated_at      on public.clients;
drop trigger if exists teams_updated_at        on public.teams;
drop trigger if exists session_notes_updated_at on public.session_notes;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger session_notes_updated_at
  before update on public.session_notes
  for each row execute function public.set_updated_at();

-- ============================================================
-- TRIGGER: Yeni kullanıcıda otomatik profil oluştur  [+003]
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, slug, full_name, email)
  values (
    new.id,
    substr(new.email, 1, strpos(new.email, '@') - 1),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET NOTU
-- Supabase Dashboard > Storage > New bucket:
--   Ad    : psychologist-documents
--   Public: kapalı (private)
--
-- Storage > Policies (psychologist-documents bucket için):
--   SELECT : (storage.foldername(name))[1] = auth.uid()::text
--   INSERT : (storage.foldername(name))[1] = auth.uid()::text
--   DELETE : (storage.foldername(name))[1] = auth.uid()::text
-- ============================================================
