-- ============================================================
-- PsikoPanel — Data Privacy Migration
-- Creates public_profiles view with only safe fields
-- ============================================================

-- Drop the old public_read policy that exposes sensitive data
drop policy if exists "profiles_public_read" on public.profiles;

-- Create a secure public profiles view with only safe fields
create or replace view public.public_profiles as
select 
  id,
  slug,
  full_name,
  title,
  bio,
  session_types,
  session_price,
  avatar_url
from public.profiles;

-- Grant public access to the view
grant usage on schema public to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- Create new policy for profiles (owner access only)
create policy "profiles_owner_select" on public.profiles for select 
using (auth.uid() = id);
create policy "profiles_owner_insert" on public.profiles for insert 
with check (auth.uid() = id);
create policy "profiles_owner_update" on public.profiles for update 
using (auth.uid() = id);
create policy "profiles_owner_delete" on public.profiles for delete 
using (auth.uid() = id);
