-- Difesa e aerospazio: avvisi ufficiali (CISA e partner) rilevanti per la filiera della difesa,
-- rilevati automaticamente, con una bozza di report creata per l'analista.
insert into public.sources (id, name, homepage_url, requires_api_key)
values ('cisa_advisories', 'CISA Cybersecurity Advisories', 'https://www.cisa.gov/news-events/cybersecurity-advisories', false)
on conflict (id) do nothing;

create table public.defense_alerts (
  id            uuid primary key default gen_random_uuid(),
  intel_item_id bigint not null unique references public.intel_items (id) on delete cascade,
  reasons       text[] not null check (cardinality(reasons) > 0),  -- perché è rilevante (frasi dell'avviso)
  actors        jsonb not null default '[]',   -- [{external_id, name, alias}] citati nell'avviso
  technique_ids text[] not null default '{}',  -- T-id citati
  cves          text[] not null default '{}',
  report_id     uuid unique references public.reports (id) on delete set null,
  detected_at   timestamptz not null default now()
);
create index on public.defense_alerts (detected_at desc);

alter table public.defense_alerts enable row level security;
create policy "defense_alerts: public read" on public.defense_alerts
  for select to anon, authenticated using (true);
-- Scrive solo service_role (ingestion).

-- Report generati automaticamente: l'editor li segnala come «bozza automatica».
alter table public.reports add column auto_generated boolean not null default false;
