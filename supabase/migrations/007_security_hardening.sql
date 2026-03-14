-- ============================================================
-- PsikoPanel — Güvenlik Sertleştirme Migration
-- 003-005 migration'larını tek dosyada derler + ek düzeltmeler
-- ============================================================

-- ── 1. N+1 RLS Performans Düzeltmesi ─────────────────────────────────────────
-- test_responses ve homework_responses tablolarına psychologist_id ekle
-- böylece RLS policy'si subquery yerine direkt kolon karşılaştırması yapar

alter table public.test_responses
  add column if not exists psychologist_id uuid
  references public.profiles(id) on delete cascade;

alter table public.homework_responses
  add column if not exists psychologist_id uuid
  references public.profiles(id) on delete cascade;

-- Mevcut kayıtları güncelle (backfill)
update public.test_responses
  set psychologist_id = (select psychologist_id from public.tests where id = test_id)
  where psychologist_id is null;

update public.homework_responses
  set psychologist_id = (select psychologist_id from public.homework where id = homework_id)
  where psychologist_id is null;

-- NOT NULL constraint ekle (backfill sonrası)
alter table public.test_responses
  alter column psychologist_id set not null;

alter table public.homework_responses
  alter column psychologist_id set not null;

-- ── 2. RLS Policy'lerini Güncelle (N+1'siz) ──────────────────────────────────
drop policy if exists "test_resp_owner_read"      on public.test_responses;
drop policy if exists "test_resp_public_insert"   on public.test_responses;
drop policy if exists "hw_resp_owner_read"        on public.homework_responses;
drop policy if exists "hw_resp_public_insert"     on public.homework_responses;

create policy "test_resp_owner_read" on public.test_responses
  for select using (auth.uid() = psychologist_id);

create policy "test_resp_insert" on public.test_responses
  for insert with check (true);  -- public endpoint; rate limit API'de uygulanıyor

create policy "hw_resp_owner_read" on public.homework_responses
  for select using (auth.uid() = psychologist_id);

create policy "hw_resp_insert" on public.homework_responses
  for insert with check (true);

-- ── 3. Appointments Public Insert Kaldır ─────────────────────────────────────
-- Artık API route üzerinden service role ile ekleme yapılıyor
drop policy if exists "appts_public_insert" on public.appointments;

-- ── 4. Profiller Gizlilik Düzeltmesi ─────────────────────────────────────────
-- Eski public read (telefon, email gibi hassas alanlar açıktı) kaldır
drop policy if exists "profiles_public_read" on public.profiles;

-- Sadece gerekli alanları açıklayan view
create or replace view public.public_profiles as
  select id, slug, full_name, title, bio, session_types, session_price, avatar_url
  from public.profiles;

grant usage  on schema public to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- Owner-only select
drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = id);

-- ── 5. Performans Index'leri ──────────────────────────────────────────────────
create index if not exists idx_test_resp_psych  on public.test_responses  (psychologist_id);
create index if not exists idx_hw_resp_psych    on public.homework_responses (psychologist_id);
create index if not exists idx_test_resp_test   on public.test_responses  (test_id);
create index if not exists idx_hw_resp_hw       on public.homework_responses (homework_id);
