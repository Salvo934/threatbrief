-- Monitoraggio: rivendicazioni ransomware/estorsione nel mondo (ransomware.live), per la mappa.
-- Solo dati aggregabili: gruppo, paese, settore, ora. Il nome della vittima NON viene salvato;
-- external_id è un'impronta (hash) usata solo per non contare due volte lo stesso evento.
create table public.world_claims (
  external_id   text primary key,          -- sha1(gruppo|vittima): non reversibile in pratica
  group_name    text not null,
  country       char(2),                   -- ISO 3166-1 alpha-2 della vittima, se dichiarato
  sector_raw    text,                      -- categoria di ransomware.live (inglese)
  discovered_at timestamptz not null       -- quando ransomware.live ha visto la rivendicazione
);
create index on public.world_claims (discovered_at desc);

alter table public.world_claims enable row level security;
create policy "world_claims: public read" on public.world_claims
  for select to anon, authenticated using (true);

-- Conserviamo 30 giorni: la mappa mostra al massimo una settimana.
create or replace function public.purge_old_world_claims()
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.world_claims where discovered_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.purge_old_world_claims() from public, anon, authenticated;
grant execute on function public.purge_old_world_claims() to service_role;

-- Fonte per la raccolta mondiale (monitoraggio).
insert into public.sources (id, name, homepage_url, requires_api_key)
values ('ransomware_live_world', 'ransomware.live (mondo)', 'https://www.ransomware.live', false)
on conflict (id) do nothing;
