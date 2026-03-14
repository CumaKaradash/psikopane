-- ============================================================
-- PsikoPanel — Files Table Migration
-- Psikolog dosya yükleme sistemi için gerekli tablo
-- ArchiveUploader ve FileActions bileşenleri bu tabloyu kullanır
-- ============================================================

create table if not exists public.files (
  id              uuid primary key default uuid_generate_v4(),
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  file_name       text not null,
  storage_path    text not null,
  file_type       text not null default 'unknown',
  file_size       integer not null default 0,
  category        text not null default 'Diğer Dökümanlar',
  notes           text,
  created_at      timestamptz default now()
);

-- RLS
alter table public.files enable row level security;

drop policy if exists "files_owner" on public.files;
create policy "files_owner" on public.files
  for all using (auth.uid() = psychologist_id);

-- Index
create index if not exists idx_files_psych on public.files (psychologist_id);
create index if not exists idx_files_category on public.files (psychologist_id, category);

-- ============================================================
-- NOT: Supabase Dashboard > Storage'da aşağıdaki bucket'ı oluşturun:
-- Bucket adı: psychologist-documents
-- Public: false (private)
-- RLS policy: authenticated users can upload/download kendi dosyalarını
-- ============================================================
