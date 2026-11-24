/**
 * Strumenti dell'assistente: solo letture mirate (query builder, niente SQL libero), con il link
 * alla pagina dell'app o alla fonte da citare. Dati compatti per contenere il costo.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.2";
import { clampDays, cleanTerm } from "./guard.ts";

type Out = { title: string; link: string; data: unknown };
const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const count = <T>(xs: T[], key: (x: T) => string | null | undefined, n = 10) => {
  const m = new Map<string, number>();
  for (const x of xs) {
    const k = key(x);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  const all = [...m.entries()].sort((a, b) => b[1] - a[1]);
  const top = all.slice(0, n).map(([k, v]) => ({ nome: k, n: v }));
  // gli esclusi dall'elenco restano visibili, così le somme tornano
  const rest = all.slice(n);
  return rest.length ? [...top, { nome: `altri (${rest.length})`, n: rest.reduce((s, [, v]) => s + v, 0) }] : top;
};
const PROFILES: Record<string, string> = { qilin: "qilin", thegentlemen: "the-gentlemen", lockbit5: "lockbit", lockbit3: "lockbit", lockbit2: "lockbit", akira: "akira", incransom: "inc-ransom", clop: "clop" };

export const TOOLS = [
  {
    name: "claims_stats",
    description: "Rivendicazioni ransomware (dichiarazioni dei gruppi, non verificate) in Italia o nel mondo negli ultimi N giorni: totale, per gruppo, per settore, per paese. Filtri facoltativi per gruppo e settore (nome inglese di ransomware.live, es. Manufacturing).",
    input_schema: { type: "object", properties: { scope: { type: "string", enum: ["italia", "mondo"] }, days: { type: "integer" }, group: { type: "string" }, sector: { type: "string" } }, required: ["scope"] },
  },
  {
    name: "kev_search",
    description: "Catalogo CISA KEV (vulnerabilità sfruttate attivamente): ricerca per fornitore o prodotto, solo quelle usate dal ransomware, aggiunte negli ultimi N giorni.",
    input_schema: { type: "object", properties: { vendor: { type: "string" }, product: { type: "string" }, ransomware_only: { type: "boolean" }, added_days: { type: "integer" } } },
  },
  {
    name: "actor_profile",
    description: "Profilo MITRE ATT&CK di un gruppo per nome o alias (es. APT28, Sandworm, Akira): descrizione, numero di tecniche, tattiche principali, software usati.",
    input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  },
  {
    name: "technique_info",
    description: "Una tecnica MITRE ATT&CK per ID (es. T1566.001): nome, tattiche, gruppi che la usano, mitigazioni ATT&CK e contromisure D3FEND principali.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "night_report",
    description: "Rapporto della notte (ultime 24 ore nel mondo) di una data YYYY-MM-DD o il più recente: rivendicazioni, malware più segnalati, nuove KEV, tecniche ricorrenti, difese.",
    input_schema: { type: "object", properties: { date: { type: "string" } } },
  },
  {
    name: "defense_alerts",
    description: "Avvisi ufficiali (CISA e partner) rilevanti per difesa e aerospazio rilevati negli ultimi N giorni, con motivi e attori citati.",
    input_schema: { type: "object", properties: { days: { type: "integer" } } },
  },
  {
    name: "ioc_lookup",
    description: "Cerca un indicatore (IP, dominio, URL, hash) tra quelli raccolti da ThreatFox, URLhaus e OTX: fonti, malware, gruppi collegati (indizio).",
    input_schema: { type: "object", properties: { type: { type: "string", enum: ["ipv4", "ipv6", "domain", "url", "md5", "sha1", "sha256"] }, value: { type: "string" } }, required: ["type", "value"] },
  },
  {
    name: "published_reports",
    description: "Report pubblicati dall'analista (titolo, data, sintesi), con ricerca facoltativa nel titolo.",
    input_schema: { type: "object", properties: { query: { type: "string" } } },
  },
];

export async function runTool(db: SupabaseClient, name: string, input: Record<string, unknown>): Promise<Out> {
  switch (name) {
    case "claims_stats": {
      const days = clampDays(input.days, 30, 365);
      const world = input.scope === "mondo";
      const group = cleanTerm(input.group).toLowerCase();
      const sector = cleanTerm(input.sector);
      let q = world
        ? db.from("world_claims").select("group_name, country, sector_raw, discovered_at")
        : db.from("ransomware_victims").select("group_name, sector_raw, discovered_at").eq("country", "IT");
      q = q.gte("discovered_at", since(days)).limit(3000);
      if (group) q = q.eq("group_name", group);
      if (sector) q = q.ilike("sector_raw", sector);
      const { data } = await q;
      const rows = (data ?? []) as { group_name: string; country?: string | null; sector_raw: string | null }[];
      return {
        title: `Rivendicazioni ${world ? "nel mondo" : "in Italia"} (ultimi ${days} giorni)`,
        link: world ? "/monitoraggio" : "/minacce",
        data: {
          giorni: days, totale: rows.length, per_gruppo: count(rows, (r) => r.group_name), per_settore: count(rows, (r) => r.sector_raw ?? "non indicato"),
          ...(world ? { per_paese: count(rows, (r) => r.country) } : {}),
          nota: world ? "Lo storico mondiale copre al massimo gli ultimi 30 giorni." : "Dichiarazioni dei gruppi, non verificate.",
        },
      };
    }
    case "kev_search": {
      let q = db.from("kev_vulnerabilities").select("cve_id, vendor_project, product, vulnerability_name, date_added, known_ransomware_use").order("date_added", { ascending: false }).limit(40);
      const vendor = cleanTerm(input.vendor);
      const product = cleanTerm(input.product);
      if (vendor) q = q.ilike("vendor_project", `%${vendor}%`);
      if (product) q = q.ilike("product", `%${product}%`);
      if (input.ransomware_only === true) q = q.eq("known_ransomware_use", true);
      if (input.added_days) q = q.gte("date_added", since(clampDays(input.added_days, 30, 3650)).slice(0, 10));
      const { data } = await q;
      return { title: "Catalogo CISA KEV", link: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", data: { risultati: data ?? [], max: 40 } };
    }
    case "actor_profile": {
      const name = cleanTerm(input.name).toLowerCase().replace(/[^a-z0-9]/g, "");
      const { data: groups } = await db.from("attack_groups").select("id, external_id, name, aliases, description").eq("revoked", false).eq("deprecated", false);
      const g = (groups ?? []).find((x) => [x.name, ...(x.aliases as string[])].some((a) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === name));
      if (!g) return { title: "MITRE ATT&CK", link: "/attori", data: { trovato: false, nota: "Nessun gruppo ATT&CK con questo nome o alias." } };
      const [{ data: tech }, { data: sw }] = await Promise.all([
        db.from("v_group_techniques").select("technique_id").eq("group_id", g.id).limit(1000),
        db.from("v_group_software").select("software_id").eq("group_id", g.id).limit(200),
      ]);
      const techIds = [...new Set((tech ?? []).map((t) => t.technique_id as string))];
      const [{ data: tRows }, { data: sRows }] = await Promise.all([
        techIds.length ? db.from("attack_techniques").select("tactics").in("id", techIds.slice(0, 300)) : Promise.resolve({ data: [] }),
        (sw ?? []).length ? db.from("attack_software").select("name").in("id", (sw ?? []).map((s) => s.software_id as string).slice(0, 100)) : Promise.resolve({ data: [] }),
      ]);
      const slug = PROFILES[name];
      return {
        title: `${g.name} (${g.external_id})`,
        link: slug ? `/minacce/${slug}` : `/attori/${g.external_id}`,
        data: {
          id: g.external_id, nome: g.name, alias: g.aliases, descrizione: String(g.description ?? "").replace(/\(Citation:[^)]*\)/g, "").slice(0, 900),
          tecniche: techIds.length, tattiche_principali: count((tRows ?? []).flatMap((t) => t.tactics as string[]), (t) => t, 6),
          software: (sRows ?? []).map((s) => s.name).slice(0, 15),
        },
      };
    }
    case "technique_info": {
      const id = cleanTerm(input.id, 12).toUpperCase();
      const { data: t } = await db.from("attack_techniques").select("id, external_id, name, tactics").eq("external_id", id).eq("revoked", false).maybeSingle();
      if (!t) return { title: "MITRE ATT&CK", link: "/matrice", data: { trovato: false } };
      const [{ data: users }, { data: mit }, { data: d3 }] = await Promise.all([
        db.from("attack_relationships").select("source_ref").eq("target_ref", t.id).eq("relationship_type", "uses").eq("source_type", "intrusion-set").limit(500),
        db.from("v_technique_mitigations").select("mitigation_id").eq("technique_id", t.id).limit(30),
        db.from("d3fend_countermeasures").select("label, tactic").eq("attack_external_id", id).limit(15),
      ]);
      const [{ data: gNames }, { data: mNames }] = await Promise.all([
        (users ?? []).length ? db.from("attack_groups").select("name").in("id", (users ?? []).map((u) => u.source_ref as string).slice(0, 200)) : Promise.resolve({ data: [] }),
        (mit ?? []).length ? db.from("attack_mitigations").select("external_id, name").in("id", (mit ?? []).map((m) => m.mitigation_id as string)) : Promise.resolve({ data: [] }),
      ]);
      return {
        title: `${t.external_id} ${t.name}`,
        link: `https://attack.mitre.org/techniques/${t.external_id.replace(".", "/")}/`,
        data: { id: t.external_id, nome: t.name, tattiche: t.tactics, gruppi: (gNames ?? []).length, esempi_gruppi: (gNames ?? []).map((g) => g.name).slice(0, 12), mitigazioni: mNames ?? [], d3fend: d3 ?? [] },
      };
    }
    case "night_report": {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date ?? "")) ? String(input.date) : null;
      let q = db.from("world_reports").select("report_date, data");
      q = date ? q.eq("report_date", date) : q.order("report_date", { ascending: false }).limit(1);
      const { data } = await q.maybeSingle();
      if (!data) return { title: "Rapporto della notte", link: "/minacce/notte", data: { trovato: false } };
      const d = data.data as Record<string, unknown> & { claims: { total: number; groups: unknown[]; countries: unknown[]; sectors: unknown[] }; malware: unknown[]; kev: unknown[]; techniques: unknown[]; mitigations: unknown[] };
      return {
        title: `Rapporto della notte del ${data.report_date}`,
        link: `/minacce/notte/${data.report_date}`,
        data: { data: data.report_date, rivendicazioni: d.claims.total, gruppi: d.claims.groups, paesi: d.claims.countries, settori: d.claims.sectors, malware: d.malware, nuove_kev: d.kev, tecniche: (d.techniques ?? []).slice(0, 8), mitigazioni: (d.mitigations ?? []).slice(0, 5) },
      };
    }
    case "defense_alerts": {
      const days = clampDays(input.days, 90, 730);
      const { data } = await db.from("defense_alerts").select("reasons, actors, technique_ids, cves, intel_items(title, url, published_at)").gte("detected_at", since(days)).limit(30);
      return {
        title: "Difesa e aerospazio",
        link: "/minacce/difesa",
        data: (data ?? []).map((a) => {
          const it = a.intel_items as unknown as { title: string; published_at: string } | null;
          return { avviso: it?.title, data: it?.published_at?.slice(0, 10), motivi: (a.reasons as string[]).map((r) => r.split(" — ")[0]), attori: a.actors, tecniche: (a.technique_ids as string[]).length, cve: a.cves };
        }),
      };
    }
    case "ioc_lookup": {
      const type = String(input.type ?? "");
      const value = String(input.value ?? "").trim().toLowerCase().slice(0, 300);
      const { data } = await db.rpc("lookup_iocs", { p_items: [{ type, value }] });
      return { title: `Indicatore ${value}`, link: "/analisi", data: data ?? [] };
    }
    case "published_reports": {
      let q = db.from("reports").select("slug, title, published_at, exec_summary").eq("status", "published").order("published_at", { ascending: false }).limit(15);
      const term = cleanTerm(input.query);
      if (term) q = q.ilike("title", `%${term}%`);
      const { data } = await q;
      return { title: "Report pubblicati", link: "/briefs", data: (data ?? []).map((r) => ({ titolo: r.title, data: r.published_at?.slice(0, 10), link: `/briefs/${r.slug}`, sintesi: String(r.exec_summary ?? "").slice(0, 300) })) };
    }
    default:
      return { title: "Strumento sconosciuto", link: "", data: { errore: `Strumento ${name} non disponibile` } };
  }
}
