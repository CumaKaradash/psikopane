-- ============================================================
-- PsikoPanel — RSS Feeds per user
-- ============================================================

create table if not exists public.rss_feeds (
  id             uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.profiles(id) on delete cascade,
  url            text not null,
  label          text,
  created_at     timestamptz not null default now()
);

-- RLS
alter table public.rss_feeds enable row level security;

create policy "rss_feeds_owner_all" on public.rss_feeds
  for all using (auth.uid() = psychologist_id);

-- Index
create index if not exists idx_rss_feeds_owner on public.rss_feeds (psychologist_id);
