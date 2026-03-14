-- ============================================================
-- PsikoPanel — SADECE RLS & INDEX
-- Tablolar zaten varsa bunu çalıştırın (001 yerine)
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.clients            enable row level security;
alter table public.appointments       enable row level security;
alter table public.tests              enable row level security;
alter table public.test_responses     enable row level security;
alter table public.homework           enable row level security;
alter table public.homework_responses enable row level security;
alter table public.finance_entries    enable row level security;

-- Mevcut policy'leri temizle
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'profiles','clients','appointments','tests',
      'test_responses','homework','homework_responses','finance_entries')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "profiles_public_read"     on public.profiles         for select using (true);
create policy "profiles_owner_insert"    on public.profiles         for insert with check (auth.uid() = id);
create policy "profiles_owner_update"    on public.profiles         for update using (auth.uid() = id);
create policy "profiles_owner_delete"    on public.profiles         for delete using (auth.uid() = id);

create policy "clients_owner"            on public.clients          for all    using (auth.uid() = psychologist_id);

create policy "appts_owner_all"          on public.appointments     for all    using (auth.uid() = psychologist_id);
create policy "appts_public_insert"      on public.appointments     for insert with check (true);

create policy "tests_owner_all"          on public.tests            for all    using (auth.uid() = psychologist_id);
create policy "tests_public_read"        on public.tests            for select using (is_active = true);

create policy "test_resp_owner_read"     on public.test_responses   for select using (
  auth.uid() = (select psychologist_id from public.tests where id = test_id));
create policy "test_resp_public_insert"  on public.test_responses   for insert with check (true);

create policy "hw_owner_all"             on public.homework         for all    using (auth.uid() = psychologist_id);
create policy "hw_public_read"           on public.homework         for select using (is_active = true);

create policy "hw_resp_owner_read"       on public.homework_responses for select using (
  auth.uid() = (select psychologist_id from public.homework where id = homework_id));
create policy "hw_resp_public_insert"    on public.homework_responses for insert with check (true);

create policy "finance_owner"            on public.finance_entries  for all    using (auth.uid() = psychologist_id);

create index if not exists idx_appts_psych_time   on public.appointments   (psychologist_id, starts_at);
create index if not exists idx_appts_status        on public.appointments   (status);
create index if not exists idx_clients_psych        on public.clients        (psychologist_id);
create index if not exists idx_tests_psych_slug     on public.tests          (psychologist_id, slug);
create index if not exists idx_hw_psych_slug        on public.homework       (psychologist_id, slug);
create index if not exists idx_finance_psych_date   on public.finance_entries(psychologist_id, entry_date);
