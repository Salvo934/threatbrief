-- Digest giornaliero: bozza automatica (dati delle fonti) + revisione dell'analista.
-- Area di lavoro privata: nessun accesso anon, lettura e scrittura solo per gli analisti.

create type public.digest_priority as enum ('azione', 'monitorare', 'info', 'escludi');

create table public.digests (
  id            uuid primary key default gen_random_uuid(),
  digest_date   date not null unique,                 -- giorno (Europe/Rome) del digest
  window_start  timestamptz not null,
  window_end    timestamptz not null,
  generated_at  timestamptz not null default now(),
  generated_by  text not null check (generated_by in ('automatico', 'analista')),
  items         jsonb not null default '[]',          -- elementi della bozza (chiavi stabili)
  status        text not null default 'bozza' check (status in ('bozza', 'rivisto')),
  reviewed_at   timestamptz,
  reviewed_by   uuid references auth.users (id) on delete set null,
  check (window_end > window_start)
);

-- Una revisione per elemento: priorità scelta dall'analista e le sue due righe.
create table public.digest_reviews (
  digest_id  uuid not null references public.digests (id) on delete cascade,
  item_key   text not null,
  priority   public.digest_priority not null,
  relevance  text check (char_length(relevance) <= 600),  -- perché ci riguarda
  action     text check (char_length(action) <= 600),     -- cosa fare
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  primary key (digest_id, item_key)
);
create index on public.digest_reviews (updated_by);
create index on public.digests (reviewed_by);

alter table public.digests enable row level security;
alter table public.digest_reviews enable row level security;

create policy "digests: analyst read" on public.digests
  for select to authenticated using ((select private.is_analyst()));
create policy "digests: analyst insert" on public.digests
  for insert to authenticated with check ((select private.is_analyst()));
create policy "digests: analyst update" on public.digests
  for update to authenticated using ((select private.is_analyst())) with check ((select private.is_analyst()));

create policy "digest_reviews: analyst all" on public.digest_reviews
  for all to authenticated
  using ((select private.is_analyst()))
  with check ((select private.is_analyst()));
