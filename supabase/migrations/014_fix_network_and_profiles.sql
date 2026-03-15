-- ============================================================
-- PsikoPanel — Düzeltme: Network RLS + Profil e-posta araması
-- ============================================================

-- ── 1. profiles tablosu: e-posta ile arama için policy ekle ──────────────────
-- 007_security_hardening.sql profiles_owner_select'i koydu ama diğer
-- psikologların profillerini e-posta ile aramayı engelledi.
-- Network özelliği için authenticated kullanıcıların başkalarını
-- e-posta ile arayabilmesi gerekiyor.

drop policy if exists "profiles_email_search" on public.profiles;

create policy "profiles_email_search" on public.profiles
  for select
  using (
    -- Kendi profilini her zaman görebilir
    auth.uid() = id
    OR
    -- Diğer psikologları e-posta ile arayabilir (sadece authenticated)
    auth.uid() is not null
  );

-- ── 2. team_members: INSERT policy'sini WITH CHECK ile düzelt ────────────────
-- 012_fix_network_rls.sql'deki tm_owner_all policy'si USING kısmında
-- teams tablosuna alt sorgu yapıyor; bu INSERT'te sonsuz döngüye yol açıyor.

drop policy if exists "tm_owner_all" on public.team_members;

-- Okuma/güncelleme/silme: takım sahibi teams tablosuna bakarak kontrol eder
create policy "tm_owner_select_update_delete" on public.team_members
  for select
  using (
    psychologist_id = auth.uid()
    OR exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and t.owner_id = auth.uid()
    )
  );

-- INSERT: kendi eklemesi (owner olarak) veya takım sahibi tarafından ekleme
-- WITH CHECK direkt kolon kontrolü yapar — sonsuz döngü yok
create policy "tm_insert" on public.team_members
  for insert
  with check (
    -- Kendi kendini ekleyebilir (takım sahibi otomatik owner ekleme)
    psychologist_id = auth.uid()
    OR
    -- Takım sahibi başkasını ekleyebilir
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and t.owner_id = auth.uid()
    )
  );

create policy "tm_owner_delete" on public.team_members
  for delete
  using (
    psychologist_id = auth.uid()
    OR exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and t.owner_id = auth.uid()
    )
  );

-- tm_self_select artık tm_owner_select_update_delete içinde kapsandı
drop policy if exists "tm_self_select" on public.team_members;

-- ── 3. Index: e-posta araması için ───────────────────────────────────────────
create index if not exists idx_profiles_email on public.profiles (email);
