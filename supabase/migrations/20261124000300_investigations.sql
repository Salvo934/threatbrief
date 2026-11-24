-- Agente investigatore: richieste di approfondimento di un report (pulsante «Approfondisci»).
-- L'analista crea la richiesta dall'app (nessun segreto nel Worker); uno script su GitHub Actions
-- la prende in carico, avvia una sessione dell'agente e crea il dossier come nuova bozza.
create type public.investigation_status as enum ('richiesta', 'in_corso', 'completata', 'fallita');

create table public.investigations (
  id               uuid primary key default gen_random_uuid(),
  report_id        uuid not null references public.reports (id) on delete cascade,  -- bozza di partenza
  status           public.investigation_status not null default 'richiesta',
  requested_by     uuid references auth.users (id) on delete set null default auth.uid(),
  requested_at     timestamptz not null default now(),
  started_at       timestamptz,
  finished_at      timestamptz,
  session_id       text,            -- sessione Managed Agents (visibile nella Console)
  dossier_report_id uuid references public.reports (id) on delete set null,
  list_cost_usd    numeric(8, 2),   -- costo di listino della sessione
  summary          text,            -- esito in breve: fonti verificate, affermazioni scartate…
  error            text
);
create index on public.investigations (status, requested_at);
create index on public.investigations (report_id);
create index on public.investigations (requested_by);
create index on public.investigations (dossier_report_id);
-- Una sola richiesta aperta per report.
create unique index investigations_one_open on public.investigations (report_id)
  where status in ('richiesta', 'in_corso');

alter table public.investigations enable row level security;
create policy "investigations: analyst read" on public.investigations
  for select to authenticated using ((select private.is_analyst()));
create policy "investigations: analyst request" on public.investigations
  for insert to authenticated with check ((select private.is_analyst()) and status = 'richiesta');
-- Aggiornamenti e chiusura: solo service_role (lo script).
