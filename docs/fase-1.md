# Fase 1 — Setup, ATT&CK + KEV, Attori e Matrice

## Cosa c'è
| Pezzo | Dove |
|---|---|
| Progetto Supabase `threatbrief` (free, eu-central-1) | migration in `supabase/migrations/` (5 file, tutte applicate) |
| Ingestion ATT&CK Enterprise (STIX 2.1, v20.1) | `ingest/sources/attack.ts` |
| Ingestion CISA KEV | `ingest/sources/kev.ts` |
| Attributi attore derivati (settori, paesi, motivazione) | `ingest/enrich/actor-attributes.ts`, regole in `data/sectors.json`, `data/motivations.json` |
| Dashboard | `app/page.tsx` |
| Elenco attori con ricerca e filtro per settore | `app/attori/page.tsx` |
| Scheda attore: profilo con evidenze, heatmap, procedure, software | `app/attori/[id]/page.tsx` |
| Confronto tra 2 attori (comuni / esclusive / Jaccard) | `app/matrice/page.tsx` |
| Workflow GitHub Actions | `.github/workflows/` (ingest-attack settimanale, ingest-feeds ogni 6 h, CI) |
| Test (21) | `tests/` — parser, regole di estrazione, matrice |

Prima ingestion (22/11/2026): 178 attori attivi, 706 tecniche attive, 19.545 relazioni, 1.790 KEV.

## Comandi
```bash
npm run dev                       # app su http://localhost:3000
npm run ingest -- attack kev      # aggiorna il DB (serve SUPABASE_SECRET_KEY in .env.local)
npm run ingest -- attack --dry-run  # scarica e analizza senza scrivere
npm test && npm run typecheck && npm run lint
```

## Da fare a mano
1. **Disattivare le registrazioni**: Supabase → Authentication → Sign In / Providers → disattiva "Allow new users to sign up".
2. **Quando crei il repo GitHub** (serve per le Actions): Settings → Secrets and variables → Actions →
   `SUPABASE_URL` = `https://qbdjtmtmrjaiogxpmfpu.supabase.co` e `SUPABASE_SECRET_KEY` = la secret key.

## Scelte e limiti noti
- **Next.js 16 con Cache Components**: i dati sono letti a ogni richiesta dentro `<Suspense>`. Niente `use cache`, così su Cloudflare non restano dati congelati al momento della build.
- **Attributi derivati = euristica**: regex sulle descrizioni ATT&CK, confidenza bassa, frase di evidenza sempre mostrata. Esclusi i casi di attribuzione ("Russia-based", "on behalf of the Chinese government", "Russian GRU"), gli arresti e "outside of X". Restano possibili omissioni: preferisco perdere un settore che inventarlo.
- **Detection**: da ATT&CK v18 la detection non è più un campo della tecnica ma un oggetto separato (*detection strategy*). La colonna `detection` resta vuota; si può aggiungere nella Fase 3 insieme alle mitigazioni.
- **Campaign** ATT&CK: non importate (non richieste); si possono aggiungere per la timeline degli attori.
