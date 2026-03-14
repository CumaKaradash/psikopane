-- ============================================================
-- PsikoPanel — N+1 RLS Performance Fix Migration
-- Adds psychologist_id to test_responses and homework_responses
-- ============================================================

-- Add psychologist_id column to test_responses
alter table public.test_responses 
add column if not exists psychologist_id uuid not null references public.profiles(id) on delete cascade;

-- Add psychologist_id column to homework_responses  
alter table public.homework_responses
add column if not exists psychologist_id uuid not null references public.profiles(id) on delete cascade;

-- Backfill existing data
update public.test_responses 
set psychologist_id = (select psychologist_id from public.tests where id = test_id)
where psychologist_id is null;

update public.homework_responses
set psychologist_id = (select psychologist_id from public.homework where id = homework_id)  
where psychologist_id is null;

-- Drop old RLS policies with subqueries
drop policy if exists "test_resp_owner_read" on public.test_responses;
drop policy if exists "test_resp_public_insert" on public.test_responses;
drop policy if exists "hw_resp_owner_read" on public.homework_responses;
drop policy if exists "hw_resp_public_insert" on public.homework_responses;

-- Create new efficient RLS policies without subqueries
create policy "test_resp_owner_read" on public.test_responses for select 
using (auth.uid() = psychologist_id);

create policy "test_resp_public_insert" on public.test_responses for insert 
with check (true);

create policy "hw_resp_owner_read" on public.homework_responses for select
using (auth.uid() = psychologist_id);

create policy "hw_resp_public_insert" on public.homework_responses for insert
with check (true);

-- Add indexes for performance
create index if not exists idx_test_resp_psych on public.test_responses (psychologist_id);
create index if not exists idx_hw_resp_psych on public.homework_responses (psychologist_id);
