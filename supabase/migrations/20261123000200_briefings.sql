-- Briefing pubblico: versione TLP:CLEAR di un digest rivisto, pubblicata esplicitamente
-- dall'analista (massimo 5 punti). Lettura pubblica, scrittura solo analista.
create table public.briefings (
  id           uuid primary key default gen_random_uuid(),
  digest_id    uuid unique references public.digests (id) on delete set null,
  brief_date   date not null unique,
  title        text not null check (char_length(title) <= 160),
  intro        text check (char_length(intro) <= 600),
  items        jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 5),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null default auth.uid()
);
create index on public.briefings (published_by);
create index on public.briefings (brief_date desc);

alter table public.briefings enable row level security;
create policy "briefings: public read" on public.briefings for select to anon, authenticated using (true);
create policy "briefings: analyst insert" on public.briefings for insert to authenticated with check ((select private.is_analyst()));
create policy "briefings: analyst update" on public.briefings for update to authenticated using ((select private.is_analyst())) with check ((select private.is_analyst()));
create policy "briefings: analyst delete" on public.briefings for delete to authenticated using ((select private.is_analyst()));
