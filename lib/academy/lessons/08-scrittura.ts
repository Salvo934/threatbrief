import type { Lesson } from "../types";

export const scrittura: Lesson = {
  slug: "scrivere-per-il-lettore",
  group: "Metodo",
  title: "Scrivere per il lettore: dal brief esecutivo alla scheda tecnica",
  summary: "BLUF, struttura, azioni: come si scrive un prodotto di intelligence che viene letto e usato.",
  minutes: 30,
  goals: [
    "Scrivere un brief esecutivo di una pagina con BLUF e azioni",
    "Strutturare una scheda tecnica utile al SOC",
    "Revisionare un report con una checklist",
  ],
  sections: [
    {
      title: "BLUF: la conclusione in cima",
      blocks: [
        "**BLUF** (Bottom Line Up Front): la prima frase dice la cosa più importante e cosa significa per il lettore. Il dirigente potrebbe leggere solo quella.",
        {
          table: {
            head: ["Debole", "BLUF"],
            rows: [
              ["Negli ultimi mesi abbiamo osservato un incremento dell'attività di diversi gruppi ransomware che…", "Il manifatturiero è il settore italiano più colpito dal ransomware nel 2026: le VPN non aggiornate sono la porta d'ingresso principale, e l'MFA sugli accessi remoti riduce di molto il rischio."],
            ],
          },
        },
      ],
    },
    {
      title: "Il brief esecutivo (una pagina)",
      blocks: [
        {
          list: [
            "**Livello di rischio** (critico, alto, medio, basso) e perché.",
            "**Sintesi** in linguaggio non tecnico: cosa sta succedendo, a chi, con quale probabilità.",
            "**Impatto** per l'organizzazione: operativo, economico, legale e reputazionale.",
            "**Fatti** (con fonte) separati dalle **valutazioni** (con confidenza).",
            "**Al massimo 3 azioni**, concrete, con un responsabile implicito («abilitare l'MFA su VPN e portali dei fornitori»).",
            "**TLP**, data, fonti.",
          ],
        },
        "Lo trovi applicato nell'editor di ThreatBrief: i limiti di lunghezza (sintesi 900 caratteri, 3 azioni, 4 fatti o valutazioni) e un test automatico garantiscono che il brief stia in una pagina.",
      ],
    },
    {
      title: "La scheda tecnica",
      blocks: [
        {
          list: [
            "**Tecniche ATT&CK** con la procedura osservata, non solo l'ID.",
            "**Indicatori** con tipo, data e contesto; esportabili (STIX, CSV).",
            "**Detection**: cosa cercare nei log, idee per regole (Sigma, query EDR).",
            "**Mitigazioni** in ordine di priorità, collegate alle tecniche (e, in Italia, alle misure NIS2).",
            "**Fonti** con codice Admiralty.",
          ],
        },
      ],
    },
    {
      title: "Checklist di revisione",
      blocks: [
        {
          list: [
            "La prima frase risponde alla domanda del lettore?",
            "Ogni fatto ha una fonte? Ogni valutazione ha una confidenza?",
            "Le parole di probabilità sono coerenti con la scala usata?",
            "Le azioni sono concrete, fattibili e al massimo tre?",
            "C'è gergo che il lettore non capisce? (Nel brief esecutivo: niente ID ATT&CK, niente hash.)",
            "Il TLP è corretto per quanto contiene?",
            "Cosa non sappiamo? Le lacune sono dichiarate?",
          ],
          ordered: true,
        },
        { note: "Rileggi il giorno dopo e taglia ogni frase che non aiuta una decisione. Un report corto e letto vale più di uno completo e ignorato." },
      ],
    },
  ],
  practice: [
    { label: "Brief: ransomware e manifatturiero", href: "/briefs/esempio-ransomware-manifatturiero", task: "Applica la checklist al brief esecutivo: cosa miglioreresti?" },
    { label: "Scheda tecnica Cobalt Strike", href: "/briefs/esempio-cobalt-strike-c2?vista=tecnica", task: "Cosa manca per essere davvero utile a un SOC? (Suggerimento: detection.)" },
    { label: "I miei report", href: "/report", task: "Crea un report vero: l'editor ti impone le regole di questa lezione." },
  ],
  exercise:
    "Scegli un alert recente di CSIRT Italia (pagina Fonti → CSIRT Italia) e scrivi due versioni: un brief esecutivo di massimo 150 parole per un CdA e una scheda tecnica di una pagina per il SOC. Poi pubblicale come report in ThreatBrief.",
  pitfalls: [
    "Raccontare la cronologia invece di partire dalla conclusione.",
    "Mettere hash e ID ATT&CK nel brief esecutivo.",
    "Elencare dieci azioni: nessuna verrà fatta.",
    "Non dire cosa non si sa.",
  ],
  interview: [
    {
      q: "Come struttureresti un report per un CdA?",
      a: "Una pagina: la conclusione in prima riga, poi il livello di rischio, una sintesi senza gergo, l'impatto sul business, fatti con fonte separati dalle valutazioni con confidenza, e al massimo tre azioni concrete. Niente hash né ID tecnici: quelli vanno nella scheda tecnica per il SOC.",
    },
    {
      q: "Cosa rende azionabile un prodotto di intelligence?",
      a: "Risponde a una domanda del lettore, arriva in tempo, dice chiaramente cosa fare e con quale priorità, ed è nel formato che il lettore usa: una pagina per il dirigente, indicatori esportabili e idee di detection per il SOC. Se nessuno cambia una decisione dopo averlo letto, non era azionabile.",
    },
    {
      q: "Hai un esempio di report che hai scritto?",
      a: "Sì. Nel mio progetto ThreatBrief ogni report ha un brief esecutivo di una pagina e una scheda tecnica, con TLP 2.0, fonti valutate con l'Admiralty, fatti separati dalle valutazioni ed export PDF e STIX 2.1. Posso mostrarne uno e spiegare le scelte. (Qui racconta un tuo report, non un esempio.)",
    },
  ],
  sources: [
    { title: "ODNI — ICD 203 (standard analitici e di scrittura)", url: "https://www.dni.gov/files/documents/ICD/ICD-203.pdf" },
    { title: "SigmaHQ — formato aperto per regole di detection", url: "https://github.com/SigmaHQ/sigma" },
  ],
};
