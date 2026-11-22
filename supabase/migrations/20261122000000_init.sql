-- =============================================================================
-- ThreatBrief — schema iniziale (Fase 0, PROPOSTA)
--
-- Principi:
--  * RLS attiva su TUTTE le tabelle.
--  * Dati di riferimento (ATT&CK, KEV, IOC, fonti...) leggibili da chiunque
--    (demo pubblica), scrivibili SOLO dall'ingestion lato server con
--    service_role (che bypassa la RLS): nessuna policy di scrittura per i client.
--  * Contenuti dell'analista (analisi, report) scrivibili solo da utenti
--    presenti in public.analysts, e solo sulle proprie righe.
--  * Pubblico vede solo report TLP:CLEAR con stato 'published'.
--  * Separazione FATTI / VALUTAZIONI a livello di schema (report_statements).
--  * Righe dimostrative marcate con is_example = true.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tipi
-- -----------------------------------------------------------------------------
create type public.ioc_type as enum
  ('ipv4', 'ipv6', 'domain', 'url', 'md5', 'sha1', 'sha256', 'cve');

create type public.tlp_level as enum
  ('CLEAR', 'GREEN', 'AMBER', 'AMBER+STRICT', 'RED');

create type public.confidence_level as enum ('alto', 'medio', 'basso');

create type public.run_status as enum ('running', 'ok', 'partial', 'error', 'skipped');

create type public.report_kind as enum ('attore', 'settore', 'evento');

-- draft = bozza; final = chiuso ma non pubblico; published = su /briefs (solo CLEAR)
create type public.report_status as enum ('draft', 'final', 'published');

create type public.statement_kind as enum ('fatto', 'valutazione');

create type public.attribution_method as enum
  ('fonte',      -- dichiarato esplicitamente dalla fonte (es. tag OTX, ATT&CK)
   'derivato',   -- estratto automaticamente (es. keyword nella descrizione)
   'analista');  -- inserito manualmente dall'analista

-- -----------------------------------------------------------------------------
-- Utility
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Analisti (chi può scrivere). Popolata a mano dal SQL editor.
-- -----------------------------------------------------------------------------
create table public.analysts (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create or replace function public.is_analyst()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.analysts a where a.user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Settori italiani (le regole di matching stanno in data/sectors.json)
-- -----------------------------------------------------------------------------
create table public.sectors (
  id         text primary key,          -- 'sanita', 'finanza', ...
  name       text not null,
  sort_order smallint not null default 0
);

insert into public.sectors (id, name, sort_order) values
  ('sanita',         'Sanità',                 1),
  ('manifatturiero', 'Manifatturiero',         2),
  ('finanza',        'Finanza',                3),
  ('energia',        'Energia',                4),
  ('pa',             'Pubblica Amministrazione', 5),
  ('trasporti',      'Trasporti',              6),
  ('telco',          'Telecomunicazioni',      7);

-- -----------------------------------------------------------------------------
-- Fonti e stato dell'ingestion
-- -----------------------------------------------------------------------------
create table public.sources (
  id                 text primary key,     -- 'mitre_attack', 'cisa_kev', ...
  name               text not null,
  homepage_url       text not null,
  requires_api_key   boolean not null default false,
  enabled            boolean not null default true,
  -- valutazione di affidabilità di default della fonte (Admiralty A–F),
  -- decisa dall'analista; usata come default nei report
  default_reliability char(1) check (default_reliability between 'A' and 'F'),
  last_run_at        timestamptz,
  last_success_at    timestamptz,
  last_status        public.run_status,
  last_error         text,                 -- già ripulito da chiavi/URL con token
  last_record_count  integer
);

insert into public.sources (id, name, homepage_url, requires_api_key) values
  ('mitre_attack',    'MITRE ATT&CK Enterprise',  'https://github.com/mitre-attack/attack-stix-data', false),
  ('cisa_kev',        'CISA KEV',                 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', false),
  ('threatfox',       'abuse.ch ThreatFox',       'https://threatfox.abuse.ch', true),
  ('urlhaus',         'abuse.ch URLhaus',         'https://urlhaus.abuse.ch', true),
  ('otx',             'AlienVault OTX',           'https://otx.alienvault.com', true),
  ('csirt_italia',    'CSIRT Italia / ACN',       'https://www.csirt.gov.it', false),
  ('ransomware_live', 'ransomware.live',          'https://www.ransomware.live', false);

create table public.ingestion_runs (
  id               bigint generated always as identity primary key,
  source_id        text not null references public.sources (id),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           public.run_status not null default 'running',
  records_fetched  integer not null default 0,
  records_upserted integer not null default 0,
  error            text
);
create index on public.ingestion_runs (source_id, started_at desc);

-- -----------------------------------------------------------------------------
-- MITRE ATT&CK (Enterprise) — chiave = STIX id, external_id = T1059 / G0016 ...
-- -----------------------------------------------------------------------------
create table public.attack_tactics (
  id          text primary key,            -- x-mitre-tactic--...
  external_id text not null,               -- TA0001
  shortname   text not null unique,        -- initial-access
  name        text not null,
  description text,
  sort_order  smallint not null,           -- ordine colonne della matrice
  url         text
);

create table public.attack_techniques (
  id                 text primary key,     -- attack-pattern--...
  external_id        text not null,        -- T1059.001
  name               text not null,
  description        text,
  is_subtechnique    boolean not null default false,
  parent_external_id text,                 -- T1059 per le sotto-tecniche
  tactics            text[] not null default '{}',  -- shortname delle tattiche
  platforms          text[] not null default '{}',
  detection          text,
  url                text,
  revoked            boolean not null default false,
  deprecated         boolean not null default false,
  modified_at        timestamptz
);
create index on public.attack_techniques (external_id);

create table public.attack_groups (       -- threat actor (intrusion-set)
  id          text primary key,            -- intrusion-set--...
  external_id text not null,               -- G0016
  name        text not null,
  aliases     text[] not null default '{}',
  description text,
  url         text,
  revoked     boolean not null default false,
  deprecated  boolean not null default false,
  modified_at timestamptz
);
create index on public.attack_groups (external_id);
create index on public.attack_groups using gin (aliases);

create table public.attack_software (
  id          text primary key,            -- malware--... / tool--...
  external_id text not null,               -- S0154
  name        text not null,
  type        text not null check (type in ('malware', 'tool')),
  aliases     text[] not null default '{}',
  platforms   text[] not null default '{}',
  description text,
  url         text,
  revoked     boolean not null default false,
  deprecated  boolean not null default false,
  modified_at timestamptz
);
create index on public.attack_software (external_id);
create index on public.attack_software using gin (aliases);

create table public.attack_mitigations (
  id          text primary key,            -- course-of-action--...
  external_id text not null,               -- M1036
  name        text not null,
  description text,
  url         text,
  deprecated  boolean not null default false
);
create index on public.attack_mitigations (external_id);

-- Solo relazioni attive (revocate/deprecate scartate in ingestion)
create table public.attack_relationships (
  id                text primary key,       -- relationship--...
  relationship_type text not null,          -- uses | mitigates | subtechnique-of | attributed-to ...
  source_ref        text not null,
  target_ref        text not null,
  source_type       text generated always as (split_part(source_ref, '--', 1)) stored,
  target_type       text generated always as (split_part(target_ref, '--', 1)) stored,
  description       text                    -- contesto della procedura (con citazioni ATT&CK)
);
create index on public.attack_relationships (source_ref, relationship_type);
create index on public.attack_relationships (target_ref, relationship_type);

-- Arricchimento attori: motivazione / settori / paesi.
-- ATT&CK non li ha come campi strutturati, quindi ogni valore porta
-- metodo, evidenza e fonte: così la UI distingue fatto da deduzione.
create table public.actor_attributes (
  id          bigint generated always as identity primary key,
  group_id    text not null references public.attack_groups (id) on delete cascade,
  attribute   text not null check (attribute in ('motivazione', 'settore', 'paese')),
  value       text not null,               -- settore: sectors.id; paese: ISO 3166-1 alpha-2
  method      public.attribution_method not null,
  evidence    text,                        -- es. frase della descrizione ATT&CK
  source_url  text,
  confidence  public.confidence_level,
  is_example  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (group_id, attribute, value, method)
);

-- -----------------------------------------------------------------------------
-- CISA KEV
-- -----------------------------------------------------------------------------
create table public.kev_vulnerabilities (
  cve_id               text primary key check (cve_id ~ '^CVE-\d{4}-\d{4,}$'),
  vendor_project       text not null,
  product              text not null,
  vulnerability_name   text not null,
  short_description    text,
  required_action      text,
  date_added           date not null,
  due_date             date,
  known_ransomware_use boolean not null default false,
  cwes                 text[] not null default '{}',
  notes                text
);
create index on public.kev_vulnerabilities (date_added desc);
create index on public.kev_vulnerabilities (lower(vendor_project));

-- -----------------------------------------------------------------------------
-- Intel testuale: pulse OTX, bollettini CSIRT Italia
-- -----------------------------------------------------------------------------
create table public.intel_items (
  id           bigint generated always as identity primary key,
  source_id    text not null references public.sources (id),
  external_id  text not null,              -- id pulse OTX / guid RSS
  title        text not null,
  summary      text,
  url          text,
  published_at timestamptz,
  tlp          public.tlp_level,           -- se dichiarato dalla fonte
  tags         text[] not null default '{}',
  adversary    text,                       -- dichiarato dalla fonte (OTX)
  attack_ids   text[] not null default '{}', -- T-id citati dalla fonte
  cves         text[] not null default '{}',
  unique (source_id, external_id)
);
create index on public.intel_items (published_at desc);

-- -----------------------------------------------------------------------------
-- IOC: una riga per indicatore normalizzato (dedup), N osservazioni per fonte
-- -----------------------------------------------------------------------------
create table public.iocs (
  id          bigint generated always as identity primary key,
  type        public.ioc_type not null,
  value       text not null,               -- normalizzato: lowercase, refang, senza trailing dot
  first_seen  timestamptz not null,        -- min tra le osservazioni
  last_seen   timestamptz not null,        -- max tra le osservazioni
  unique (type, value)
);
create index on public.iocs (last_seen desc);

create table public.ioc_observations (
  id            bigint generated always as identity primary key,
  ioc_id        bigint not null references public.iocs (id) on delete cascade,
  source_id     text not null references public.sources (id),
  source_ref    text not null default '',  -- id ThreatFox / URLhaus / pulse OTX
  intel_item_id bigint references public.intel_items (id) on delete set null,
  first_seen    timestamptz not null,
  last_seen     timestamptz not null,
  threat_type   text,                      -- botnet_cc, payload_delivery, ...
  malware       text,                      -- famiglia come la nomina la fonte
  tags          text[] not null default '{}',
  source_confidence smallint check (source_confidence between 0 and 100),
  unique (ioc_id, source_id, source_ref)
);
create index on public.ioc_observations (source_id, last_seen desc);
create index on public.ioc_observations (lower(malware));

-- Collegamento IOC -> attore / software ATT&CK, con provenienza
create table public.ioc_links (
  id          bigint generated always as identity primary key,
  ioc_id      bigint not null references public.iocs (id) on delete cascade,
  group_id    text references public.attack_groups (id) on delete cascade,
  software_id text references public.attack_software (id) on delete cascade,
  method      public.attribution_method not null,
  evidence    text,                        -- es. "malware=Cobalt Strike (ThreatFox) = S0154 alias"
  check (num_nonnulls(group_id, software_id) = 1),
  unique nulls not distinct (ioc_id, group_id, software_id, method)
);
create index on public.ioc_links (group_id);
create index on public.ioc_links (software_id);

-- -----------------------------------------------------------------------------
-- ransomware.live — vittime (filtrate su paese = IT in ingestion)
-- -----------------------------------------------------------------------------
create table public.ransomware_victims (
  id            bigint generated always as identity primary key,
  external_id   text not null unique,      -- id/hash fornito da ransomware.live
  victim        text not null,
  group_name    text not null,             -- nome del gruppo come da leak site
  country       char(2) not null,
  sector_raw    text,                      -- etichetta originale della fonte
  sector_id     text references public.sectors (id),  -- mapping data/sectors.json
  discovered_at timestamptz not null,
  attack_date   date,
  post_url      text
);
create index on public.ransomware_victims (country, discovered_at desc);
create index on public.ransomware_victims (sector_id, discovered_at desc);

-- -----------------------------------------------------------------------------
-- Analisi (area "Analisi": testo/IOC incollati)
-- -----------------------------------------------------------------------------
create table public.analyses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users (id) on delete cascade default auth.uid(),
  title       text not null,
  input_text  text not null,
  result      jsonb not null default '{}',  -- IOC estratti + esito match + tecniche suggerite
  is_example  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger analyses_updated_at before update on public.analyses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Report
-- -----------------------------------------------------------------------------
create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references auth.users (id) on delete set null default auth.uid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null,
  kind              public.report_kind not null,
  subject_group_id  text references public.attack_groups (id),
  subject_sector_id text references public.sectors (id),
  subject_event     text,
  tlp               public.tlp_level not null default 'AMBER',
  confidence        public.confidence_level not null,
  status            public.report_status not null default 'draft',
  published_at      timestamptz,
  -- Executive brief (linguaggio non tecnico)
  exec_risk         text check (exec_risk in ('critico', 'alto', 'medio', 'basso')),
  exec_summary      text,
  exec_impact       text,
  exec_actions      text[] not null default '{}' check (cardinality(exec_actions) <= 3),
  -- Scheda tecnica (testo libero aggiuntivo: detection, note)
  tech_notes        text,
  is_example        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (kind <> 'attore'  or subject_group_id  is not null),
  check (kind <> 'settore' or subject_sector_id is not null),
  check (kind <> 'evento'  or subject_event     is not null),
  -- solo TLP:CLEAR può andare su /briefs
  check (status <> 'published' or (tlp = 'CLEAR' and published_at is not null))
);
create index on public.reports (status, published_at desc);
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- Fonti del report con valutazione Admiralty (affidabilità A–F, credibilità 1–6)
create table public.report_sources (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports (id) on delete cascade,
  title       text not null,
  url         text,
  publisher   text,
  reliability char(1) not null check (reliability between 'A' and 'F'),
  credibility smallint not null check (credibility between 1 and 6),
  accessed_at date not null default current_date
);
create index on public.report_sources (report_id);

-- FATTI vs VALUTAZIONI: un fatto deve citare una fonte,
-- una valutazione deve dichiarare la confidenza.
create table public.report_statements (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references public.reports (id) on delete cascade,
  section    text not null check (section in ('executive', 'tecnica')),
  kind       public.statement_kind not null,
  body       text not null,
  source_id  uuid references public.report_sources (id) on delete restrict,
  confidence public.confidence_level,
  position   smallint not null default 0,
  check (kind <> 'fatto'       or source_id  is not null),
  check (kind <> 'valutazione' or confidence is not null)
);
create index on public.report_statements (report_id, section, position);

create table public.report_techniques (
  report_id    uuid not null references public.reports (id) on delete cascade,
  technique_id text not null references public.attack_techniques (id),
  note         text,                       -- procedura osservata / detection
  primary key (report_id, technique_id)
);

create table public.report_iocs (
  report_id uuid not null references public.reports (id) on delete cascade,
  ioc_id    bigint not null references public.iocs (id) on delete restrict,
  primary key (report_id, ioc_id)
);

-- -----------------------------------------------------------------------------
-- Viste (security_invoker: rispettano la RLS di chi interroga)
-- -----------------------------------------------------------------------------

-- Tecniche per attore: dirette (gruppo uses tecnica) e tramite software
create view public.v_group_techniques with (security_invoker = true) as
  select r.source_ref as group_id, r.target_ref as technique_id,
         'diretta'::text as via, null::text as software_id
  from public.attack_relationships r
  where r.relationship_type = 'uses'
    and r.source_type = 'intrusion-set' and r.target_type = 'attack-pattern'
  union all
  select g.source_ref, s.target_ref, 'software', g.target_ref
  from public.attack_relationships g
  join public.attack_relationships s
    on s.source_ref = g.target_ref
   and s.relationship_type = 'uses' and s.target_type = 'attack-pattern'
  where g.relationship_type = 'uses'
    and g.source_type = 'intrusion-set' and g.target_type in ('malware', 'tool');

create view public.v_group_software with (security_invoker = true) as
  select r.source_ref as group_id, r.target_ref as software_id, r.description
  from public.attack_relationships r
  where r.relationship_type = 'uses'
    and r.source_type = 'intrusion-set' and r.target_type in ('malware', 'tool');

create view public.v_technique_mitigations with (security_invoker = true) as
  select r.target_ref as technique_id, r.source_ref as mitigation_id, r.description
  from public.attack_relationships r
  where r.relationship_type = 'mitigates'
    and r.source_type = 'course-of-action' and r.target_type = 'attack-pattern';

-- -----------------------------------------------------------------------------
-- Retention IOC (piano gratuito Supabase: 500 MB). Solo service_role.
-- -----------------------------------------------------------------------------
create or replace function public.purge_stale_iocs(max_age_days integer default 90)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.iocs i
  where i.last_seen < now() - make_interval(days => max_age_days)
    and not exists (select 1 from public.report_iocs ri where ri.ioc_id = i.id);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.purge_stale_iocs(integer) from public, anon, authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.analysts             enable row level security;
alter table public.sectors              enable row level security;
alter table public.sources              enable row level security;
alter table public.ingestion_runs       enable row level security;
alter table public.attack_tactics       enable row level security;
alter table public.attack_techniques    enable row level security;
alter table public.attack_groups        enable row level security;
alter table public.attack_software      enable row level security;
alter table public.attack_mitigations   enable row level security;
alter table public.attack_relationships enable row level security;
alter table public.actor_attributes     enable row level security;
alter table public.kev_vulnerabilities  enable row level security;
alter table public.intel_items          enable row level security;
alter table public.iocs                 enable row level security;
alter table public.ioc_observations     enable row level security;
alter table public.ioc_links            enable row level security;
alter table public.ransomware_victims   enable row level security;
alter table public.analyses             enable row level security;
alter table public.reports              enable row level security;
alter table public.report_sources       enable row level security;
alter table public.report_statements    enable row level security;
alter table public.report_techniques    enable row level security;
alter table public.report_iocs          enable row level security;

-- Analisti: ognuno vede solo sé stesso. Nessuna scrittura da client.
create policy "analysts: self read" on public.analysts
  for select to authenticated using (user_id = (select auth.uid()));

-- Dati di riferimento: lettura pubblica, nessuna policy di scrittura
-- (scrive solo l'ingestion con service_role).
do $$
declare t text;
begin
  foreach t in array array[
    'sectors', 'sources', 'ingestion_runs',
    'attack_tactics', 'attack_techniques', 'attack_groups', 'attack_software',
    'attack_mitigations', 'attack_relationships', 'actor_attributes',
    'kev_vulnerabilities', 'intel_items',
    'iocs', 'ioc_observations', 'ioc_links', 'ransomware_victims'
  ] loop
    execute format(
      'create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Analisi: esempi pubblici; il resto solo al proprietario analista.
create policy "analyses: read examples or own" on public.analyses
  for select to anon, authenticated
  using (is_example or owner_id = (select auth.uid()));
create policy "analyses: analyst insert" on public.analyses
  for insert to authenticated
  with check ((select public.is_analyst()) and owner_id = (select auth.uid()) and not is_example);
create policy "analyses: analyst update own" on public.analyses
  for update to authenticated
  using ((select public.is_analyst()) and owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and not is_example);
create policy "analyses: analyst delete own" on public.analyses
  for delete to authenticated
  using ((select public.is_analyst()) and owner_id = (select auth.uid()));

-- Report: pubblico = TLP:CLEAR pubblicati. Proprietario = tutto il proprio.
create policy "reports: public published clear" on public.reports
  for select to anon, authenticated
  using (status = 'published' and tlp = 'CLEAR');
create policy "reports: owner read" on public.reports
  for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "reports: analyst insert" on public.reports
  for insert to authenticated
  with check ((select public.is_analyst()) and owner_id = (select auth.uid()) and not is_example);
create policy "reports: analyst update own" on public.reports
  for update to authenticated
  using ((select public.is_analyst()) and owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and not is_example);
create policy "reports: analyst delete own" on public.reports
  for delete to authenticated
  using ((select public.is_analyst()) and owner_id = (select auth.uid()));

-- Tabelle figlie dei report: visibili se il report padre è visibile
-- (la subquery su reports applica già la RLS di reports),
-- modificabili se il report padre è dell'analista.
do $$
declare t text;
begin
  foreach t in array array[
    'report_sources', 'report_statements', 'report_techniques', 'report_iocs'
  ] loop
    execute format($f$
      create policy "read via report" on public.%1$I
        for select to anon, authenticated
        using (exists (select 1 from public.reports r where r.id = report_id));
      create policy "write via own report" on public.%1$I
        for all to authenticated
        using ((select public.is_analyst()) and exists (
          select 1 from public.reports r
          where r.id = report_id and r.owner_id = (select auth.uid())))
        with check ((select public.is_analyst()) and exists (
          select 1 from public.reports r
          where r.id = report_id and r.owner_id = (select auth.uid())));
    $f$, t);
  end loop;
end $$;
