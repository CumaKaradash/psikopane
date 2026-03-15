-- ============================================================
-- PsikoPanel — Fix team_members infinite recursion in RLS
-- ============================================================

-- Mevcut tüm team_members politikalarını kaldır
drop policy if exists "team_members_owner_all"   on public.team_members;
drop policy if exists "team_members_member_read" on public.team_members;
drop policy if exists "team_members_select"      on public.team_members;
drop policy if exists "team_members_insert"      on public.team_members;
drop policy if exists "team_members_delete"      on public.team_members;
drop policy if exists "team_members_all"         on public.team_members;

-- ── Yeni politikalar (recursive olmayan) ─────────────────────────────────

-- Takım sahibi: teams tablosuna direkt bak, team_members'a değil
create policy "tm_owner_all" on public.team_members
  for all
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and t.owner_id = auth.uid()
    )
  );

-- Takım üyesi: kendi kaydını okuyabilir
create policy "tm_self_select" on public.team_members
  for select
  using (psychologist_id = auth.uid());

-- ── connections tablosundaki olası recursive politikaları da düzelt ──────

-- Mevcut connection politikalarını kaldır ve yeniden yaz
drop policy if exists "connections_owner_all"   on public.connections;
drop policy if exists "connections_select"      on public.connections;
drop policy if exists "connections_insert"      on public.connections;
drop policy if exists "connections_update"      on public.connections;
drop policy if exists "connections_delete"      on public.connections;

-- Bağlantı: sadece taraflardan biri okuyabilir/yönetebilir
create policy "conn_parties_select" on public.connections
  for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "conn_requester_insert" on public.connections
  for insert
  with check (requester_id = auth.uid());

create policy "conn_addressee_update" on public.connections
  for update
  using (addressee_id = auth.uid());

create policy "conn_parties_delete" on public.connections
  for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());
