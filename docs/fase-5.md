# Fase 5 — Deploy Cloudflare, landing, README

## Cosa c'è
| Pezzo | Dove |
|---|---|
| Configurazione OpenNext / Wrangler | `wrangler.jsonc`, `open-next.config.ts`, script `preview` / `deploy` |
| Controllo del bundle: solo variabili `NEXT_PUBLIC_*` nel Worker | `scripts/verify-worker-env.mjs` (eseguito da `preview` e `deploy`) |
| Chiavi segrete separate in `.env.ingest` | `.env.ingest.example`, loader in `ingest/cli.ts` e `ingest/seed-examples.ts` |
| Stato account e rinnovo della sessione nel browser (al posto del proxy) | `components/layout/account-badge.tsx` |
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

## Deploy (22/11/2026)
- Repo pubblico: https://github.com/Salvo934/threatbrief. La CI è passata e la raccolta feed è stata eseguita a mano su Actions, con tutte le fonti ok (ThreatFox parziale, OTX saltata).
- Sito: https://threatbrief.salvo-bonavita9808.workers.dev. Tutte le 18 rotte controllate rispondono 200 con i contenuti attesi.
- **CPU misurata** con `wrangler tail`, in ms per richiesta: home 26–29, attori 44–70, scheda attore 72–73, matrice 64, settori 31–47, mitigazioni 16, brief 19–33. Tutte le richieste sono andate a buon fine, ma sono sopra i 10 ms del piano gratuito, che Cloudflare tollera solo occasionalmente.

## Ottimizzazione con Workers Cache (22/11/2026)
- **Il badge dell'account** (nome, "I miei report", Accedi/Esci) ora viene calcolato nel browser (`components/layout/account-badge.tsx`). Il server non legge più la sessione nelle pagine pubbliche, quindi sono identiche per tutti i visitatori.
- **Pagine pubbliche** (dashboard, attori, matrice, settori, mitigazioni, fonti, briefs, RSS, STIX pubblico): ricevono `Cloudflare-CDN-Cache-Control: public, max-age=1800, stale-while-revalidate=86400`, letto solo da Cloudflare. I browser continuano a ricevere `private, no-store`.
- **Pagine dell'analista** (`/report`, `/analisi`, `/login`): nessun header di cache, quindi Cloudflare risponde `BYPASS` e passano sempre dal Worker.
- **Verificato online**: le pagine pubbliche danno MISS alla prima richiesta e HIT dalla seconda. Le pagine dell'analista danno sempre BYPASS. Con `wrangler tail`, su 12 richieste il Worker è stato eseguito 6 volte: gli HIT non consumano CPU. La navigazione interna (RSC) funziona: l'header `Vary` tiene separati HTML e dati di navigazione.
- **Limite residuo**: un MISS costa ancora 40–210 ms di CPU (di più subito dopo un deploy, a Worker "freddo"). Ora però è raro: capita una volta ogni 30 minuti per pagina, e con lo stale-while-revalidate avviene in background. Ogni deploy azzera la cache.
- **Ritardo sui dati**: un report appena pubblicato compare su /briefs entro circa 30 minuti, non subito.
