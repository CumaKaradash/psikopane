-- ============================================================
-- PsikoPanel — Public Tests / Community Pool
-- ============================================================

-- tests tablosuna is_public sütunu ekle
alter table public.tests
  add column if not exists is_public boolean not null default false;

comment on column public.tests.is_public is
  'true → Topluluk havuzunda diğer psikologlar görebilir';

-- Mevcut testler için RLS güncelleme:
-- Psikologlar kendi testlerini yönetir + public testleri görür
drop policy if exists "tests_owner_all"   on public.tests;
drop policy if exists "tests_public_read" on public.tests;

-- Sahip: tüm CRUD
create policy "tests_owner_all" on public.tests
  for all using (auth.uid() = psychologist_id);

-- Giriş yapmış psikologlar: is_public = true olanları okuyabilir
create policy "tests_community_read" on public.tests
  for select using (is_public = true and auth.uid() is not null);

-- Danışanlar: aktif testleri okuyabilir (link ile erişim)
create policy "tests_active_public" on public.tests
  for select using (is_active = true);

-- Index
create index if not exists idx_tests_public on public.tests (is_public)
  where is_public = true;
