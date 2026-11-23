import type { Lesson } from "../types";

export const ciclo: Lesson = {
  slug: "ciclo-intelligence",
  group: "Fondamenti",
  title: "Il ciclo dell'intelligence e i requisiti (PIR)",
  summary: "Le sei fasi, perché tutto parte dalle domande giuste e come scrivere un buon PIR.",
  minutes: 25,
  goals: [
    "Elencare e spiegare le fasi del ciclo dell'intelligence",
    "Scrivere requisiti di intelligence (PIR) chiari e verificabili",
    "Spiegare perché il feedback chiude il ciclo",
  ],
  sections: [
    {
      title: "Le sei fasi",
      blocks: [
        {
          list: [
            "**Direzione (planning & direction)**: si definiscono le domande a cui rispondere, cioè i requisiti, e le priorità.",
            "**Raccolta (collection)**: si individuano e si interrogano le fonti utili a rispondere.",
            "**Elaborazione (processing)**: i dati grezzi diventano utilizzabili (normalizzazione, deduplicazione, traduzione, arricchimento).",
            "**Analisi (analysis)**: si interpretano le informazioni, si formulano giudizi con un livello di confidenza.",
            "**Diffusione (dissemination)**: il prodotto arriva al lettore giusto, nel formato giusto, al momento giusto.",
            "**Feedback**: il lettore dice se è stato utile; i requisiti si aggiornano.",
          ],
          ordered: true,
        },
        "In ThreatBrief il ciclo è visibile: **Fonti** (raccolta), deduplicazione degli IOC e arricchimento degli attori (elaborazione), **Settori/Matrice/Analisi** (analisi), **Briefs**, PDF, STIX e RSS (diffusione). Il feedback, in un team vero, arriva dai lettori.",
        { note: "Il ciclo non è una catena di montaggio: in pratica si torna indietro spesso (un'analisi rivela un buco nella raccolta, un feedback cambia le priorità)." },
      ],
    },
    {
      title: "Tutto parte dalle domande: i requisiti",
      blocks: [
        "Senza requisiti, un team CTI raccoglie tutto e non risponde a niente. I requisiti si organizzano di solito su più livelli:",
        {
          table: {
            head: ["Sigla", "Cos'è", "Esempio"],
            rows: [
              ["**PIR** — Priority Intelligence Requirement", "Domanda prioritaria della direzione", "Quali minacce possono fermare la produzione nei nostri stabilimenti italiani nei prossimi 6 mesi?"],
              ["**SIR** — Specific Intelligence Requirement", "Sotto-domanda più precisa", "Quali gruppi ransomware hanno colpito aziende manifatturiere italiane nel 2026 e come hanno ottenuto l'accesso?"],
              ["**EEI** — Essential Elements of Information", "Il dato concreto da cercare", "Vulnerabilità VPN sfruttate da quei gruppi; numero di rivendicazioni per mese"],
            ],
          },
        },
        "Un buon PIR è: **legato a una decisione**, **delimitato** (chi, cosa, dove, quando), **rispondibile** con le fonti disponibili e **rivisto periodicamente**.",
      ],
    },
    {
      title: "Come si scrive un PIR",
      blocks: [
        {
          table: {
            head: ["Debole", "Migliore", "Perché"],
            rows: [
              ["Quali sono le minacce informatiche?", "Quali attori hanno colpito ospedali italiani negli ultimi 12 mesi e con quale accesso iniziale?", "Delimitato nel settore, luogo e tempo; porta a difese concrete"],
              ["Siamo a rischio ransomware?", "Quali vulnerabilità dei nostri sistemi esposti sono sfruttate attivamente da gruppi ransomware?", "Rispondibile (catalogo KEV, inventario) e azionabile (patching)"],
            ],
          },
        },
        "Il trucco: chiediti sempre **«quale decisione cambia se rispondo a questa domanda?»**. Se nessuna, il requisito è da riscrivere.",
      ],
    },
    {
      title: "Misurare il valore",
      blocks: [
        "Le domande sul valore della CTI sono frequenti nei colloqui. Metriche ragionevoli:",
        {
          list: [
            "**Uso**: quanti prodotti hanno portato a un'azione (blocco, patch, regola di detection, decisione di investimento).",
            "**Tempestività**: quanto prima rispetto all'impatto è arrivato l'avviso.",
            "**Copertura**: quante tecniche degli attori prioritari sono coperte da detection o mitigazioni.",
            "**Feedback** qualitativo dei lettori.",
          ],
        },
        { note: "Evita di misurare il volume («abbiamo prodotto 200 report»): misura l'effetto.", tone: "warn" },
      ],
    },
  ],
  practice: [
    { label: "Fonti", href: "/fonti", task: "Osserva la fase di raccolta: frequenza, stato, errori. Cosa succede se una fonte non risponde?" },
    { label: "Settori → Manifatturiero", href: "/settori/manifatturiero", task: "Scrivi un PIR, un SIR e due EEI a cui questa pagina risponde, e uno a cui non può rispondere." },
  ],
  exercise:
    "Scegli un settore e scrivi 3 PIR come se fossi l'analista di un'azienda di quel settore. Per ognuno indica: la decisione che supporta, le fonti di ThreatBrief che usi e cosa ti manca (una fonte che non hai).",
  pitfalls: [
    "Saltare la fase di direzione e raccogliere tutto «per sicurezza».",
    "Scrivere requisiti troppo generici («minacce informatiche») o non rispondibili.",
    "Dimenticare il feedback: senza, non sai se il lavoro serve.",
  ],
  interview: [
    {
      q: "Descrivi il ciclo dell'intelligence.",
      a: "Direzione, raccolta, elaborazione, analisi, diffusione e feedback. Si parte dai requisiti del lettore, si raccolgono e si elaborano i dati, si analizzano per produrre giudizi con un livello di confidenza, si diffonde il prodotto nel formato giusto e si raccoglie il feedback per aggiornare i requisiti. In pratica è iterativo, non lineare.",
    },
    {
      q: "Cos'è un PIR e come lo scriveresti?",
      a: "È un requisito di intelligence prioritario: una domanda della direzione a cui il team deve rispondere. Lo scriverei legato a una decisione, delimitato per settore, area e periodo, rispondibile con le fonti disponibili. Lo scomporrei in requisiti più specifici e negli elementi di informazione da cercare.",
    },
    {
      q: "Come dimostreresti il valore di un team CTI al management?",
      a: "Mostrando l'effetto, non il volume. Quanti prodotti hanno portato a un'azione concreta: patch prioritarie, blocchi, nuove detection. Quanto anticipo abbiamo avuto rispetto agli incidenti, quanta copertura sulle tecniche degli attori prioritari, più il feedback dei lettori.",
    },
  ],
  sources: [
    { title: "SANS — Cyber Threat Intelligence: requisiti e ciclo (white paper e blog)", url: "https://www.sans.org/cyber-security-courses/cyber-threat-intelligence/" },
    { title: "MITRE ATT&CK — CTI Training", url: "https://attack.mitre.org/resources/learn-more-about-attack/training/cti/" },
  ],
};
