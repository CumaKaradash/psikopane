-- ============================================================
-- PsikoPanel — Team Slugs Migration
-- teams tablosuna slug sütunu + ortak klinik randevu altyapısı
-- ============================================================

-- 1. slug sütunu ekle
alter table public.teams
  add column if not exists slug text;

-- 2. Mevcut kayıtlar için slug üret (id bazlı geçici)
update public.teams
  set slug = 'klinik-' || substr(id::text, 1, 8)
  where slug is null;

-- 3. NOT NULL + UNIQUE constraint
alter table public.teams
  alter column slug set not null;

-- Güvenli Constraint Ekleme (Eğer önceden eklenmişse hata vermemesi için)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_slug_unique'
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT teams_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- 4. Slug ile arama için index
create index if not exists idx_teams_slug on public.teams (slug);

-- 5. teams tablosuna profil benzeri metadata sütunları
--    (booking sayfasında klinik görseli için)
alter table public.teams
  add column if not exists bio           text;
alter table public.teams
  add column if not exists session_types text[] default array['Bireysel Terapi','İlk Görüşme','Online Seans'];
alter table public.teams
  add column if not exists avatar_url    text;

-- 6. RLS: teams_public_read — slug üzerinden booking için herkes okuyabilir
drop policy if exists "teams_public_read" on public.teams;
create policy "teams_public_read" on public.teams
  for select using (true);   -- randevu almak isteyen danışanlar da okuyabilir