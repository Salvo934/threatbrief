-- Riepilogo per la lista attori: una riga per gruppo attivo con conteggi e attributi.
create view public.v_group_summary with (security_invoker = true) as
select
  g.id,
  g.external_id,
  g.name,
  g.aliases,
  array_to_string(g.aliases, ' ') as aliases_text,
  g.modified_at,
  (select count(distinct r.target_ref) from public.attack_relationships r
    where r.source_ref = g.id and r.relationship_type = 'uses' and r.target_type = 'attack-pattern')::int
    as technique_count,
  (select count(*) from public.attack_relationships r
    where r.source_ref = g.id and r.relationship_type = 'uses' and r.target_type in ('malware', 'tool'))::int
    as software_count,
  coalesce((select array_agg(distinct a.value order by a.value) from public.actor_attributes a
    where a.group_id = g.id and a.attribute = 'settore'), '{}') as sectors,
  coalesce((select array_agg(distinct a.value order by a.value) from public.actor_attributes a
    where a.group_id = g.id and a.attribute = 'paese'), '{}') as countries,
  coalesce((select array_agg(distinct a.value order by a.value) from public.actor_attributes a
    where a.group_id = g.id and a.attribute = 'motivazione'), '{}') as motivations
from public.attack_groups g
where not g.revoked and not g.deprecated;
