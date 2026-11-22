# Fase 0 — Schema DB e struttura del progetto (proposta)

Migration: [`supabase/migrations/20261122000000_init.sql`](../supabase/migrations/20261122000000_init.sql)
(provata su Postgres 17 locale: si applica senza errori, test RLS ok).

## 1. Schema in breve

| Area | Tabelle | Requisito annuncio |
|---|---|---|
| Fonti | `sources`, `ingestion_runs` | 1 (raccolta) — pagina "Fonti" |
| ATT&CK | `attack_tactics`, `attack_techniques`, `attack_groups`, `attack_software`, `attack_mitigations`, `attack_relationships` + viste `v_group_techniques`, `v_group_software`, `v_technique_mitigations` | 2 (TTP) |
| Attori | `actor_attributes` (motivazione / settore / paese con **metodo + evidenza + fonte**) | 2 |
| Vulnerabilità | `kev_vulnerabilities` | 3, settori |
| Intel testuale | `intel_items` (pulse OTX, bollettini CSIRT Italia) | 1 |
| IOC | `iocs` (dedup su tipo+valore), `ioc_observations` (una per fonte, first/last_seen), `ioc_links` (IOC → attore/software con provenienza) | 1, 2 |
| Ransomware | `ransomware_victims` (solo IT) | settori |
| Analista | `analyses`, `reports`, `report_sources`, `report_statements`, `report_techniques`, `report_iocs`, `analysts` | 4, 5 |
| Settori | `sectors` (7 righe) — regole di matching in `data/sectors.json` | settori |

### Scelte di design
- **Fatti vs valutazioni nello schema**, non solo nella UI: `report_statements.kind` = `fatto` (obbligatoria una `report_sources`) o `valutazione` (obbligatoria la confidenza). Il DB rifiuta un fatto senza fonte.
- **Admiralty per fonte** (`report_sources.reliability` A–F, `credibility` 1–6), non per report: è il modo corretto di usarlo.
- **TLP rispettato dal DB**: `status = 'published'` è possibile solo con `tlp = 'CLEAR'` (vincolo CHECK) e il pubblico legge solo quelli (RLS). Un report AMBER/RED non può finire su /briefs neanche per errore.
- **Attori: niente dati inventati.** ATT&CK non ha campi strutturati per motivazione/settori/paesi. Ogni valore in `actor_attributes` dice *come* è stato ottenuto (`fonte` / `derivato` da keyword / `analista`) e porta l'evidenza (es. la frase della descrizione ATT&CK). La UI lo mostra.
- **Dedup IOC**: `iocs` è unico per `(type, value)` normalizzato; ogni fonte aggiunge una `ioc_observations`. "Visto da 3 fonti" esce gratis.
- **Esempi**: colonna `is_example` su `actor_attributes`, `analyses`, `reports`. I client non possono creare righe di esempio (le inserisce solo il seed).
- **Chi scrive**: solo utenti in `analysts` (aggiunti a mano). Anche se la registrazione restasse aperta per errore, un utente qualunque non può scrivere nulla.
- **Ingestion**: scrive con `service_role` lato server (bypassa RLS). Nessuna policy di scrittura per anon/authenticated sui dati di riferimento.
- **Spazio (Supabase free, 500 MB)**: niente JSON grezzo salvato; `purge_stale_iocs(90)` elimina IOC non visti da 90 giorni, tranne quelli citati in un report.
- **Mapping NIS2**: resta in `data/nis2-mapping.json` (versionato e citato), come richiesto; non va nel DB.

### Test eseguiti sulla migration
| Caso | Esito |
|---|---|
| anon vede solo il report TLP:CLEAR pubblicato | 1 su 2 ✔ |
| utente loggato non analista prova a creare un report | bloccato dalla RLS ✔ |
| analista crea un report e vede i propri + quelli pubblici | ✔ |
| report AMBER con status `published` | rifiutato (CHECK) ✔ |
| statement `fatto` senza fonte | rifiutato (CHECK) ✔ |

## 2. Struttura delle cartelle

```
CTI/
├─ app/
│  ├─ (pubblico)/                 # lettura senza login
│  │  ├─ page.tsx                 # dashboard
│  │  ├─ attori/ [id]/            # scheda attore + heatmap
│  │  ├─ matrice/                 # confronto 2 attori
│  │  ├─ settori/ [id]/
│  │  ├─ mitigazioni/ [tecnica]/
│  │  ├─ fonti/                   # stato feed
│  │  └─ briefs/ [slug]/  rss.xml/route.ts
│  ├─ (analista)/                 # protetto (middleware + RLS)
│  │  ├─ analisi/
│  │  └─ report/ nuovo/ [id]/
│  ├─ login/
│  └─ api/report/[id]/ pdf/route.ts  stix/route.ts
├─ components/
│  ├─ ui/                         # bottoni, badge, tabelle
│  ├─ attack/                     # Heatmap, MatrixCompare
│  ├─ report/                     # TlpBadge, AdmiraltyBadge, StatementList
│  └─ charts/                     # Recharts
├─ lib/
│  ├─ supabase/ server.ts  browser.ts  admin.ts   # admin = service_role, import "server-only"
│  ├─ ioc/ extract.ts  normalize.ts               # regex, refang (hxxp, [.]), validazione
│  ├─ attack/ technique-hints.ts                  # T-id e nomi tecnica nel testo
│  ├─ stix/ export.ts                             # bundle STIX 2.1 degli IOC
│  ├─ pdf/                                        # template @react-pdf
│  └─ db.types.ts                                 # generato da Supabase
├─ ingest/                        # TS puro: solo fetch + supabase-js, gira ovunque
│  ├─ sources/ attack.ts kev.ts threatfox.ts urlhaus.ts otx.ts csirt.ts ransomware-live.ts
│  ├─ run.ts                      # esegue ogni fonte isolata: errore su una ≠ stop delle altre
│  └─ cli.ts                      # `npm run ingest -- kev`
├─ data/
│  ├─ nis2-mapping.json           # ATT&CK mitigation → misura art. 24 D.Lgs. 138/2024, con citazioni
│  ├─ sectors.json                # keyword, vendor KEV, etichette ransomware.live per settore
│  └─ README.md                   # fonti, versione, licenze
├─ supabase/ migrations/  seed.sql   # seed = SOLO esempi marcati is_example
├─ tests/                         # vitest: estrazione/normalizzazione IOC, export STIX
├─ .github/workflows/             # ingest-attack.yml (settimanale), ingest-feeds.yml (ogni 6 h)
├─ docs/                          # questo file, screenshot
├─ .env.example                   # nomi delle variabili, nessun valore
└─ wrangler.jsonc  open-next.config.ts
```

## 3. Decisioni da confermare

**A. Dove gira l'ingestion — ✅ DECISO (22/11/2026): tutto su GitHub Actions.**
ATT&CK con cadenza settimanale + avvio manuale; i feed leggeri ogni 6 h. Cloudflare Workers serve solo l'app.
Niente `worker/custom-worker.ts`: la cartella esce dalla struttura.

Motivazione:
Dai limiti ufficiali Cloudflare: con Workers **Free** un cron ha **10 ms di CPU**, e con qualsiasi piano la memoria è **128 MB**.
- Il bundle STIX ATT&CK Enterprise pesa decine di MB: parsarlo in un Worker è a rischio memoria con qualsiasi piano.
- KEV (~1–2 MB) e i feed IOC sforano 10 ms di CPU sul piano Free.

Proposta: il codice di `ingest/` è unico e indipendente dal runtime, e lo eseguono due schedulatori:
1. **ATT&CK** → GitHub Actions (Node), settimanale + manuale. ATT&CK esce ~2 volte l'anno.
2. **Feed leggeri** (KEV, ThreatFox, URLhaus, OTX, CSIRT, ransomware.live):
   - *opzione consigliata*: anche questi su GitHub Actions ogni 6 h → costo zero, log visibili nel repo (si mostrano bene nel portfolio);
   - *alternativa*: Cloudflare Cron Triggers, ma richiede **Workers Paid (5 $/mese)**.

**B. Registrazione utenti**: la disattivo in Supabase Auth; esiste solo il tuo account, aggiunto a `analysts`. Ok?

**C. Supabase**: vedo il connettore Supabase collegato. In Fase 1 creo un nuovo progetto (free, regione UE – Francoforte) o ne hai già uno da usare?

**D. Controlli da fare nelle fasi successive** (non bloccano): termini d'uso attuali di ransomware.live e della sua API; esistenza di un feed RSS su csirt.gov.it (altrimenti si salta, mostrandolo in "Fonti").
