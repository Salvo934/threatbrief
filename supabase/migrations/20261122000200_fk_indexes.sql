-- Indici sulle foreign key segnalati dall'advisor Supabase (0001_unindexed_foreign_keys)
create index on public.analyses (owner_id);
create index on public.ioc_observations (intel_item_id);
create index on public.report_iocs (ioc_id);
create index on public.report_statements (source_id);
create index on public.report_techniques (technique_id);
create index on public.reports (owner_id);
create index on public.reports (subject_group_id);
create index on public.reports (subject_sector_id);
