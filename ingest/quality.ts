import type { SupabaseClient } from "@supabase/supabase-js";
import { htmlToText } from "../lib/investigate/rules";
import {
  compareAttackGroup, compareClaim, compareFreshness, compareIoc, compareKev, compareQuote, extractQuotes, MAX_AGE_HOURS, sample, summarize,
  type QualityCheck,
} from "../lib/quality/rules";
import { fetchJson, USER_AGENT } from "./lib/http";
import { RANSOMWARE_IT_URL, type RansomwareLiveVictim } from "./sources/ransomware";
import { THREATFOX_URL } from "./sources/threatfox";
import { KEV_URL, type KevCatalog } from "./sources/kev";

async function rows<T>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return (data ?? []) as T[];
}

async function pageText(url: string) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; ThreatBrief-verify/0.1)", accept: "text/html" }, signal: AbortSignal.timeout(30_000), redirect: "follow" });
    return res.ok ? htmlToText(await res.text()) : null;
  } catch {
    return null;
  }
}

/** Una sezione che fallisce non ferma le altre: diventa un controllo «non riuscito» con il motivo. */
async function area(name: QualityCheck["area"], out: QualityCheck[], fn: () => Promise<QualityCheck[]>) {
  try {
    out.push(...(await fn()));
  } catch (err) {
    out.push({ area: name, item: "controllo", ok: false, detail: `Controllo non eseguito: ${err instanceof Error ? err.message : err}` });
  }
}

export async function runQualityCheck(db: SupabaseClient) {
  const checks: QualityCheck[] = [];
  const now = Date.now();

  await area("kev", checks, async () => {
    const catalog = await fetchJson<KevCatalog>(KEV_URL);
    const src = new Map(catalog.vulnerabilities.map((v) => [v.cveID, v]));
    const all = await rows<{ cve_id: string; vendor_project: string; product: string; date_added: string; known_ransomware_use: boolean }>(
      db.from("kev_vulnerabilities").select("cve_id, vendor_project, product, date_added, known_ransomware_use").limit(1000), "KEV");
    const out = sample(all, 10).map((k) => compareKev(k, src.get(k.cve_id) as never));
    // Copertura: quante voci del catalogo ufficiale mancano nel nostro database.
    const { count } = await db.from("kev_vulnerabilities").select("cve_id", { count: "exact", head: true });
    const missing = catalog.vulnerabilities.length - (count ?? 0);
    out.push({ area: "kev", item: "copertura del catalogo", ok: missing <= 0, detail: missing <= 0 ? `Tutte le ${catalog.vulnerabilities.length} voci del catalogo sono nel database.` : `${missing} voci del catalogo non sono ancora nel database.`, url: KEV_URL });
    return out;
  });

  await area("attack", checks, async () => {
    const groups = await rows<{ id: string; external_id: string; name: string }>(db.from("attack_groups").select("id, external_id, name").eq("revoked", false).eq("deprecated", false), "gruppi");
    const out: QualityCheck[] = [];
    for (const g of sample(groups, 3)) {
      const tech = await rows<{ technique_id: string }>(db.from("v_group_techniques").select("technique_id").eq("group_id", g.id).eq("via", "diretta").limit(200), "tecniche del gruppo");
      const ids = await rows<{ external_id: string }>(db.from("attack_techniques").select("external_id").in("id", tech.map((t) => t.technique_id).slice(0, 150)), "codici tecniche");
      // La pagina del gruppo mostra le sotto-tecniche come «.001» sotto la tecnica padre: confronto i codici padre.
      const parents = [...new Set(ids.map((t) => t.external_id.split(".")[0]))];
      out.push(compareAttackGroup({ external_id: g.external_id, name: g.name, techniques: sample(parents, 5) }, await pageText(`https://attack.mitre.org/groups/${g.external_id}/`)));
    }
    return out;
  });

  await area("ransomware", checks, async () => {
    const since = new Date(now - 60 * 24 * 3600_000).toISOString();
    const ours = await rows<{ victim: string; group_name: string; discovered_at: string }>(
      db.from("ransomware_victims").select("victim, group_name, discovered_at").eq("country", "IT").gte("discovered_at", since).limit(500), "rivendicazioni");
    const src = await fetchJson<RansomwareLiveVictim[]>(RANSOMWARE_IT_URL, {}, 90_000);
    const byVictim = new Map(src.map((v) => [`${v.group_name.trim().toLowerCase()}|${v.post_title.trim().toLowerCase()}`, v]));
    return sample(ours, 5).map((c) => compareClaim(c, byVictim.get(`${c.group_name}|${c.victim.trim().toLowerCase()}`)));
  });

  await area("threatfox", checks, async () => {
    const key = process.env.ABUSECH_AUTH_KEY;
    if (!key) throw new Error("chiave abuse.ch non configurata");
    const since = new Date(now - 14 * 24 * 3600_000).toISOString();
    const obs = await rows<{ malware: string | null; iocs: { value: string } | null }>(
      db.from("ioc_observations").select("malware, iocs(value)").eq("source_id", "threatfox").gte("last_seen", since).limit(1000), "osservazioni");
    const out: QualityCheck[] = [];
    for (const o of sample(obs.filter((x) => x.iocs), 10)) {
      const res = await fetch(THREATFOX_URL, {
        method: "POST",
        headers: { "Auth-Key": key, "content-type": "application/json", "user-agent": USER_AGENT },
        body: JSON.stringify({ query: "search_ioc", search_term: o.iocs!.value }),
        signal: AbortSignal.timeout(30_000),
      });
      const json = (await res.json()) as { query_status: string; data: { malware_printable?: string }[] | string };
      out.push(compareIoc({ value: o.iocs!.value, malware: o.malware }, Array.isArray(json.data) ? json.data : null));
    }
    return out;
  });

  await area("citazioni", checks, async () => {
    // Un fatto può citare più fonti (nei dossier: «CISA: «…» · Talos: «…»»): ogni citazione si
    // cerca in tutte le fonti dello stesso report, e basta trovarla in una.
    const st = await rows<{ body: string; report_id: string; reports: { status: string; title: string } | null }>(
      db.from("report_statements").select("body, report_id, reports(status, title)").eq("kind", "fatto").like("body", "%«%").limit(500), "fatti");
    const quotes = st.flatMap((s) => {
      // Le bozze sono private: nel risultato pubblico niente titolo, solo «bozza non pubblicata».
      const label = s.reports?.status === "published" ? `Report «${s.reports.title.slice(0, 60)}»` : "Bozza non pubblicata";
      return extractQuotes(s.body).map((q) => ({ label, quote: q, report: s.report_id }));
    });
    const picked = sample(quotes, 15);
    const srcRows = await rows<{ report_id: string; url: string | null }>(
      db.from("report_sources").select("report_id, url").in("report_id", [...new Set(picked.map((p) => p.report))]), "fonti dei report");
    const urlsOf = new Map<string, string[]>();
    for (const r of srcRows) if (r.url) urlsOf.set(r.report_id, [...(urlsOf.get(r.report_id) ?? []), r.url]);
    const pages = new Map<string, string | null>();
    const out: QualityCheck[] = [];
    for (const p of picked) {
      const urls = urlsOf.get(p.report) ?? [];
      let found: string | null = null;
      for (const u of urls) {
        if (!pages.has(u)) pages.set(u, await pageText(u));
        const r = compareQuote(p.label, p.quote, u, pages.get(u) ?? null);
        if (r.ok) {
          found = u;
          out.push(r);
          break;
        }
      }
      if (!found) {
        const reachable = urls.filter((u) => pages.get(u));
        out.push({
          area: "citazioni", item: p.label, ok: false, url: urls[0],
          detail: `Citazione non trovata in nessuna delle ${urls.length} fonti del report${reachable.length < urls.length ? ` (${urls.length - reachable.length} non raggiungibili)` : ""}: «${p.quote.length > 90 ? `${p.quote.slice(0, 87)}…` : p.quote}».`,
        });
      }
    }
    return out;
  });

  await area("csirt", checks, async () => {
    const items = await rows<{ title: string; url: string | null }>(db.from("intel_items").select("title, url").eq("source_id", "csirt_italia").order("published_at", { ascending: false }).limit(50), "avvisi CSIRT");
    const out: QualityCheck[] = [];
    for (const it of sample(items.filter((i) => i.url), 5)) {
      const text = await pageText(it.url!);
      const ok = !!text && text.toLowerCase().includes(it.title.slice(0, 60).toLowerCase());
      out.push({ area: "csirt", item: it.title.slice(0, 80), ok, url: it.url!, detail: !text ? "Pagina non raggiungibile." : ok ? "Pagina raggiungibile e titolo presente." : "La pagina non contiene il titolo salvato." });
    }
    return out;
  });

  await area("freschezza", checks, async () => {
    const sources = await rows<{ id: string; name: string }>(db.from("sources").select("id, name"), "fonti");
    const out: QualityCheck[] = [];
    for (const s of sources) {
      const { data } = await db.from("ingestion_runs").select("started_at").eq("source_id", s.id).in("status", ["ok", "partial"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (!(s.id in MAX_AGE_HOURS)) continue; // fonti facoltative (es. OTX senza chiave)
      out.push(compareFreshness(s.id, s.name, (data?.started_at as string | undefined) ?? null, now));
    }
    return out;
  });

  const summary = summarize(checks);
  const { error } = await db.from("quality_runs").insert({ summary, checks });
  if (error) throw new Error(`salvataggio controllo: ${error.message}`);
  return { total: checks.length, ok: checks.filter((c) => c.ok).length, summary };
}
