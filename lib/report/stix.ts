import { createHash } from "node:crypto";
import { admiraltyCode } from "./admiralty";
import type { ReportFull, Tlp } from "./types";

/** Marking definition ufficiali TLP 2.0 (OASIS cti-stix-common-objects, extension-definition--60a3c5c5…). */
const TLP_EXTENSION = "extension-definition--60a3c5c5-0d10-413e-aab3-9e08dde9e88d";
export const TLP_MARKINGS: Record<Tlp, string> = {
  CLEAR: "marking-definition--94868c89-83c2-464b-929b-a1a8aa3c8487",
  GREEN: "marking-definition--bab4a63c-aed9-4cf5-a766-dfca5abac2bb",
  AMBER: "marking-definition--55d920b0-5e8b-4f79-9ee9-91f868d9b421",
  "AMBER+STRICT": "marking-definition--939a9414-2ddd-4d32-a0cd-375ea402b003",
  RED: "marking-definition--e828b379-4e03-4974-9ac4-e53a884c97c1",
};

/** Scala STIX 2.1 "None/Low/Med/High" (appendice A della specifica). */
const STIX_CONFIDENCE = { alto: 85, medio: 50, basso: 15 } as const;

/** Settori del progetto → vocabolario STIX industry-sector-ov. */
const STIX_SECTOR: Record<string, string> = {
  sanita: "healthcare",
  manifatturiero: "manufacturing",
  finanza: "financial-services",
  energia: "energy",
  pa: "government",
  trasporti: "transportation",
  telco: "telecommunications",
};

const NAMESPACE = "7a3c1d2e-4b5f-4c6d-8e9f-0a1b2c3d4e5f"; // namespace ThreatBrief per gli UUIDv5

/**
 * Id stabili: riesportare lo stesso report deve dare gli stessi id (altrimenti chi importa
 * vede duplicati). STIX 2.1 raccomanda UUIDv4 per gli SDO, quindi deriviamo i 122 bit da
 * uno SHA-1 e impostiamo versione 4 e variante RFC 9562: formato v4, valore deterministico.
 */
export function stableUuid(name: string, namespace = NAMESPACE): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(Buffer.concat([ns, Buffer.from(name, "utf8")])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const sid = (type: string, key: string) => `${type}--${stableUuid(`${type}|${key}`)}`;
const ts = (iso: string) => new Date(iso).toISOString();
const quote = (v: string) => `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/** Pattern STIX per un IOC (null per le CVE, che diventano oggetti vulnerability). */
export function stixPattern(type: string, value: string): string | null {
  switch (type) {
    case "ipv4": return `[ipv4-addr:value = ${quote(value)}]`;
    case "ipv6": return `[ipv6-addr:value = ${quote(value)}]`;
    case "domain": return `[domain-name:value = ${quote(value)}]`;
    case "url": return `[url:value = ${quote(value)}]`;
    case "md5": return `[file:hashes.MD5 = ${quote(value)}]`;
    case "sha1": return `[file:hashes.'SHA-1' = ${quote(value)}]`;
    case "sha256": return `[file:hashes.'SHA-256' = ${quote(value)}]`;
    default: return null;
  }
}

type StixObject = Record<string, unknown> & { type: string; id: string };

/** Bundle STIX 2.1 del report: report, identità autore, TLP 2.0, attore/settore, tecniche, IOC, fatti e valutazioni. */
export function buildStixBundle(full: ReportFull, siteUrl: string): { type: "bundle"; id: string; objects: StixObject[] } {
  const { report: r } = full;
  const created = ts(r.created_at);
  const modified = ts(r.updated_at);
  const marking = TLP_MARKINGS[r.tlp];
  const identity: StixObject = {
    type: "identity",
    spec_version: "2.1",
    id: sid("identity", "threatbrief"),
    created: "2026-11-22T00:00:00.000Z",
    modified: "2026-11-22T00:00:00.000Z",
    name: "ThreatBrief",
    identity_class: "organization",
  };
  const common = { spec_version: "2.1", created, modified, created_by_ref: identity.id, object_marking_refs: [marking] };
  const objects: StixObject[] = [];
  const refs: string[] = [];

  let subjectId: string | null = null;
  if (r.kind === "attore" && full.subject.externalId) {
    subjectId = sid("intrusion-set", full.subject.externalId);
    objects.push({
      type: "intrusion-set",
      id: subjectId,
      ...common,
      name: full.subject.label,
      external_references: [
        { source_name: "mitre-attack", external_id: full.subject.externalId, url: `https://attack.mitre.org/groups/${full.subject.externalId}/` },
      ],
    });
  } else if (r.kind === "settore" && r.subject_sector_id) {
    subjectId = sid("identity", `sector|${r.subject_sector_id}`);
    objects.push({
      type: "identity",
      id: subjectId,
      ...common,
      name: `Settore ${full.subject.label} (Italia)`,
      identity_class: "class",
      sectors: [STIX_SECTOR[r.subject_sector_id] ?? "other"],
    });
  }
  if (subjectId) refs.push(subjectId);

  for (const t of full.techniques) {
    const id = sid("attack-pattern", t.external_id);
    objects.push({
      type: "attack-pattern",
      id,
      ...common,
      name: t.name,
      ...(t.note ? { description: t.note } : {}),
      external_references: [
        { source_name: "mitre-attack", external_id: t.external_id, url: `https://attack.mitre.org/techniques/${t.external_id.replace(".", "/")}/` },
      ],
    });
    refs.push(id);
    if (r.kind === "attore" && subjectId) {
      const rel = sid("relationship", `${r.id}|${subjectId}|${id}`);
      objects.push({ type: "relationship", id: rel, ...common, relationship_type: "uses", source_ref: subjectId, target_ref: id });
      refs.push(rel);
    }
  }

  for (const i of full.iocs) {
    if (i.type === "cve") {
      const id = sid("vulnerability", i.value);
      objects.push({
        type: "vulnerability",
        id,
        ...common,
        name: i.value,
        external_references: [{ source_name: "cve", external_id: i.value }],
      });
      refs.push(id);
      continue;
    }
    const pattern = stixPattern(i.type, i.value);
    if (!pattern) continue;
    const id = sid("indicator", `${i.type}|${i.value}`);
    objects.push({
      type: "indicator",
      id,
      ...common,
      name: i.value,
      description: `Indicatore ${i.type} osservato nelle fonti raccolte dal ${i.first_seen.slice(0, 10)} al ${i.last_seen.slice(0, 10)}.`,
      indicator_types: ["malicious-activity"],
      pattern,
      pattern_type: "stix",
      valid_from: ts(i.first_seen),
    });
    refs.push(id);
    if (r.kind === "attore" && subjectId) {
      const rel = sid("relationship", `${r.id}|${id}|${subjectId}`);
      objects.push({ type: "relationship", id: rel, ...common, relationship_type: "indicates", source_ref: id, target_ref: subjectId });
      refs.push(rel);
    }
  }

  const reportId = `report--${r.id}`;
  const sourceIndex = new Map(full.sources.map((s, n) => [s.id, n + 1]));
  for (const s of full.statements) {
    const source = full.sources.find((x) => x.id === s.source_id);
    objects.push({
      type: "note",
      id: sid("note", s.id),
      ...common,
      abstract: s.kind === "fatto" ? `Fatto [${sourceIndex.get(s.source_id ?? "")}]` : `Valutazione (confidenza ${s.confidence})`,
      content: s.body,
      labels: [s.kind, s.section],
      ...(s.kind === "valutazione" && s.confidence ? { confidence: STIX_CONFIDENCE[s.confidence] } : {}),
      ...(source
        ? { external_references: [{ source_name: source.publisher || source.title, description: `${source.title} — Admiralty ${admiraltyCode(source.reliability, source.credibility)}`, ...(source.url ? { url: source.url } : {}) }] }
        : {}),
      object_refs: [reportId],
    });
  }

  const description = [r.exec_summary, r.exec_impact && `Impatto: ${r.exec_impact}`, r.exec_actions.length ? `Azioni: ${r.exec_actions.join("; ")}` : null]
    .filter(Boolean)
    .join("\n\n");
  const report: StixObject = {
    type: "report",
    id: reportId,
    ...common,
    name: r.title,
    ...(description ? { description } : {}),
    report_types: [r.kind === "attore" ? "threat-actor" : "threat-report"],
    published: ts(r.published_at ?? r.updated_at),
    confidence: STIX_CONFIDENCE[r.confidence],
    labels: [`rischio:${r.exec_risk ?? "n.d."}`, ...(r.is_example ? ["esempio"] : [])],
    object_refs: refs.length ? refs : [identity.id],
    external_references: [
      { source_name: "ThreatBrief", url: `${siteUrl}/briefs/${r.slug}` },
      ...full.sources.map((s) => ({
        source_name: s.publisher || s.title,
        description: `${s.title} — Admiralty ${admiraltyCode(s.reliability, s.credibility)}`,
        ...(s.url ? { url: s.url } : {}),
      })),
    ],
  };

  const markingDef: StixObject = {
    type: "marking-definition",
    spec_version: "2.1",
    id: marking,
    created: "2022-10-01T00:00:00.000Z",
    name: `TLP:${r.tlp}`,
    extensions: { [TLP_EXTENSION]: { extension_type: "property-extension", tlp_2_0: r.tlp.toLowerCase() } },
  };

  return {
    type: "bundle",
    id: `bundle--${stableUuid(`bundle|${r.id}|${modified}`)}`,
    objects: [markingDef, identity, report, ...objects],
  };
}
