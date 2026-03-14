-- ============================================================
-- PsikoPanel — Teams & Network Migration
-- Psikologlar arası meslektaş eşleşmesi ve ortak klinik
-- ============================================================

-- ── Takımlar ─────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

-- ── Takım üyeleri ─────────────────────────────────────────────────────────────
create type if not exists public.team_role as enum ('owner', 'member');

create table if not exists public.team_members (
  id            uuid primary key default uuid_generate_v4(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  role          public.team_role default 'member',
  joined_at     timestamptz default now(),
  unique(team_id, psychologist_id)
);

-- ── Bağlantı istekleri (meslektaş ağı) ───────────────────────────────────────
create type if not exists public.connection_status as enum ('pending', 'accepted', 'rejected');

create table if not exists public.connections (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        public.connection_status default 'pending',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.connections  enable row level security;

-- Teams: üye veya sahip görebilir; sahip yönetir
create policy "teams_member_select" on public.teams
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.team_members
      where team_id = id and psychologist_id = auth.uid()
    )
  );
create policy "teams_owner_insert" on public.teams
  for insert with check (auth.uid() = owner_id);
create policy "teams_owner_update" on public.teams
  for update using (auth.uid() = owner_id);
create policy "teams_owner_delete" on public.teams
  for delete using (auth.uid() = owner_id);

-- Team members: takım üyeleri birbirini görebilir
create policy "tm_member_select" on public.team_members
  for select using (
    auth.uid() = psychologist_id
    or exists (
      select 1 from public.team_members tm2
      where tm2.team_id = team_id and tm2.psychologist_id = auth.uid()
    )
  );
create policy "tm_owner_insert" on public.team_members
  for insert with check (
    exists (
      select 1 from public.teams
      where id = team_id and owner_id = auth.uid()
    )
  );
create policy "tm_owner_delete" on public.team_members
  for delete using (
    psychologist_id = auth.uid()
    or exists (
      select 1 from public.teams
      where id = team_id and owner_id = auth.uid()
    )
  );

-- Connections: taraflardan biri görebilir
create policy "conn_parties_select" on public.connections
  for select using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );
create policy "conn_requester_insert" on public.connections
  for insert with check (auth.uid() = requester_id);
create policy "conn_addressee_update" on public.connections
  for update using (auth.uid() = addressee_id);

-- ── Clients: takım üyeleri paylaşılan danışanları da görebilsin ──────────────
-- NOT: Bu politika MEVCUT clients_owner politikasını genişletir (replace eder)
drop policy if exists "clients_owner"       on public.clients;
drop policy if exists "clients_team_select" on public.clients;

create policy "clients_owner_all" on public.clients
  for all using (auth.uid() = psychologist_id);

-- Takım üyeleri sadece SELECT yapabilir (yazma hakkı yok)
create policy "clients_team_select" on public.clients
  for select using (
    exists (
      select 1
      from public.team_members tm
      join public.team_members tm2 on tm.team_id = tm2.team_id
      where tm.psychologist_id  = public.clients.psychologist_id
        and tm2.psychologist_id = auth.uid()
        and tm2.psychologist_id <> public.clients.psychologist_id
    )
  );

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_team_members_team   on public.team_members (team_id);
create index if not exists idx_team_members_psych  on public.team_members (psychologist_id);
create index if not exists idx_connections_req     on public.connections  (requester_id, status);
create index if not exists idx_connections_addr    on public.connections  (addressee_id, status);
