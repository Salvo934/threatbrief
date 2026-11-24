/**
 * Uso:
 *   npm run ingest -- attack kev            # esegue le fonti indicate
 *   npm run ingest -- feeds                 # tutte le fonti leggeri (kev, IOC, CSIRT) + pulizia
 *   npm run ingest -- attack --dry-run      # scarica e analizza, senza scrivere sul DB
 *
 * Ogni fonte gira isolata: se una fallisce le altre continuano. Il processo esce con
 * codice 1 se almeno una fonte è fallita, così la run di GitHub Actions risulta rossa.
 * Una fonte senza chiave API viene "saltata" (non è un errore).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDigest } from "../lib/digest/build";
import { generateDefenseDrafts } from "../lib/defense/autoreport";
import { processNextInvestigation, setupInvestigator } from "../lib/investigate/run";
import { generateWorldReport } from "../lib/world/build";
import { createAdminClient } from "./lib/db";
import { fetchJson } from "./lib/http";
import { runSource, type SourceResult } from "./lib/run";
import { ATTACK_URL, ingestAttack, parseAttackBundle, type StixBundle } from "./sources/attack";
import { CISA_ADVISORIES_URL, ingestCisaAdvisories, parseCisaRss } from "./sources/cisa";
import { CSIRT_RSS_URL, ingestCsirt, parseCsirtRss } from "./sources/csirt";
import { KEV_URL, ingestKev, parseKev, type KevCatalog } from "./sources/kev";
import { ingestD3fend } from "./sources/d3fend";
import { ingestOtx } from "./sources/otx";
import { RANSOMWARE_IT_URL, ingestRansomwareLive, parseRansomwareLive, type RansomwareLiveVictim } from "./sources/ransomware";
import { ingestThreatFox } from "./sources/threatfox";
import { ingestWorldClaims } from "./sources/world-claims";
import { ingestUrlhaus } from "./sources/urlhaus";

// Chiavi segrete in .env.ingest (mai in .env.local, che finisce nel Worker); URL pubblico da .env.local.
// Su GitHub Actions i valori arrivano dai secrets e i file non esistono.
for (const file of [".env.ingest", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file assente: variabili già nell'ambiente
  }
}

type Job = {
  sourceId: string;
  run: (db: SupabaseClient) => Promise<SourceResult>;
  dryRun?: () => Promise<Record<string, unknown>>;
};

const JOBS: Record<string, Job> = {
  attack: {
    sourceId: "mitre_attack",
    run: ingestAttack,
    dryRun: async () => {
      const p = parseAttackBundle(await fetchJson<StixBundle>(ATTACK_URL));
      return {
        version: p.version, tactics: p.tactics.length, techniques: p.techniques.length, groups: p.groups.length,
        software: p.software.length, mitigations: p.mitigations.length, relationships: p.relationships.length,
        actorAttributes: p.actorAttributes.length,
      };
    },
  },
  kev: {
    sourceId: "cisa_kev",
    run: ingestKev,
    dryRun: async () => {
      const p = parseKev(await fetchJson<KevCatalog>(KEV_URL));
      return { version: p.version, total: p.total, valid: p.rows.length };
    },
  },
  d3fend: { sourceId: "mitre_d3fend", run: ingestD3fend },
  threatfox: { sourceId: "threatfox", run: ingestThreatFox },
  urlhaus: { sourceId: "urlhaus", run: ingestUrlhaus },
  otx: { sourceId: "otx", run: ingestOtx },
  ransomware: {
    sourceId: "ransomware_live",
    run: ingestRansomwareLive,
    dryRun: async () => {
      const rows = parseRansomwareLive(await fetchJson<RansomwareLiveVictim[]>(RANSOMWARE_IT_URL));
      return { victims: rows.length, withSector: rows.filter((r) => r.sector_id).length };
    },
  },
  cisa: {
    sourceId: "cisa_advisories",
    run: ingestCisaAdvisories,
    dryRun: async () => {
      const items = parseCisaRss(await (await fetch(CISA_ADVISORIES_URL, { headers: { "user-agent": "Mozilla/5.0 (compatible; ThreatBrief-ingest/0.1)" } })).text());
      return { advisories: items.length, first: items[0]?.title };
    },
  },
  worldclaims: { sourceId: "ransomware_live_world", run: ingestWorldClaims },
  csirt: {
    sourceId: "csirt_italia",
    run: ingestCsirt,
    dryRun: async () => {
      const items = parseCsirtRss(await (await fetch(CSIRT_RSS_URL)).text());
      return { items: items.length, withCves: items.filter((i) => i.cves.length).length, first: items[0]?.title };
    },
  },
};

const GROUPS: Record<string, string[]> = {
  feeds: ["kev", "threatfox", "urlhaus", "otx", "csirt", "cisa", "ransomware", "worldclaims", "purge", "drafts"],
};

const RETENTION_DAYS = 90;
const IF_MISSING = process.argv.includes("--if-missing");

async function purge(db: SupabaseClient) {
  const { data, error } = await db.rpc("purge_stale_iocs", { max_age_days: RETENTION_DAYS });
  if (error) {
    console.error(`✘ pulizia IOC: ${error.message}`);
    return false;
  }
  console.log(`✔ pulizia: ${data} IOC non visti da ${RETENTION_DAYS} giorni rimossi`);
  return true;
}

const romeDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
const romeHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(d));

/**
 * GitHub può ritardare o saltare le esecuzioni pianificate: i workflow del mattino partono più
 * volte con --if-missing, e solo la prima che arriva genera davvero (dopo le 3 di notte, ora di Roma).
 */
async function doneThisMorning(db: SupabaseClient, table: "world_reports" | "digests", dateCol: "report_date" | "digest_date") {
  const now = new Date();
  const { data } = await db.from(table).select("generated_at").eq(dateCol, romeDate(now)).maybeSingle();
  if (!data?.generated_at) return false;
  const at = new Date(data.generated_at as string);
  return romeDate(at) === romeDate(now) && romeHour(at) >= 3;
}

/** Bozza del digest giornaliero (dati delle ultime ore). La revisione la fa l'analista nell'app. */
async function digest(db: SupabaseClient) {
  try {
    if (IF_MISSING && (await doneThisMorning(db, "digests", "digest_date"))) {
      console.log("✔ digest: già generato stamattina, salto");
      return true;
    }
    const d = await generateDigest(db, "automatico");
    console.log(`✔ digest ${d.digest_date}: bozza con ${d.items} elementi`);
    return true;
  } catch (err) {
    console.error(`✘ digest: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/** Rapporto della notte: ultime 24 ore nel mondo, generato automaticamente e pubblico. */
async function world(db: SupabaseClient) {
  try {
    if (IF_MISSING && (await doneThisMorning(db, "world_reports", "report_date"))) {
      console.log("✔ rapporto della notte: già generato stamattina, salto");
      return true;
    }
    const r = await generateWorldReport(db);
    console.log(`✔ rapporto della notte ${r.report_date}: ${r.claims} rivendicazioni, ${r.actors} attori collegati ad ATT&CK, ${r.techniques} tecniche${r.ai ? ", lettura scritta con IA" : ""}`);
    return true;
  } catch (err) {
    console.error(`✘ rapporto della notte: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/** Bozze di report per i nuovi avvisi su difesa e aerospazio (dopo la raccolta CISA). */
async function drafts(db: SupabaseClient) {
  try {
    const n = await generateDefenseDrafts(db);
    console.log(`✔ bozze automatiche: ${n} nuovi report da rivedere`);
    return true;
  } catch (err) {
    console.error(`✘ bozze automatiche: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/** Crea o aggiorna l'agente investigatore e il suo ambiente (Managed Agents). */
async function investigatorSetup() {
  try {
    const r = await setupInvestigator();
    console.log(`✔ agente investigatore ${r.agent_id} (versione ${r.version}), ambiente ${r.environment_id}`);
    return true;
  } catch (err) {
    console.error(`✘ configurazione agente: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/** Esegue la richiesta di approfondimento più vecchia, se c'è. */
async function investigate(db: SupabaseClient) {
  try {
    const r = await processNextInvestigation(db);
    if (!r) console.log("✔ approfondimenti: nessuna richiesta in coda");
    else if (r.ok) console.log(`✔ approfondimento completato: ${r.message}`);
    else console.error(`✘ approfondimento fallito: ${r.message}`);
    return !r || r.ok;
  } catch (err) {
    console.error(`✘ approfondimento: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

const SPECIAL: Record<string, (db: SupabaseClient) => Promise<boolean>> = {
  purge, digest, world, drafts, investigate,
  "investigator-setup": () => investigatorSetup(),
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const names = args.filter((a) => !a.startsWith("--")).flatMap((n) => GROUPS[n] ?? [n]);
  const unknown = names.filter((n) => !JOBS[n] && !SPECIAL[n]);
  if (names.length === 0 || unknown.length) {
    console.error(
      `Fonti disponibili: ${[...Object.keys(JOBS), ...Object.keys(SPECIAL), ...Object.keys(GROUPS)].join(", ")}` +
        (unknown.length ? ` (sconosciute: ${unknown.join(", ")})` : ""),
    );
    process.exit(2);
  }

  if (dryRun) {
    for (const n of names) {
      const dr = JOBS[n]?.dryRun;
      console.log(n, dr ? await dr() : "(dry-run non disponibile)");
    }
    return;
  }

  const db = createAdminClient();
  let failures = 0;
  for (const n of names) {
    const ok = SPECIAL[n] ? await SPECIAL[n](db) : await runSource(db, JOBS[n].sourceId, () => JOBS[n].run(db));
    if (!ok) failures++;
  }
  if (failures) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
