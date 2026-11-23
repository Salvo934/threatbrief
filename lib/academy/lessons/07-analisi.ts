import type { Lesson } from "../types";

export const analisi: Lesson = {
  slug: "analisi-bias-confidenza",
  group: "Metodo",
  title: "Pensare da analista: fatti, giudizi, confidenza e bias",
  summary: "Il cuore del mestiere: separare ciò che sai da ciò che valuti, esprimere l'incertezza e difendersi dai propri bias.",
  minutes: 35,
  goals: [
    "Separare fatti e giudizi analitici",
    "Usare il linguaggio stimativo e i livelli di confidenza in modo corretto",
    "Applicare ACH e Key Assumptions Check; riconoscere i bias principali",
  ],
  sections: [
    {
      title: "Fatti e giudizi",
      blocks: [
        "Un **fatto** è verificabile e ha una fonte: «Il 3 settembre il gruppo X ha rivendicato l'attacco all'azienda Y sul proprio leak site [1]». Un **giudizio** (valutazione) è l'interpretazione dell'analista: «Valutiamo probabile che il gruppo continui a colpire aziende della filiera nei prossimi mesi».",
        "Mescolarli è l'errore più grave in un report: il lettore non sa più cosa è certo e cosa è opinione. In ThreatBrief la separazione è imposta dal database: un fatto senza fonte o una valutazione senza confidenza vengono rifiutati, e nel report stanno in due colonne distinte.",
      ],
    },
    {
      title: "Probabilità e confidenza: due cose diverse",
      blocks: [
        "La **probabilità** dice quanto pensi che qualcosa sia vero o accada. La **confidenza** dice quanto è solida la base su cui lo pensi (qualità e quantità delle fonti, coerenza, ipotesi). Si può avere una stima «probabile» con confidenza bassa.",
        "Lo standard più citato è l'**ICD 203** della comunità di intelligence statunitense, che associa parole e intervalli:",
        {
          table: {
            head: ["Espressione", "Intervallo indicativo"],
            rows: [
              ["Quasi nessuna possibilità", "1–5%"],
              ["Molto improbabile", "5–20%"],
              ["Improbabile", "20–45%"],
              ["Possibilità pari", "45–55%"],
              ["Probabile", "55–80%"],
              ["Molto probabile", "80–95%"],
              ["Quasi certo", "95–99%"],
            ],
          },
        },
        "La confidenza si esprime di solito come **alta, media o bassa**, motivata: «Valutiamo con **confidenza media** che sia **probabile**… perché due fonti indipendenti concordano, ma non abbiamo visibilità diretta su…».",
        { note: "Evita parole vaghe come «potrebbe», «non si esclude», «sembra»: ogni lettore le intende a modo suo. Scegli un termine della scala e tienilo coerente in tutto il report.", tone: "warn" },
      ],
    },
    {
      title: "Tecniche di analisi strutturata",
      blocks: [
        {
          list: [
            "**ACH — Analysis of Competing Hypotheses** (Richards Heuer): elenchi tutte le ipotesi plausibili, poi le prove; per ogni prova segni se è coerente o incoerente con ogni ipotesi. Vince l'ipotesi con **meno prove contro**, non con più prove a favore: è un antidoto al bias di conferma.",
            "**Key Assumptions Check**: scrivi le assunzioni su cui poggia il giudizio («l'attore non ha cambiato infrastruttura»), e per ognuna chiediti quanto è solida e cosa succede se è falsa.",
            "**Devil's advocate / Red team**: qualcuno argomenta deliberatamente contro la conclusione.",
            "**Indicatori di cambiamento**: definisci in anticipo quali segnali ti farebbero cambiare valutazione.",
          ],
        },
      ],
    },
    {
      title: "I bias che fregano gli analisti",
      blocks: [
        {
          table: {
            head: ["Bias", "Come si manifesta in CTI", "Contromisura"],
            rows: [
              ["**Conferma**", "Cerchi solo le prove che supportano l'attore che sospetti già", "ACH; cerca attivamente prove contrarie"],
              ["**Ancoraggio**", "La prima ipotesi (o il primo report letto) condiziona tutto", "Riparti da zero con un collega; elenca ipotesi alternative"],
              ["**Mirror imaging**", "Pensi che l'avversario ragioni come te", "Studia obiettivi e vincoli dell'attore"],
              ["**Disponibilità**", "Sopravvaluti la minaccia di cui si parla di più in questo momento", "Confronta con i dati (es. rivendicazioni per settore)"],
              ["**Autorità del vendor**", "Accetti un'attribuzione perché la dice una fonte famosa", "Valuta le prove, non il nome; usa l'Admiralty"],
            ],
          },
        },
      ],
    },
  ],
  practice: [
    { label: "Brief: Sandworm e l'energia", href: "/briefs/esempio-sandworm-energia", task: "Separa i fatti dalle valutazioni: la valutazione ha la confidenza giusta? Riformulala con un termine della scala ICD 203." },
    { label: "Profilo di un attore", href: "/attori/G0007", task: "I badge gialli sono giudizi automatici: quali assunzioni fanno le regole che li producono?" },
  ],
  exercise:
    "Fai un'ACH su questa domanda: «La rivendicazione di un gruppo ransomware contro un'azienda italiana è autentica?». Ipotesi: autentica; falsa per estorcere; riuso di dati di un vecchio attacco; attacco a un fornitore. Elenca almeno 5 prove possibili e compila la matrice.",
  pitfalls: [
    "Scrivere giudizi come se fossero fatti («il gruppo X attaccherà…»).",
    "Confondere probabilità e confidenza.",
    "Usare parole diverse per lo stesso livello di probabilità nello stesso report.",
    "Non dichiarare le assunzioni.",
  ],
  interview: [
    {
      q: "Come esprimi l'incertezza in un report?",
      a: "Separando fatti e valutazioni. Per le valutazioni uso un linguaggio stimativo standard, come la scala dell'ICD 203, per la probabilità, e dichiaro a parte la confidenza, alta, media o bassa, con il motivo: qualità e numero delle fonti, assunzioni, lacune. Evito parole vaghe come «potrebbe».",
    },
    {
      q: "Cos'è l'Analysis of Competing Hypotheses?",
      a: "È una tecnica di Heuer: elenco tutte le ipotesi plausibili e tutte le prove, e valuto ogni prova contro ogni ipotesi. Si sceglie l'ipotesi con meno prove incoerenti, non con più conferme. Serve a contrastare il bias di conferma e a rendere il ragionamento trasparente e rivedibile.",
    },
    {
      q: "Quali bias cognitivi sono più pericolosi per un analista CTI?",
      a: "Il bias di conferma, cioè cercare prove per l'attore che sospetto già; l'ancoraggio alla prima ipotesi; il mirror imaging; la disponibilità, cioè sovrastimare la minaccia del momento; e l'autorità della fonte. Le contromisure sono tecniche strutturate come ACH e Key Assumptions Check, e il confronto con un collega.",
    },
    {
      q: "Differenza tra probabilità e confidenza?",
      a: "La probabilità è quanto ritengo verosimile un evento; la confidenza è quanto è solida la base del mio giudizio. Posso dire «probabile, con confidenza bassa» se ho una sola fonte di qualità media che va in quella direzione.",
    },
  ],
  sources: [
    { title: "ODNI — Intelligence Community Directive 203 (Analytic Standards)", url: "https://www.dni.gov/files/documents/ICD/ICD-203.pdf" },
    { title: "Richards J. Heuer — Psychology of Intelligence Analysis (CIA, gratuito)", url: "https://www.cia.gov/resources/csi/books-monographs/psychology-of-intelligence-analysis-2/" },
    { title: "CIA — A Tradecraft Primer: Structured Analytic Techniques", url: "https://www.cia.gov/resources/csi/static/Tradecraft-Primer-apr09.pdf" },
  ],
};
