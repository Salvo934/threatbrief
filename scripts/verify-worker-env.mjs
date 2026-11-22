// Controllo di sicurezza prima del deploy: OpenNext copia i file .env nel Worker
// (.open-next/cloudflare/next-env.mjs). Lì devono esserci solo variabili NEXT_PUBLIC_*:
// nessuna chiave segreta (Supabase secret, abuse.ch, OTX) deve finire su Cloudflare.
import { readFileSync } from "node:fs";

const file = ".open-next/cloudflare/next-env.mjs";
const src = readFileSync(file, "utf8");
const names = [...src.matchAll(/"([A-Z0-9_]+)":/g)].map((m) => m[1]);
const leaked = [...new Set(names.filter((n) => !n.startsWith("NEXT_PUBLIC_")))];
const secretLike = /sb_secret_[A-Za-z0-9_-]{10,}/.test(src);

if (leaked.length || secretLike) {
  console.error(`✘ Variabili non pubbliche nel bundle del Worker: ${leaked.join(", ") || "(valore sb_secret_)"}`);
  console.error("  Spostale in .env.ingest e rifai la build.");
  process.exit(1);
}
console.log(`✔ Worker: solo variabili pubbliche (${[...new Set(names)].join(", ") || "nessuna"})`);
