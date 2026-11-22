# Fase 2 — Ingestion IOC, Fonti, Analisi

## Cosa c'è
| Pezzo | Dove |
|---|---|
| Dedup IOC: una riga per indicatore normalizzato, un'osservazione per fonte | `iocs`, `ioc_observations`, funzione `ingest_iocs` (migration `…0500_ioc_functions.sql`) |
| Collegamenti IOC → ATT&CK con provenienza (`fonte` = avversario OTX, `derivato` = famiglia malware = software ATT&CK) | funzione `link_iocs` |
| ThreatFox, URLhaus (chiave abuse.ch), OTX (solo pulse TLP:CLEAR), CSIRT Italia (RSS) | `ingest/sources/` |
| Retention: IOC non visti da 90 giorni rimossi | `purge_stale_iocs`, job `purge` nel gruppo `feeds` |
| Pagina Fonti: stato, ultima lettura, errori, ultime 25 esecuzioni | `app/fonti/page.tsx` |
| Analisi: estrazione IOC (anche defanged), confronto con DB e KEV, tecniche e software ATT&CK suggeriti | `lib/ioc/`, `lib/analysis/`, `app/analisi/` |
| Salvataggio analisi (solo analista, RLS: le vede solo chi le ha create) | `app/analisi/actions.ts`, `app/analisi/[id]/page.tsx` |
| Login analista (registrazioni chiuse) | `app/login/`, `proxy.ts` |
| Test (42) | `tests/` |

Prima ingestion (22/11/2026): 1.091 IOC unici (URLhaus 1.000, ThreatFox 102), 50 alert CSIRT Italia.

## Verificato
- Analisi con IOC reali: IP Cobalt Strike da ThreatFox → *collegato* a S0154 e ai gruppi che lo usano; URL da URLhaus → *già visto*; CVE in KEV con uso ransomware; IP di documentazione → *nuovo*.
- Login, salvataggio, pagina di dettaglio. Da anonimo la stessa pagina dà 404 e l'API REST non restituisce analisi.

## Comandi
```bash
npm run ingest -- feeds                 # KEV, ThreatFox, URLhaus, OTX, CSIRT + pulizia 90 giorni
npm run ingest -- threatfox urlhaus     # solo alcune fonti
```

## Da fare a mano
1. **Disattivare le registrazioni** (se non fatto): Supabase → Authentication → Sign In / Providers → "Allow new users to sign up" off.
2. **Secret GitHub** (quando crei il repo): `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ABUSECH_AUTH_KEY`, `OTX_API_KEY` (facoltativa).
3. **OTX** (facoltativo): senza chiave la fonte risulta "saltata" e il resto funziona.

## Scelte e limiti noti
- **ThreatFox tronca le risposte lunghe** (verificato anche con curl: la connessione si chiude sempre allo stesso byte). L'ingestion tiene i record completi ricevuti e registra la run come **parziale**, visibile nella pagina Fonti. Quando l'API torna a rispondere per intero la run torna "ok" da sola.
- **Collegamenti "derivati"**: un IP di una famiglia malware documentata in ATT&CK mostra i gruppi che usano quel software. È un indizio (molti gruppi usano Cobalt Strike), non un'attribuzione: la UI lo dice in chiaro e distingue i colori.
- **OTX**: si importano solo i pulse TLP:CLEAR/WHITE, perché il sito è pubblico.
- **Testo di esempio** dell'Analisi: indicatori reali presi dal DB, narrazione fittizia, marcata come tale in testa al testo.
