/**
 * threatbrief-cron: avvia i workflow di GitHub Actions agli orari esatti.
 * Non legge né scrive dati: chiama solo l'API «workflow_dispatch» di GitHub. Per gli
 * approfondimenti chiede prima a Supabase (chiave pubblica) se ci sono richieste in coda.
 */
type Env = {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
};
type Controller = { cron: string; scheduledTime: number };
type Job = { workflow: string; inputs?: Record<string, string>; onlyIfPending?: boolean };

/** Cron (come in wrangler.jsonc) → workflow da avviare. */
export const SCHEDULE: Record<string, Job[]> = {
  "41 */6 * * *": [{ workflow: "ingest-feeds.yml" }],
  // if_missing: se il tentativo di riserva di GitHub è già arrivato, non rigenera.
  "17 5 * * *": [{ workflow: "world-report.yml", inputs: { if_missing: "true" } }],
  "37 6 * * *": [{ workflow: "digest.yml", inputs: { if_missing: "true" } }],
  "*/30 * * * *": [{ workflow: "investigate.yml", onlyIfPending: true }],
  "23 4 * * 1": [{ workflow: "quality.yml" }],
};

async function pendingInvestigations(env: Env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/pending_investigations`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return Number(await res.json());
}

async function dispatch(env: Env, job: Job) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${job.workflow}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "threatbrief-cron",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main", ...(job.inputs ? { inputs: job.inputs } : {}) }),
  });
  if (res.status !== 204) throw new Error(`GitHub ${res.status} su ${job.workflow}: ${(await res.text()).slice(0, 200)}`);
}

const worker = {
  async scheduled(controller: Controller, env: Env) {
    const jobs = SCHEDULE[controller.cron] ?? [];
    for (const job of jobs) {
      if (job.onlyIfPending) {
        const n = await pendingInvestigations(env);
        if (!n) continue;
      }
      await dispatch(env, job); // un errore fa risultare fallita l'esecuzione nei log di Cloudflare
      console.log(`avviato ${job.workflow}`);
    }
  },
  // Nessuna pagina: il Worker non ha URL pubblici (workers_dev: false).
  async fetch() {
    return new Response("Not found", { status: 404 });
  },
};

export default worker;
