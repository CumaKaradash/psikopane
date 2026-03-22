-- ============================================================
-- PsikoPanel — 003_storage.sql
-- Storage bucket + RLS policy'leri
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- Bucket oluştur (zaten varsa atla)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'psychologist-documents',
  'psychologist-documents',
  false,
  10485760,  -- 10 MB
  array[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','text/csv',
    'audio/mpeg','audio/wav','audio/ogg',
    'video/mp4','video/quicktime','video/webm'
  ]
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- Storage RLS policy'leri
-- Path formatı: uploads/{user_id}/{filename}
-- (storage.foldername(name))[1] = 'uploads'
-- (storage.foldername(name))[2] = user_id
-- ============================================================

-- Mevcut policy'leri temizle
drop policy if exists "psych_docs_select" on storage.objects;
drop policy if exists "psych_docs_insert" on storage.objects;
drop policy if exists "psych_docs_update" on storage.objects;
drop policy if exists "psych_docs_delete" on storage.objects;

-- SELECT: Kendi dosyalarını görebilir
create policy "psych_docs_select"
  on storage.objects for select
  using (
    bucket_id = 'psychologist-documents'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- INSERT: Kendi klasörüne yükleyebilir
create policy "psych_docs_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'psychologist-documents'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- UPDATE: Kendi dosyalarını güncelleyebilir
create policy "psych_docs_update"
  on storage.objects for update
  using (
    bucket_id = 'psychologist-documents'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- DELETE: Kendi dosyalarını silebilir
create policy "psych_docs_delete"
  on storage.objects for delete
  using (
    bucket_id = 'psychologist-documents'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
