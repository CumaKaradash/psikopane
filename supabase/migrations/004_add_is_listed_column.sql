-- ============================================================
-- PsikoPanel — 004_add_is_listed_column.sql
-- profiles tablosuna is_listed column'unu ekler
-- ============================================================

-- profiles tablosuna is_listed column'unu ekle
-- Varsayılan değer false - kullanıcılar varsayılan olarak gizlidir
alter table public.profiles 
add column if not exists is_listed boolean default false;

-- Mevcut kayıtları false olarak güncelle (isteğe bağlı - kullanıcılar aktif olarak açmalı)
update public.profiles 
set is_listed = false 
where is_listed is null;

-- Index ekle performans için
create index if not exists idx_profiles_is_listed on public.profiles(is_listed);
