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
import { createAdminClient } from "./lib/db";
import { fetchJson } from "./lib/http";
import { runSource, type SourceResult } from "./lib/run";
import { ATTACK_URL, ingestAttack, parseAttackBundle, type StixBundle } from "./sources/attack";
import { CSIRT_RSS_URL, ingestCsirt, parseCsirtRss } from "./sources/csirt";
import { KEV_URL, ingestKev, parseKev, type KevCatalog } from "./sources/kev";
import { ingestD3fend } from "./sources/d3fend";
import { ingestOtx } from "./sources/otx";
import { RANSOMWARE_IT_URL, ingestRansomwareLive, parseRansomwareLive, type RansomwareLiveVictim } from "./sources/ransomware";
import { ingestThreatFox } from "./sources/threatfox";
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
  feeds: ["kev", "threatfox", "urlhaus", "otx", "csirt", "ransomware", "purge"],
};

const RETENTION_DAYS = 90;

async function purge(db: SupabaseClient) {
  const { data, error } = await db.rpc("purge_stale_iocs", { max_age_days: RETENTION_DAYS });
  if (error) {
    console.error(`✘ pulizia IOC: ${error.message}`);
    return false;
  }
  console.log(`✔ pulizia: ${data} IOC non visti da ${RETENTION_DAYS} giorni rimossi`);
  return true;
}

/** Bozza del digest giornaliero (dati delle ultime ore). La revisione la fa l'analista nell'app. */
async function digest(db: SupabaseClient) {
  try {
    const d = await generateDigest(db, "automatico");
    console.log(`✔ digest ${d.digest_date}: bozza con ${d.items} elementi`);
    return true;
  } catch (err) {
    console.error(`✘ digest: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

const SPECIAL: Record<string, (db: SupabaseClient) => Promise<boolean>> = { purge, digest };

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
