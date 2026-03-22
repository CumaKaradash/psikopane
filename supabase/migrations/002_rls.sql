-- ============================================================
-- PsikoPanel — 002_rls.sql
-- Tüm Row Level Security policy'leri — son ve doğru hali
-- ============================================================

-- RLS aktif et
alter table public.profiles           enable row level security;
alter table public.clients            enable row level security;
alter table public.appointments       enable row level security;
alter table public.tests              enable row level security;
alter table public.test_responses     enable row level security;
alter table public.homework           enable row level security;
alter table public.homework_responses enable row level security;
alter table public.finance_entries    enable row level security;
alter table public.files              enable row level security;
alter table public.rss_feeds          enable row level security;
alter table public.session_notes      enable row level security;
alter table public.connections        enable row level security;
alter table public.teams              enable row level security;
alter table public.team_members       enable row level security;

-- Tüm mevcut policy'leri temizle (idempotent çalışma için)
do $$ declare r record; begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','clients','appointments','tests','test_responses',
        'homework','homework_responses','finance_entries','files',
        'rss_feeds','session_notes','connections','teams','team_members'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Authenticated kullanıcılar başkalarını (e-posta ile) arayabilsin [014]
-- Hassas alanlar (phone vb.) public_profiles view'ında zaten gizlendi [004/007]
create policy "profiles_read"
  on public.profiles for select
  using (auth.uid() = id or auth.uid() is not null);

create policy "profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_delete"
  on public.profiles for delete
  using (auth.uid() = id);

-- ── clients ───────────────────────────────────────────────────────────────────
create policy "clients_owner"
  on public.clients for all
  using (auth.uid() = psychologist_id);

-- ── appointments ─────────────────────────────────────────────────────────────
-- Public insert kaldırıldı [005]: randevular API üzerinden eklenir (rate-limit korumalı)
create policy "appts_owner"
  on public.appointments for all
  using (auth.uid() = psychologist_id);

-- ── tests ─────────────────────────────────────────────────────────────────────
create policy "tests_owner"
  on public.tests for all
  using (auth.uid() = psychologist_id);

-- Authenticated psikologlar topluluk havuzunu görür [010]
create policy "tests_community_read"
  on public.tests for select
  using (is_public = true and auth.uid() is not null);

-- Danışanlar aktif testi link ile açabilir (anonim dahil)
create policy "tests_active_read"
  on public.tests for select
  using (is_active = true);

-- ── test_responses ────────────────────────────────────────────────────────────
-- psychologist_id NOT NULL (003/007) — doğrudan kolon karşılaştırması, N+1 yok
create policy "test_resp_owner_read"
  on public.test_responses for select
  using (auth.uid() = psychologist_id);

-- Danışanlar yanıt gönderebilir — rate-limit API katmanında uygulanır
create policy "test_resp_insert"
  on public.test_responses for insert
  with check (true);

-- ── homework ──────────────────────────────────────────────────────────────────
create policy "hw_owner"
  on public.homework for all
  using (auth.uid() = psychologist_id);

create policy "hw_active_read"
  on public.homework for select
  using (is_active = true);

-- ── homework_responses ────────────────────────────────────────────────────────
-- psychologist_id NOT NULL (003/007) — doğrudan kolon karşılaştırması, N+1 yok
create policy "hw_resp_owner_read"
  on public.homework_responses for select
  using (auth.uid() = psychologist_id);

create policy "hw_resp_insert"
  on public.homework_responses for insert
  with check (true);

-- ── finance_entries ───────────────────────────────────────────────────────────
create policy "finance_owner"
  on public.finance_entries for all
  using (auth.uid() = psychologist_id);

-- ── files ─────────────────────────────────────────────────────────────────────
create policy "files_owner"
  on public.files for all
  using (auth.uid() = psychologist_id);

-- ── rss_feeds ─────────────────────────────────────────────────────────────────
create policy "rss_feeds_owner"
  on public.rss_feeds for all
  using (auth.uid() = psychologist_id);

-- ── session_notes ─────────────────────────────────────────────────────────────
create policy "session_notes_owner"
  on public.session_notes for all
  using (auth.uid() = psychologist_id);

-- ── connections ───────────────────────────────────────────────────────────────
-- Recursive olmayan politikalar [012]
create policy "conn_read"
  on public.connections for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "conn_insert"
  on public.connections for insert
  with check (requester_id = auth.uid());

-- Alıcı taraf durumu günceller; updated_at kod tarafında manuel set edilir
create policy "conn_update"
  on public.connections for update
  using (addressee_id = auth.uid());

create policy "conn_delete"
  on public.connections for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ── teams ─────────────────────────────────────────────────────────────────────
-- Herkes okur — danışanlar randevu sayfasına (/{slug}/booking) erişebilsin [011]
create policy "teams_public_read"
  on public.teams for select
  using (true);

create policy "teams_owner_insert"
  on public.teams for insert
  with check (owner_id = auth.uid());

create policy "teams_owner_update"
  on public.teams for update
  using (owner_id = auth.uid());

create policy "teams_owner_delete"
  on public.teams for delete
  using (owner_id = auth.uid());

-- ── team_members ──────────────────────────────────────────────────────────────
-- Recursive olmayan + davet sistemi destekli [012/014/015]
--
-- TASARIM NOTU:
--   EXISTS yerine IN kullanıldı: her ikisi de teams tablosuna gider,
--   team_members'a dönmez → sonsuz döngü riski yok.
--   IN, PostgreSQL planner tarafından semi-join olarak optimize edilir.

-- Takım sahibi: tüm üyeleri okur, ekler, günceller, siler
create policy "tm_owner_all"
  on public.team_members for all
  using (
    team_id in (select id from public.teams where owner_id = auth.uid())
  );

-- Üye: kendi kaydını okur
create policy "tm_member_read"
  on public.team_members for select
  using (psychologist_id = auth.uid());

-- Üye: sadece kendi davet durumunu accepted/rejected yapabilir [015]
create policy "tm_member_update"
  on public.team_members for update
  using (psychologist_id = auth.uid())
  with check (
    psychologist_id = auth.uid()
    and status in ('accepted', 'rejected')
  );

-- Takım sahibi yeni üye davet eder
-- WITH CHECK + teams subquery: team_members'a dönmez → recursive yok [014]
create policy "tm_insert"
  on public.team_members for insert
  with check (
    team_id in (select id from public.teams where owner_id = auth.uid())
  );
