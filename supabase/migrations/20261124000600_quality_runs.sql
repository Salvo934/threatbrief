-- Controllo qualità dei dati: ogni settimana uno script ricontrolla un campione di dati sulle
-- fonti originali. Lettura pubblica (trasparenza): contiene solo dati pubblici e riepiloghi.
create table public.quality_runs (
  id       uuid primary key default gen_random_uuid(),
  run_at   timestamptz not null default now(),
  summary  jsonb not null,   -- { area: { checked, ok } }
  checks   jsonb not null    -- [{ area, item, ok, detail, url }]
);
create index on public.quality_runs (run_at desc);

alter table public.quality_runs enable row level security;
create policy "quality_runs: public read" on public.quality_runs
  for select to anon, authenticated using (true);
