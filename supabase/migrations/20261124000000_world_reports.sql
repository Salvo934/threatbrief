-- Rapporto della notte: fotografia automatica delle ultime 24 ore nel mondo (rivendicazioni
-- ransomware, malware più segnalati, nuove KEV) con tecniche ATT&CK ricorrenti e difese prioritarie.
-- Generato dallo script di ingestion (chiave segreta, bypassa la RLS); lettura pubblica.
-- Contiene solo conteggi aggregati: nessun nome di vittima.
create table public.world_reports (
  id           uuid primary key default gen_random_uuid(),
  report_date  date not null unique,
  window_start timestamptz not null,
  window_end   timestamptz not null,
  generated_at timestamptz not null default now(),
  data         jsonb not null check (jsonb_typeof(data) = 'object')
);
create index on public.world_reports (report_date desc);

alter table public.world_reports enable row level security;
create policy "world_reports: public read" on public.world_reports
  for select to anon, authenticated using (true);
-- Nessuna policy di scrittura: scrive solo service_role (ingestion).

comment on table public.world_reports is
  'Rapporto automatico notturno (non rivisto da un analista): solo dati aggregati da fonti aperte.';
