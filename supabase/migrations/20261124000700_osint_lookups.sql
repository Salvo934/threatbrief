-- Strumento OSINT: registro di ricerca. Ogni indagine salva indicatore, fonti interrogate (URL,
-- esito, tempo, ora di consultazione), dati raccolti, segnali e giudizio: ripetibile e citabile.
-- Privato: solo l'analista che l'ha eseguita lo vede.
create table public.osint_lookups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  query      text not null check (char_length(query) <= 2048),
  kind       text not null,
  verdict    text not null,
  admiralty  text not null,
  signals    jsonb not null default '[]',
  sources    jsonb not null default '[]',  -- [{ name, url, ok, status, ms, fetched_at, error }]
  result     jsonb not null default '{}',
  note       text check (char_length(note) <= 2000),  -- appunti dell'analista
  created_at timestamptz not null default now()
);
create index on public.osint_lookups (user_id, created_at desc);

alter table public.osint_lookups enable row level security;
create policy "osint_lookups: own read" on public.osint_lookups
  for select to authenticated using (user_id = (select auth.uid()) and (select private.is_analyst()));
create policy "osint_lookups: analyst insert" on public.osint_lookups
  for insert to authenticated with check (user_id = (select auth.uid()) and (select private.is_analyst()));
create policy "osint_lookups: own note" on public.osint_lookups
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "osint_lookups: own delete" on public.osint_lookups
  for delete to authenticated using (user_id = (select auth.uid()));
