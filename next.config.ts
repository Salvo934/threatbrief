import type { NextConfig } from "next";

/**
 * Pagine pubbliche: identiche per tutti i visitatori (nessun dato di sessione nel server
 * rendering), quindi Workers Cache di Cloudflare può servirle senza eseguire il Worker.
 * L'header è "mirato" a Cloudflare: i browser ricevono comunque il Cache-Control di Next
 * (no-store). Le pagine dell'analista (/report, /analisi, /login) non sono in elenco:
 * restano "private, no-store" e Cloudflare non le mette mai in cache.
 */
const PUBLIC_PATHS = [
  "/",
  "/attori",
  "/attori/:id",
  "/matrice",
  "/settori",
  "/settori/:id",
  "/mitigazioni",
  "/mitigazioni/:id",
  "/fonti",
  "/briefs",
  "/briefs/rss.xml",
  "/briefs/:slug",
  "/briefs/:slug/stix",
  "/briefing",
  "/briefing/:date",
  "/competenze",
  "/monitoraggio",
  "/minacce",
  "/minacce/:slug",
  "/minacce/notte/:date",
];
// 30 minuti fresca; poi, per un giorno, la copia in cache viene servita subito mentre il Worker
// la rigenera in background. I feed si aggiornano ogni 6 ore e il sito ha poco traffico:
// così quasi ogni visita è un HIT (zero CPU) e i dati restano indietro al massimo di poco.
const EDGE_CACHE = "public, max-age=1800, stale-while-revalidate=86400";

const nextConfig: NextConfig = {
  // Cache Components disattivati: su Cloudflare Workers (OpenNext 1.20) il rendering si blocca
  // (setTimeout del runtime, vedi opennextjs-cloudflare#1318). Tutte le pagine sono dinamiche
  // (force-dynamic nel layout); la cache la fa Cloudflare davanti al Worker.
  async headers() {
    return PUBLIC_PATHS.map((source) => ({
      source,
      headers: [{ key: "Cloudflare-CDN-Cache-Control", value: EDGE_CACHE }],
    }));
  },
  turbopack: {
    // La home contiene un altro package-lock.json: fissiamo la root sul progetto.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
