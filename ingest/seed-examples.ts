/**
 * Report di ESEMPIO per la demo pubblica (is_example = true, marcati in UI, PDF, RSS e STIX).
 * I fatti citano fonti reali e i numeri sono calcolati dal DB al momento dell'esecuzione;
 * le valutazioni e i testi del brief sono scritti per la demo e lo dichiarano.
 *
 *   npm run seed:examples
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanAttackText } from "../lib/attack/text";
import { createAdminClient } from "./lib/db";

// Chiavi segrete in .env.ingest (mai in .env.local, che finisce nel Worker); URL pubblico da .env.local.
// Su GitHub Actions i valori arrivano dai secrets e i file non esistono.
for (const file of [".env.ingest", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file assente: variabili già nell'ambiente
  }
}

type Source = { key: string; title: string; url: string; publisher: string; reliability: string; credibility: number };
type Statement = { section: "executive" | "tecnica"; kind: "fatto" | "valutazione"; body: string; source?: string; confidence?: "alto" | "medio" | "basso" };
type Example = {
  slug: string;
  title: string;
  kind: "attore" | "settore" | "evento";
  subject_group_id?: string;
  subject_sector_id?: string;
  subject_event?: string;
  confidence: "alto" | "medio" | "basso";
  exec_risk: "critico" | "alto" | "medio" | "basso";
  exec_summary: string;
  exec_impact: string;
  exec_actions: string[];
  tech_notes?: string;
  sources: Source[];
  statements: Statement[];
  techniques: { external_id: string; note: string | null }[];
  iocIds?: number[];
};

const today = new Date();
const it = (d: Date | string) => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

async function one<R extends { data: unknown; error: { message: string } | null }>(p: PromiseLike<R>, what: string): Promise<NonNullable<R["data"]>> {
  const { data, error } = await p;
  if (error || data === null || data === undefined) throw new Error(`${what}: ${error?.message ?? "nessun dato"}`);
  return data as NonNullable<R["data"]>;
}

/** Procedure dirette del gruppo per le tecniche indicate (solo quelle davvero documentate). */
async function procedures(db: SupabaseClient, groupId: string, wanted: string[]) {
  const techs = await one(db.from("attack_techniques").select("id, external_id").in("external_id", wanted), "tecniche");
  const rels = await one(
    db.from("attack_relationships").select("target_ref, description").eq("source_ref", groupId).eq("relationship_type", "uses").in("target_ref", techs.map((t) => t.id)),
    "procedure",
  );
  const byId = new Map(techs.map((t) => [t.id, t.external_id]));
  return rels.map((r) => ({ external_id: byId.get(r.target_ref)!, note: r.description ? trim(cleanAttackText(r.description), 280) : null }));
}

async function sandworm(db: SupabaseClient): Promise<Example> {
  const g = await one(db.from("attack_groups").select("id, name").eq("external_id", "G0034").single(), "Sandworm");
  const used = await one(db.from("v_group_techniques").select("technique_id").eq("group_id", g.id), "tecniche Sandworm");
  const n = new Set(used.map((u) => u.technique_id)).size;
  const techniques = await procedures(db, g.id, ["T1485", "T1561.002", "T1190", "T1078", "T1059.001", "T1484.001", "T1489", "T1021.002"]);
  return {
    slug: "esempio-sandworm-energia",
    title: "ESEMPIO — Sandworm Team: cosa significa per l'energia in Italia",
    kind: "attore",
    subject_group_id: g.id,
    confidence: "medio",
    exec_risk: "medio",
    exec_summary:
      "Sandworm Team è un gruppo legato all'intelligence militare russa, noto per attacchi distruttivi contro la rete elettrica ucraina e per il malware NotPetya, che nel 2017 si è propagato ben oltre l'obiettivo iniziale. Non risultano, nelle fonti consultate, attacchi del gruppo contro operatori energetici italiani: il rischio principale per l'Italia è l'effetto collaterale di malware distruttivo che si diffonde da fornitori o filiali estere.",
    exec_impact:
      "Un attacco di tipo wiper rende inutilizzabili sistemi e dati: per un operatore energetico significa interruzione dei servizi di supporto (fatturazione, dispacciamento, manutenzione) e tempi di ripristino di settimane senza backup offline verificati.",
    exec_actions: [
      "Verificare che i backup dei sistemi critici siano offline e testare un ripristino completo",
      "Separare le reti IT e OT e limitare gli accessi remoti dei fornitori",
      "Applicare l'autenticazione a più fattori a tutti gli accessi privilegiati e remoti",
    ],
    tech_notes:
      "Testo dimostrativo. Le tecniche elencate sono quelle con procedura documentata da ATT&CK per Sandworm Team; le note riportano la procedura come descritta da MITRE.",
    sources: [
      { key: "mitre", title: "MITRE ATT&CK — Sandworm Team (G0034)", url: "https://attack.mitre.org/groups/G0034/", publisher: "MITRE", reliability: "B", credibility: 2 },
    ],
    statements: [
      { section: "executive", kind: "fatto", source: "mitre", body: "ATT&CK attribuisce Sandworm Team all'unità 74455 del GRU russo e lo descrive come gruppo distruttivo attivo almeno dal 2009." },
      { section: "executive", kind: "fatto", source: "mitre", body: "Tra le operazioni citate da ATT&CK: gli attacchi del 2015 e 2016 contro aziende elettriche ucraine e l'attacco NotPetya del 2017." },
      { section: "executive", kind: "valutazione", confidence: "basso", body: "Valutiamo improbabile un attacco mirato del gruppo contro operatori energetici italiani nel breve periodo; più plausibile un impatto indiretto tramite fornitori o filiali in paesi bersaglio." },
      { section: "tecnica", kind: "fatto", source: "mitre", body: `ATT&CK documenta ${n} tecniche usate dal gruppo, direttamente o tramite il software associato (dati al ${it(today)}).` },
      { section: "tecnica", kind: "valutazione", confidence: "medio", body: "Le tecniche di distruzione dei dati (T1485, T1561.002) sono quelle a più alto impatto: la detection deve puntare alle fasi precedenti, come l'abuso di Group Policy e gli account validi." },
    ],
    techniques,
  };
}

async function ransomwareManifatturiero(db: SupabaseClient): Promise<Example> {
  const since = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate())).toISOString();
  const all = await one(db.from("ransomware_victims").select("group_name, sector_id, sector_raw").eq("country", "IT").gte("discovered_at", since), "rivendicazioni");
  const mfg = all.filter((v) => v.sector_id === "manifatturiero");
  const counts = new Map<string, number>();
  for (const v of mfg) counts.set(v.group_name, (counts.get(v.group_name) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const share = Math.round((mfg.length / Math.max(all.length, 1)) * 100);
  // Posizione del manifatturiero tra le categorie di ransomware.live (calcolata, non assunta).
  const bySector = new Map<string, number>();
  for (const v of all) if (v.sector_raw) bySector.set(v.sector_raw, (bySector.get(v.sector_raw) ?? 0) + 1);
  const rank = [...bySector.values()].filter((c) => c > mfg.length).length + 1;
  const position = rank === 1 ? "il settore italiano con più rivendicazioni ransomware" : `il ${rank}° settore italiano per rivendicazioni ransomware`;
  const actors = await one(db.from("v_group_summary").select("id").contains("sectors", ["manifatturiero"]), "attori manifatturiero");
  return {
    slug: "esempio-ransomware-manifatturiero",
    title: "ESEMPIO — Ransomware e manifatturiero italiano: ultimi 12 mesi",
    kind: "settore",
    subject_sector_id: "manifatturiero",
    confidence: "medio",
    exec_risk: "alto",
    exec_summary: `Negli ultimi 12 mesi il manifatturiero è stato ${position} sui leak site (${mfg.length}, il ${share}% del totale italiano). Le rivendicazioni sono dichiarazioni dei criminali, non attacchi verificati, ma indicano una pressione costante soprattutto su piccole e medie imprese della filiera.`,
    exec_impact:
      "Fermo della produzione, dati di progetto e di clienti pubblicati online, possibili penali contrattuali verso la filiera. Per un soggetto NIS2 si aggiungono gli obblighi di notifica dell'incidente.",
    exec_actions: [
      "Proteggere con MFA tutti gli accessi remoti (VPN, desktop remoto, portali dei fornitori)",
      "Tenere backup offline e verificare il ripristino delle linee produttive critiche",
      "Aggiornare con priorità le vulnerabilità nel catalogo CISA KEV con uso ransomware noto",
    ],
    sources: [
      { key: "rl", title: "ransomware.live — rivendicazioni contro vittime italiane", url: "https://www.ransomware.live/", publisher: "ransomware.live", reliability: "C", credibility: 3 },
      { key: "mitre", title: "MITRE ATT&CK Enterprise (v20.1)", url: "https://attack.mitre.org/", publisher: "MITRE", reliability: "B", credibility: 2 },
    ],
    statements: [
      { section: "executive", kind: "fatto", source: "rl", body: `Dal ${it(since)} al ${it(today)} ransomware.live ha registrato ${mfg.length} rivendicazioni contro organizzazioni italiane del manifatturiero su ${all.length} italiane totali.` },
      { section: "executive", kind: "fatto", source: "rl", body: `I gruppi con più rivendicazioni nel settore sono ${top.map(([g, c]) => `${g} (${c})`).join(", ")}.` },
      { section: "executive", kind: "valutazione", confidence: "medio", body: "I numeri reali sono probabilmente diversi: le vittime che pagano spesso non compaiono e alcuni gruppi pubblicano rivendicazioni gonfiate o false." },
      { section: "tecnica", kind: "fatto", source: "mitre", body: `Le descrizioni ATT&CK di ${actors.length} gruppi citano il settore manifatturiero (estrazione automatica, da verificare caso per caso).` },
    ],
    techniques: [
      { external_id: "T1133", note: "Accesso iniziale tramite VPN e servizi remoti esposti" },
      { external_id: "T1078", note: "Credenziali valide acquistate o rubate" },
      { external_id: "T1567", note: "Esfiltrazione prima della cifratura (doppia estorsione)" },
      { external_id: "T1490", note: "Cancellazione di shadow copy e backup raggiungibili" },
      { external_id: "T1489", note: "Arresto di servizi e database prima della cifratura" },
      { external_id: "T1486", note: "Cifratura dei dati" },
    ],
  };
}

async function cobaltStrike(db: SupabaseClient): Promise<Example> {
  const obs = await one(
    db.from("ioc_observations").select("ioc_id, first_seen, last_seen").eq("source_id", "threatfox").eq("malware", "Cobalt Strike").order("last_seen", { ascending: false }).limit(10),
    "IOC Cobalt Strike",
  );
  if (!obs.length) throw new Error("nessun IOC Cobalt Strike in archivio: esegui prima l'ingestion ThreatFox");
  const first = obs.reduce((a, o) => (o.first_seen < a ? o.first_seen : a), obs[0].first_seen);
  const last = obs.reduce((a, o) => (o.last_seen > a ? o.last_seen : a), obs[0].last_seen);
  const sw = await one(db.from("attack_software").select("id").eq("external_id", "S0154").single(), "Cobalt Strike");
  const users = await one(db.from("v_group_software").select("group_id").eq("software_id", sw.id), "gruppi Cobalt Strike");
  return {
    slug: "esempio-cobalt-strike-c2",
    title: "ESEMPIO — Server di comando Cobalt Strike segnalati da ThreatFox",
    kind: "evento",
    subject_event: "Infrastruttura C2 Cobalt Strike",
    confidence: "alto",
    exec_risk: "medio",
    exec_summary:
      "Cobalt Strike è uno strumento commerciale per test di intrusione, molto usato anche da criminali e gruppi statali per controllare i computer compromessi. Gli indirizzi allegati sono server di comando segnalati di recente: bloccarli e cercarli nei log aiuta a scoprire compromissioni in corso.",
    exec_impact:
      "Una connessione verso questi server da un computer aziendale indica, con buona probabilità, una compromissione attiva che spesso precede furto di dati o ransomware.",
    exec_actions: [
      "Bloccare gli indicatori allegati su firewall e proxy",
      "Cercare connessioni verso questi indicatori nei log degli ultimi 30 giorni",
      "Se ci sono riscontri, isolare il computer e avviare la procedura di gestione degli incidenti",
    ],
    tech_notes: "IOC allegati: quelli attribuiti a Cobalt Strike da ThreatFox al momento della generazione dell'esempio. Gli indicatori di infrastruttura invecchiano in fretta: verificarli prima di usarli.",
    sources: [
      { key: "tf", title: "ThreatFox — IOC Cobalt Strike", url: "https://threatfox.abuse.ch/browse/malware/win.cobalt_strike/", publisher: "abuse.ch", reliability: "B", credibility: 2 },
      { key: "mitre", title: "MITRE ATT&CK — Cobalt Strike (S0154)", url: "https://attack.mitre.org/software/S0154/", publisher: "MITRE", reliability: "B", credibility: 2 },
    ],
    statements: [
      { section: "executive", kind: "fatto", source: "tf", body: `Tra il ${it(first)} e il ${it(last)} ThreatFox ha segnalato ${obs.length} indicatori attribuiti a Cobalt Strike, allegati a questo report.` },
      { section: "executive", kind: "fatto", source: "mitre", body: `ATT&CK documenta l'uso di Cobalt Strike da parte di ${new Set(users.map((u) => u.group_id)).size} gruppi.` },
      { section: "executive", kind: "valutazione", confidence: "alto", body: "Un indicatore Cobalt Strike da solo non permette di attribuire un'intrusione a un attore specifico: lo strumento è diffuso tra criminali, gruppi statali e red team." },
    ],
    techniques: [
      { external_id: "T1071.001", note: "Beacon su HTTP/HTTPS verso il server di comando" },
      { external_id: "T1055", note: "Iniezione del beacon in processi legittimi" },
      { external_id: "T1059.001", note: "Esecuzione di comandi PowerShell" },
      { external_id: "T1105", note: "Scaricamento di strumenti aggiuntivi" },
    ],
    iocIds: [...new Set(obs.map((o) => o.ioc_id))],
  };
}

async function insertExample(db: SupabaseClient, ex: Example) {
  await one(db.from("reports").delete().eq("slug", ex.slug).eq("is_example", true).select("id"), `pulizia ${ex.slug}`);
  const now = new Date().toISOString();
  const report = await one(
    db
      .from("reports")
      .insert({
        slug: ex.slug, title: ex.title, kind: ex.kind, owner_id: null, is_example: true,
        subject_group_id: ex.subject_group_id ?? null, subject_sector_id: ex.subject_sector_id ?? null, subject_event: ex.subject_event ?? null,
        tlp: "CLEAR", confidence: ex.confidence, status: "published", published_at: now,
        exec_risk: ex.exec_risk, exec_summary: ex.exec_summary, exec_impact: ex.exec_impact, exec_actions: ex.exec_actions, tech_notes: ex.tech_notes ?? null,
      })
      .select("id")
      .single(),
    `report ${ex.slug}`,
  );
  const sources = await one(
    db.from("report_sources").insert(ex.sources.map((s) => ({ title: s.title, url: s.url, publisher: s.publisher, reliability: s.reliability, credibility: s.credibility, report_id: report.id }))).select("id, title"),
    "fonti",
  );
  const sourceId = new Map(ex.sources.map((s) => [s.key, sources.find((x) => x.title === s.title)!.id]));
  await one(
    db.from("report_statements").insert(
      ex.statements.map((s, i) => ({
        report_id: report.id, section: s.section, kind: s.kind, body: s.body, position: i,
        source_id: s.source ? sourceId.get(s.source) : null, confidence: s.confidence ?? null,
      })),
    ).select("id"),
    "fatti e valutazioni",
  );
  const techs = await one(db.from("attack_techniques").select("id, external_id").in("external_id", ex.techniques.map((t) => t.external_id)).eq("revoked", false), "tecniche");
  const rows = ex.techniques.filter((t) => techs.some((x) => x.external_id === t.external_id)).map((t) => ({ report_id: report.id, technique_id: techs.find((x) => x.external_id === t.external_id)!.id, note: t.note }));
  if (rows.length) await one(db.from("report_techniques").insert(rows).select("report_id"), "tecniche report");
  if (ex.iocIds?.length) await one(db.from("report_iocs").insert(ex.iocIds.map((ioc_id) => ({ report_id: report.id, ioc_id }))).select("report_id"), "IOC report");
  console.log(`✔ ${ex.slug}: ${ex.statements.length} fatti/valutazioni, ${rows.length} tecniche, ${ex.iocIds?.length ?? 0} IOC`);
}

async function main() {
  const db = createAdminClient();
  let failed = false;
  for (const build of [sandworm, ransomwareManifatturiero, cobaltStrike]) {
    try {
      await insertExample(db, await build(db));
    } catch (e) {
      failed = true;
      console.error(`✘ ${build.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

void main();
