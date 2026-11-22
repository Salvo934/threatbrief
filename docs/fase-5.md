# Fase 5 — Deploy Cloudflare, landing, README

## Cosa c'è
| Pezzo | Dove |
|---|---|
| Configurazione OpenNext / Wrangler | `wrangler.jsonc`, `open-next.config.ts`, script `preview` / `deploy` |
| Controllo del bundle: solo variabili `NEXT_PUBLIC_*` nel Worker | `scripts/verify-worker-env.mjs` (eseguito da `preview` e `deploy`) |
| Chiavi segrete separate in `.env.ingest` | `.env.ingest.example`, loader in `ingest/cli.ts` e `ingest/seed-examples.ts` |
| Rinnovo della sessione dal browser al posto del proxy | `components/layout/session-keeper.tsx` |
| Landing con ciclo CTI, numeri reali, ultimi briefs, stato fonti | `app/page.tsx` |
| README per il portfolio | `README.md` |

## Problemi trovati e risolti prima del deploy
1. **Segreti nel Worker.** OpenNext copia i file `.env` dentro il bundle (`.open-next/cloudflare/next-env.mjs`), quindi la chiave segreta Supabase e la chiave abuse.ch sarebbero finite su Cloudflare. Ora i segreti stanno in `.env.ingest`, che OpenNext non legge, e uno script blocca il deploy se nel bundle compare una variabile non pubblica. Verificato: nel bundle restano solo `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. **Pagine bloccate sui Worker.** Con `cacheComponents` attivo il rendering si blocca sul runtime Cloudflare (errore "code had hung"). Ho disattivato `cacheComponents` e `partialPrefetching` e messo `dynamic = "force-dynamic"` nel layout: tutte le pagine leggono dati aggiornati a ogni richiesta.
3. **Proxy Node.js non supportato.** `proxy.ts` (Next 16 gira solo su Node.js) andava in errore sul Worker appena c'era il cookie di sessione. Al suo posto, il client Supabase nel browser rinnova il token e aggiorna i cookie; login e logout passano già da Server Actions.

## Verificato sul Worker locale (workerd, `npm run preview`)
- Tutte le pagine pubbliche rispondono 200 con i contenuti attesi, STIX e RSS compresi.
- Sessione dell'analista attiva (I miei report) e Server Action dell'Analisi funzionanti.

## Da tenere d'occhio dopo il deploy
- **CPU**: il piano gratuito concede 10 ms di CPU per richiesta (Cloudflare tollera qualche sforamento occasionale). Il runtime locale non applica il limite, quindi va misurato nei log del Worker, dove il tempo di CPU è riportato per ogni invocazione. Se le pagine più pesanti (matrice, settori) sforano con regolarità, le alternative sono ottimizzarle o passare al piano Workers Paid (5 $/mese).
- **Avvisi di `npm audit`**: 3 moderati in `glob`/`minimatch`, dipendenze della CLI di build di OpenNext che non finiscono nel Worker.
