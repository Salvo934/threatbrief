import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveActorAttributes } from "../enrich/actor-attributes";
import { deleteByValues, fetchAllValues, upsertInBatches } from "../lib/db";
import { fetchJson } from "../lib/http";
import type { SourceResult } from "../lib/run";

export const ATTACK_URL =
  "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json";

type ExternalRef = { source_name: string; external_id?: string; url?: string };

export type StixObject = {
  type: string;
  id: string;
  name?: string;
  description?: string;
  modified?: string;
  revoked?: boolean;
  x_mitre_deprecated?: boolean;
  external_references?: ExternalRef[];
  aliases?: string[];
  x_mitre_aliases?: string[];
  x_mitre_platforms?: string[];
  x_mitre_is_subtechnique?: boolean;
  x_mitre_detection?: string;
  x_mitre_shortname?: string;
  x_mitre_version?: string;
  kill_chain_phases?: { kill_chain_name: string; phase_name: string }[];
  tactic_refs?: string[];
  relationship_type?: string;
  source_ref?: string;
  target_ref?: string;
};

export type StixBundle = { type: string; objects: StixObject[] };

const KEPT_RELATIONSHIPS = new Set(["uses", "mitigates", "subtechnique-of"]);

function mitreRef(o: StixObject): ExternalRef | undefined {
  return o.external_references?.find((r) => r.source_name === "mitre-attack" && r.external_id);
}

const isActive = (o: StixObject) => !o.revoked && !o.x_mitre_deprecated;

/** Trasforma il bundle STIX 2.1 di ATT&CK Enterprise nelle righe delle tabelle attack_*. */
export function parseAttackBundle(bundle: StixBundle) {
  const objects = bundle.objects;
  const collection = objects.find((o) => o.type === "x-mitre-collection");
  const matrix = objects.find((o) => o.type === "x-mitre-matrix" && isActive(o));
  const tacticOrder = new Map((matrix?.tactic_refs ?? []).map((id, i) => [id, i]));

  const tactics = objects
    .filter((o) => o.type === "x-mitre-tactic" && isActive(o) && mitreRef(o))
    .map((o) => ({
      id: o.id,
      external_id: mitreRef(o)!.external_id!,
      shortname: o.x_mitre_shortname!,
      name: o.name!,
      description: o.description ?? null,
      sort_order: tacticOrder.get(o.id) ?? 99,
      url: mitreRef(o)!.url ?? null,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  const techniques = objects
    .filter((o) => o.type === "attack-pattern" && mitreRef(o))
    .map((o) => {
      const extId = mitreRef(o)!.external_id!;
      const isSub = o.x_mitre_is_subtechnique ?? extId.includes(".");
      return {
        id: o.id,
        external_id: extId,
        name: o.name!,
        description: o.description ?? null,
        is_subtechnique: isSub,
        parent_external_id: isSub ? extId.split(".")[0] : null,
        tactics: (o.kill_chain_phases ?? [])
          .filter((k) => k.kill_chain_name === "mitre-attack")
          .map((k) => k.phase_name),
        platforms: o.x_mitre_platforms ?? [],
        detection: o.x_mitre_detection ?? null,
        url: mitreRef(o)!.url ?? null,
        revoked: !!o.revoked,
        deprecated: !!o.x_mitre_deprecated,
        modified_at: o.modified ?? null,
      };
    });

  const groups = objects
    .filter((o) => o.type === "intrusion-set" && mitreRef(o))
    .map((o) => ({
      id: o.id,
      external_id: mitreRef(o)!.external_id!,
      name: o.name!,
      aliases: (o.aliases ?? []).filter((a) => a !== o.name),
      description: o.description ?? null,
      url: mitreRef(o)!.url ?? null,
      revoked: !!o.revoked,
      deprecated: !!o.x_mitre_deprecated,
      modified_at: o.modified ?? null,
    }));

  const software = objects
    .filter((o) => (o.type === "malware" || o.type === "tool") && mitreRef(o))
    .map((o) => ({
      id: o.id,
      external_id: mitreRef(o)!.external_id!,
      name: o.name!,
      type: o.type as "malware" | "tool",
      aliases: (o.x_mitre_aliases ?? o.aliases ?? []).filter((a) => a !== o.name),
      platforms: o.x_mitre_platforms ?? [],
      description: o.description ?? null,
      url: mitreRef(o)!.url ?? null,
      revoked: !!o.revoked,
      deprecated: !!o.x_mitre_deprecated,
      modified_at: o.modified ?? null,
    }));

  const mitigations = objects
    .filter((o) => o.type === "course-of-action" && mitreRef(o))
    .map((o) => ({
      id: o.id,
      external_id: mitreRef(o)!.external_id!,
      name: o.name!,
      description: o.description ?? null,
      url: mitreRef(o)!.url ?? null,
      deprecated: !!o.x_mitre_deprecated || !!o.revoked,
    }));

  // Relazioni solo tra oggetti attivi che salviamo: niente riferimenti "appesi".
  const activeIds = new Set(
    [...techniques, ...groups, ...software]
      .filter((o) => !o.revoked && !o.deprecated)
      .map((o) => o.id)
      .concat(mitigations.filter((m) => !m.deprecated).map((m) => m.id)),
  );
  const relationships = objects
    .filter(
      (o) =>
        o.type === "relationship" &&
        isActive(o) &&
        KEPT_RELATIONSHIPS.has(o.relationship_type!) &&
        activeIds.has(o.source_ref!) &&
        activeIds.has(o.target_ref!),
    )
    .map((o) => ({
      id: o.id,
      relationship_type: o.relationship_type!,
      source_ref: o.source_ref!,
      target_ref: o.target_ref!,
      description: o.description ?? null,
    }));

  const actorAttributes = groups
    .filter((g) => !g.revoked && !g.deprecated)
    .flatMap((g) =>
      deriveActorAttributes(g.description).map((a) => ({
        group_id: g.id,
        attribute: a.attribute,
        value: a.value,
        method: "derivato" as const,
        evidence: a.evidence,
        source_url: g.url,
        confidence: "basso" as const,
        is_example: false,
      })),
    );

  return {
    version: collection?.x_mitre_version,
    objectCount: objects.length,
    tactics,
    techniques,
    groups,
    software,
    mitigations,
    relationships,
    actorAttributes,
  };
}

export type ParsedAttack = ReturnType<typeof parseAttackBundle>;

export async function ingestAttack(db: SupabaseClient): Promise<SourceResult> {
  const bundle = await fetchJson<StixBundle>(ATTACK_URL);
  const p = parseAttackBundle(bundle);

  let upserted = 0;
  upserted += await upsertInBatches(db, "attack_tactics", p.tactics, "id");
  upserted += await upsertInBatches(db, "attack_techniques", p.techniques, "id");
  upserted += await upsertInBatches(db, "attack_groups", p.groups, "id");
  upserted += await upsertInBatches(db, "attack_software", p.software, "id");
  upserted += await upsertInBatches(db, "attack_mitigations", p.mitigations, "id");
  upserted += await upsertInBatches(db, "attack_relationships", p.relationships, "id");

  // Relazioni sparite dal bundle (revocate/deprecate in una nuova release): le togliamo.
  const current = new Set(p.relationships.map((r) => r.id));
  const stale = (await fetchAllValues(db, "attack_relationships")).filter((id) => !current.has(id));
  await deleteByValues(db, "attack_relationships", stale);

  // Gli attributi derivati si ricalcolano da zero (le regole in data/*.json possono cambiare).
  const { error } = await db.from("actor_attributes").delete().eq("method", "derivato");
  if (error) throw new Error(`delete actor_attributes: ${error.message}`);
  upserted += await upsertInBatches(
    db,
    "actor_attributes",
    p.actorAttributes,
    "group_id,attribute,value,method",
  );

  return { fetched: p.objectCount, upserted, version: p.version };
}
