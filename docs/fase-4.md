# Fase 4 — Report, export PDF/STIX, /briefs e RSS

## Cosa c'è
| Pezzo | Dove |
|---|---|
| Editor dei report (solo analista): metadati, brief esecutivo, fonti, fatti/valutazioni, tecniche, IOC, stato | `app/report/`, Server Actions in `app/report/actions.ts` |
| Vista report: brief esecutivo / scheda tecnica | `components/report/report-view.tsx` |
| TLP 2.0 (colori FIRST), codice Admiralty, confidenza | `components/report/tlp.tsx`, `lib/report/admiralty.ts` |
| Regole di pubblicazione (TLP:CLEAR, completezza, brief in 1 pagina) | `lib/report/validate.ts` + vincoli nel DB |
| Export PDF generato nel browser (@react-pdf/renderer) | `components/report/report-pdf.tsx`, `pdf-button.tsx` |
| Export STIX 2.1 | `lib/report/stix.ts`, `app/briefs/[slug]/stix`, `app/report/[id]/stix` |
| Pagina pubblica /briefs e feed RSS | `app/briefs/`, `lib/report/rss.ts` |
| 3 report di ESEMPIO (attore, settore, evento) | `ingest/seed-examples.ts` (`npm run seed:examples`) |
| Test (58) | `tests/report.test.ts`, `tests/pdf.test.tsx`, … |

## Come sono garantite le regole
- **Fatti separati dalle valutazioni**: già nello schema (`report_statements.kind`). Un fatto senza fonte o una valutazione senza confidenza vengono rifiutati dal DB, e l'editor lo spiega prima. Nella vista sono due colonne distinte; nello STIX sono `note` con etichetta `fatto` / `valutazione`.
- **Solo TLP:CLEAR su /briefs**: vincolo del DB, policy RLS anon e controllo nell'editor. Bozze e report non CLEAR restituiscono 404 a chi non è il proprietario, anche nell'export STIX (verificato).
- **Brief esecutivo in una pagina**: limiti di lunghezza nell'editor (sintesi 900, impatto 500, 3 azioni da 160, 4 fatti/valutazioni da 300 caratteri). Un test genera il PDF con tutti i campi al massimo e verifica che sia di 1 pagina; il conteggio delle pagine è stato a sua volta controllato con un brief volutamente troppo lungo, che ne produce 3.
- **IOC con provenienza**: si possono allegare solo indicatori già raccolti dalle fonti; l'editor segnala quelli scartati.

## STIX 2.1
- Bundle con `report`, identità ThreatBrief, marking **TLP 2.0 ufficiali** (id dall'estensione OASIS), `intrusion-set` (report su attore) o `identity` di classe settore, `attack-pattern` con riferimento ATT&CK, `indicator` con pattern STIX, `vulnerability` per le CVE e relazioni `uses`/`indicates`.
- Confidenza sulla scala STIX (alta 85, media 50, bassa 15); fonti come `external_references` con codice Admiralty.
- Id **stabili**: riesportare lo stesso report dà gli stessi id, quindi chi importa non vede duplicati. Sono derivati da hash ma in formato UUIDv4, come la specifica raccomanda per gli SDO.
- Validato con il validatore ufficiale OASIS (`stix2-validator`): i 3 esempi risultano **Valid**. Restano solo avvisi opzionali sulle URL senza hash, gli stessi dei bundle MITRE.

## Report di esempio
Tutti marcati `is_example`: badge "ESEMPIO" nella UI, banner nel PDF, titolo nel feed RSS ed etichetta `esempio` nello STIX. I fatti citano fonti reali (MITRE ATT&CK, ThreatFox, ransomware.live) e i numeri sono calcolati dal DB quando si esegue `npm run seed:examples`. Le valutazioni e i testi del brief sono scritti per la demo.

## Scelte e limiti noti
- **PDF generato nel browser** e non dal server: @react-pdf usa WebAssembly e font che non vanno d'accordo con i limiti dei Worker Cloudflare (Fase 5). In più, così il server non lavora.
- **Font PDF standard (Helvetica)**: niente simboli fuori dal Latin-1, quindi nel PDF le frecce diventano trattini.
- **Lo slug** si genera alla creazione e non cambia, così i link già condivisi restano validi.
- **Riordino di fatti/valutazioni**: per ora nell'ordine di inserimento; se serve, si aggiunge.
