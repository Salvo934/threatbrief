-- Regole di rilevamento Sigma generate dalle tecniche di un report (bozze con IA, «da testare»).
-- Lo YAML è scritto dal codice dopo la validazione (supabase/functions/sigma/rules.ts).
create table public.detection_rules (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports (id) on delete cascade,
  technique_id  text not null,           -- es. T1059.001, sempre tra le tecniche del report
  title         text not null,
  level         text not null check (level in ('informational', 'low', 'medium', 'high', 'critical')),
  logsource     text not null,           -- es. «windows / process_creation», per l'elenco
  yaml          text not null,
  model         text,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index on public.detection_rules (report_id);
create index on public.detection_rules (created_by);

alter table public.detection_rules enable row level security;
-- Pubbliche solo se il report è pubblicato e TLP:CLEAR; l'analista le vede tutte.
create policy "detection_rules: public read" on public.detection_rules
  for select to anon, authenticated using (
    exists (select 1 from public.reports r where r.id = report_id and r.status = 'published' and r.tlp = 'CLEAR')
    or (select private.is_analyst())
  );
create policy "detection_rules: analyst insert" on public.detection_rules
  for insert to authenticated with check ((select private.is_analyst()));
create policy "detection_rules: analyst delete" on public.detection_rules
  for delete to authenticated using ((select private.is_analyst()));
