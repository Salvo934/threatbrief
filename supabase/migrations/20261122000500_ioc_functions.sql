-- =============================================================================
-- Funzioni IOC
--  ingest_iocs : merge in blocco (first_seen = min, last_seen = max), una
--                osservazione per fonte. Solo service_role.
--  link_iocs   : collega gli IOC ad ATT&CK con provenienza. Solo service_role.
--  lookup_iocs : per l'area Analisi; security invoker, rispetta la RLS.
-- =============================================================================

create or replace function public.ingest_iocs(p_source text, p_items jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with items as (
    select (i->>'type')::public.ioc_type                     as type,
           i->>'value'                                       as value,
           (i->>'first_seen')::timestamptz                   as first_seen,
           coalesce((i->>'last_seen')::timestamptz, (i->>'first_seen')::timestamptz) as last_seen,
           coalesce(i->>'source_ref', '')                    as source_ref,
           i->>'threat_type'                                 as threat_type,
           i->>'malware'                                     as malware,
           coalesce(array(select jsonb_array_elements_text(coalesce(i->'tags', '[]'))), '{}') as tags,
           (i->>'confidence')::smallint                      as confidence,
           i->>'intel_external_id'                           as intel_external_id
    from jsonb_array_elements(p_items) i
  ),
  agg as (
    select type, value, min(first_seen) as fs, max(last_seen) as ls from items group by type, value
  ),
  up as (
    insert into public.iocs as c (type, value, first_seen, last_seen)
    select type, value, fs, ls from agg
    on conflict (type, value) do update
      set first_seen = least(c.first_seen, excluded.first_seen),
          last_seen  = greatest(c.last_seen, excluded.last_seen)
    returning c.id, c.type, c.value
  )
  insert into public.ioc_observations as o
    (ioc_id, source_id, source_ref, intel_item_id, first_seen, last_seen, threat_type, malware, tags, source_confidence)
  select distinct on (up.id, it.source_ref)
         up.id, p_source, it.source_ref, ii.id, it.first_seen, it.last_seen,
         it.threat_type, it.malware, it.tags, it.confidence
  from items it
  join up on up.type = it.type and up.value = it.value
  left join public.intel_items ii on ii.source_id = p_source and ii.external_id = it.intel_external_id
  order by up.id, it.source_ref, it.last_seen desc
  on conflict (ioc_id, source_id, source_ref) do update
    set first_seen        = least(o.first_seen, excluded.first_seen),
        last_seen         = greatest(o.last_seen, excluded.last_seen),
        threat_type       = coalesce(excluded.threat_type, o.threat_type),
        malware           = coalesce(excluded.malware, o.malware),
        tags              = excluded.tags,
        source_confidence = coalesce(excluded.source_confidence, o.source_confidence),
        intel_item_id     = coalesce(excluded.intel_item_id, o.intel_item_id);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.link_iocs(p_since timestamptz)
returns integer language plpgsql security definer set search_path = '' as $$
declare n1 integer; n2 integer;
begin
  -- 1) Famiglia malware dichiarata dalla fonte = nome/alias di un software ATT&CK.
  --    Il nome è della fonte, l'equivalenza è nostra: method = 'derivato'.
  insert into public.ioc_links (ioc_id, software_id, method, evidence)
  select distinct on (o.ioc_id, s.id) o.ioc_id, s.id, 'derivato',
         format('%s: malware "%s" = ATT&CK %s %s', src.name, o.malware, s.external_id, s.name)
  from public.ioc_observations o
  join public.sources src on src.id = o.source_id
  join public.attack_software s
    on not s.revoked and not s.deprecated
   and (lower(s.name) = lower(o.malware)
        or exists (select 1 from unnest(s.aliases) a where lower(a) = lower(o.malware)))
  where o.last_seen >= p_since and o.malware is not null
  on conflict do nothing;
  get diagnostics n1 = row_count;

  -- 2) Avversario dichiarato nel pulse OTX = nome/alias di un gruppo ATT&CK: method = 'fonte'.
  insert into public.ioc_links (ioc_id, group_id, method, evidence)
  select distinct on (o.ioc_id, g.id) o.ioc_id, g.id, 'fonte',
         format('%s, pulse "%s": adversary "%s" = ATT&CK %s %s', src.name, ii.title, ii.adversary, g.external_id, g.name)
  from public.ioc_observations o
  join public.intel_items ii on ii.id = o.intel_item_id and ii.adversary is not null and ii.adversary <> ''
  join public.sources src on src.id = o.source_id
  join public.attack_groups g
    on not g.revoked and not g.deprecated
   and (lower(g.name) = lower(ii.adversary)
        or exists (select 1 from unnest(g.aliases) a where lower(a) = lower(ii.adversary)))
  where o.last_seen >= p_since
  on conflict do nothing;
  get diagnostics n2 = row_count;
  return n1 + n2;
end $$;

revoke execute on function public.ingest_iocs(text, jsonb) from public, anon, authenticated;
revoke execute on function public.link_iocs(timestamptz) from public, anon, authenticated;
grant execute on function public.ingest_iocs(text, jsonb) to service_role;
grant execute on function public.link_iocs(timestamptz) to service_role;
grant execute on function public.purge_stale_iocs(integer) to service_role;

-- Lookup per l'area Analisi: max 500 indicatori per chiamata.
create or replace function public.lookup_iocs(p_items jsonb)
returns table (
  type public.ioc_type, value text, ioc_id bigint,
  first_seen timestamptz, last_seen timestamptz,
  sources text[], malware text[], software jsonb, groups jsonb
)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select distinct (i->>'type')::public.ioc_type as type, i->>'value' as value
    from (select i from jsonb_array_elements(p_items) i limit 500) x
  )
  select q.type, q.value, c.id, c.first_seen, c.last_seen,
    coalesce((select array_agg(distinct o.source_id order by o.source_id)
              from public.ioc_observations o where o.ioc_id = c.id), '{}'),
    coalesce((select array_agg(distinct o.malware order by o.malware)
              from public.ioc_observations o where o.ioc_id = c.id and o.malware is not null), '{}'),
    coalesce((select jsonb_agg(distinct jsonb_build_object('external_id', s.external_id, 'name', s.name))
              from public.ioc_links l join public.attack_software s on s.id = l.software_id
              where l.ioc_id = c.id), '[]'),
    coalesce((
      select jsonb_agg(distinct x) from (
        -- gruppo dichiarato dalla fonte
        select jsonb_build_object('external_id', g.external_id, 'name', g.name, 'via', 'fonte') as x
        from public.ioc_links l join public.attack_groups g on g.id = l.group_id
        where l.ioc_id = c.id
        union all
        -- gruppi che ATT&CK documenta come utilizzatori del software collegato
        select jsonb_build_object('external_id', g.external_id, 'name', g.name, 'via', 'software ' || s.name)
        from public.ioc_links l
        join public.attack_software s on s.id = l.software_id
        join public.v_group_software gs on gs.software_id = l.software_id
        join public.attack_groups g on g.id = gs.group_id
        where l.ioc_id = c.id
      ) y), '[]')
  from q
  left join public.iocs c on c.type = q.type and c.value = q.value
$$;
