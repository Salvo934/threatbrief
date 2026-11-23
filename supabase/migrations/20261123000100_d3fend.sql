-- MITRE D3FEND: contromisure difensive per ogni tecnica ATT&CK (API ufficiale d3fend.mitre.org).
-- Dati pubblici di riferimento: lettura per tutti, scrittura solo dall'ingestion (service role).
insert into public.sources (id, name, homepage_url, requires_api_key)
values ('mitre_d3fend', 'MITRE D3FEND', 'https://d3fend.mitre.org', false)
on conflict (id) do nothing;

create table public.d3fend_countermeasures (
  attack_external_id text not null,   -- es. T1003.001
  d3fend_id          text not null,   -- es. D3-PLA
  label              text not null,   -- es. Process Lineage Analysis
  tactic             text not null,   -- Model | Harden | Detect | Isolate | Deceive | Evict | Restore
  iri_name           text not null,   -- es. ProcessLineageAnalysis (per il link alla pagina D3FEND)
  primary key (attack_external_id, d3fend_id)
);
create index on public.d3fend_countermeasures (d3fend_id);

alter table public.d3fend_countermeasures enable row level security;
create policy "d3fend: public read" on public.d3fend_countermeasures for select to anon, authenticated using (true);
