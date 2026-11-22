# Fase 3 — Settori, mitigazioni/NIS2, ransomware.live

## Cosa c'è
| Pezzo | Dove |
|---|---|
| Ingestion ransomware.live: rivendicazioni contro vittime italiane | `ingest/sources/ransomware.ts` (job `ransomware`, incluso in `feeds`) |
| Settore della vittima: etichetta ransomware.live → settore | `data/sectors.json` (`ransomware_live_activities`) |
| Mappatura mitigazioni ATT&CK → art. 24, c. 2 D.Lgs. 138/2024 | `data/nis2-mapping.json` (versionata, con fonte e motivazione per ogni voce) |
| Classifica delle mitigazioni per tecniche coperte | `lib/attack/mitigations.ts` |
| Pagina Mitigazioni (per lettera NIS2) e scheda mitigazione | `app/mitigazioni/` |
| Settori: griglia e dashboard per settore | `app/settori/` |
| Mitigazioni prioritarie nella scheda attore | `app/attori/[id]/page.tsx` |
| Migration: `published_at` al posto di `attack_date` | `supabase/migrations/…0600_ransomware_published.sql` |
| Test (47) | `tests/mitigations.test.ts` e precedenti |

Prima ingestion (22/11/2026): 762 rivendicazioni contro vittime italiane (2020 → oggi).

## Come si legge una dashboard di settore
- **Attori**: gruppi ATT&CK la cui descrizione cita il settore (attributo *derivato*, confidenza bassa).
- **Tecniche più usate**: quanti di quegli attori usano ogni tecnica, direttamente o tramite software.
- **Mitigazioni prioritarie**: per ogni mitigazione, quante di quelle tecniche copre, pesate per il numero di attori che le usano. Accanto, la lettera NIS2.
- **Ransomware**: rivendicazioni pubblicate dai gruppi sui leak site, raccolte da ransomware.live. Non sono verificate e la UI lo dice.

## Scelte e limiti noti
- **La mappatura NIS2 è una valutazione del progetto**, non una tabella ACN. Il testo delle lettere è quello ufficiale (Normattiva, in vigore dal 16/10/2024). La lettera d) (catena di approvvigionamento) non ha mitigazioni ATT&CK corrispondenti e la pagina lo dice. M1055 e M1056 non sono mappate e sono escluse dalle classifiche.
- **Telecomunicazioni**: ransomware.live non ha una categoria dedicata (le vittime finiscono in "Technology"), quindi il settore telco mostra "n.d." invece di attribuire dati a caso.
- **Leak site**: gli indirizzi .onion non vengono salvati né mostrati.
- **ransomware.live** accetta circa 1 richiesta al minuto senza chiave; la raccolta ogni 6 ore è ampiamente sotto il limite.
- **Le rivendicazioni non hanno un id stabile**: l'id è un hash di gruppo + titolo del post. Se un gruppo ripubblica la stessa vittima con un titolo diverso, compare due volte.
- **Supabase advisor**: resta solo "Leaked password protection disabled", che sul piano gratuito non è attivabile.
