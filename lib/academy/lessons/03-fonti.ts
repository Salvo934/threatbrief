import type { Lesson } from "../types";

export const fonti: Lesson = {
  slug: "fonti-tlp-admiralty",
  group: "Fondamenti",
  title: "Fonti, TLP 2.0 e codice Admiralty",
  summary: "Da dove arrivano le informazioni, come se ne valuta l'affidabilità e come si gestisce la condivisione.",
  minutes: 25,
  goals: [
    "Classificare le fonti CTI e conoscerne pregi e limiti",
    "Usare il codice Admiralty in modo motivato",
    "Applicare correttamente le cinque etichette TLP 2.0",
  ],
  sections: [
    {
      title: "Tipi di fonti",
      blocks: [
        {
          table: {
            head: ["Tipo", "Esempi", "Pregi", "Limiti"],
            rows: [
              ["**Aperte (OSINT)**", "MITRE ATT&CK, CISA KEV e advisory, CSIRT Italia, report pubblici dei vendor, abuse.ch", "Gratuite, verificabili, citabili", "Volume alto, ritardo, qualità variabile"],
              ["**Commerciali**", "Piattaforme di threat intelligence a pagamento", "Copertura, analisi, supporto", "Costo, scatola nera, sovrapposizioni"],
              ["**Comunità di condivisione**", "ISAC di settore, gruppi MISP, CERT nazionali", "Rilevanza per il settore, tempestività", "Regole di condivisione (TLP), reciprocità"],
              ["**Interne**", "Log, incidenti passati, telemetria EDR, phishing segnalati", "Le più rilevanti in assoluto", "Richiedono strumenti e processi"],
              ["**Fonti chiuse / underground**", "Forum, leak site, canali criminali", "Segnali anticipatori", "Rischi legali ed etici, affidabilità bassa"],
            ],
          },
        },
        "ThreatBrief usa solo fonti aperte e gratuite. Nota come ognuna ha un **limite dichiarato** nella pagina Fonti o nelle schede: ThreatFox a volte risponde in modo parziale, ransomware.live riporta rivendicazioni non verificate.",
      ],
    },
    {
      title: "Il codice Admiralty",
      blocks: [
        "Il codice Admiralty (detto anche sistema NATO) separa due giudizi che spesso si confondono: **quanto è affidabile la fonte** e **quanto è credibile questa specifica informazione**.",
        {
          table: {
            head: ["Affidabilità della fonte", "", "Credibilità dell'informazione", ""],
            rows: [
              ["**A**", "Completamente affidabile", "**1**", "Confermata da altre fonti indipendenti"],
              ["**B**", "Generalmente affidabile", "**2**", "Probabilmente vera"],
              ["**C**", "Abbastanza affidabile", "**3**", "Possibilmente vera"],
              ["**D**", "Non generalmente affidabile", "**4**", "Dubbia"],
              ["**E**", "Non affidabile", "**5**", "Improbabile"],
              ["**F**", "Affidabilità non valutabile", "**6**", "Veridicità non valutabile"],
            ],
          },
        },
        "Esempi: un advisory di CISA su una vulnerabilità sfruttata è tipicamente **B2** o **A2**; una rivendicazione su un leak site ransomware, raccolta da un aggregatore, è più vicina a **C3**, perché la fonte è nota ma l'informazione non è verificata. Una fonte affidabile può riportare un'informazione dubbia, e viceversa: per questo i giudizi sono due.",
        { note: "La «A» si dà raramente: richiede una lunga storia di affidabilità. Motiva sempre il voto in una riga." , tone: "warn" },
      ],
    },
    {
      title: "TLP 2.0: chi può ricevere cosa",
      blocks: [
        "Il **Traffic Light Protocol** (versione 2.0, FIRST, 2022) indica fino a dove può essere condivisa un'informazione. Lo decide chi la produce, chi la riceve lo rispetta.",
        {
          table: {
            head: ["Etichetta", "Può essere condivisa con…"],
            rows: [
              ["**TLP:RED**", "Solo i destinatari presenti (la riunione, l'email), nessun altro"],
              ["**TLP:AMBER+STRICT**", "Solo all'interno dell'organizzazione del destinatario"],
              ["**TLP:AMBER**", "L'organizzazione del destinatario e i suoi clienti, secondo necessità"],
              ["**TLP:GREEN**", "La comunità del destinatario (es. il settore), non pubblicamente"],
              ["**TLP:CLEAR**", "Chiunque: divulgazione senza limiti (sostituisce il vecchio TLP:WHITE)"],
            ],
          },
        },
        "In ThreatBrief i report partono come **AMBER** e il database impedisce di pubblicare su /briefs qualsiasi cosa non sia **CLEAR**. Dall'OTX importiamo solo pulse CLEAR/WHITE: un sito pubblico non può contenere informazioni con restrizioni.",
      ],
    },
    {
      title: "Etica e legalità della raccolta",
      blocks: [
        {
          list: [
            "Rispetta i termini d'uso delle fonti (es. MITRE ATT&CK va attribuito).",
            "Non interagire con gli attori, non acquistare dati rubati, non accedere a sistemi altrui.",
            "Minimizza i dati personali: un analista non ha bisogno di ripubblicare dati delle vittime.",
            "Nei leak site: osserva tramite aggregatori o con procedure approvate; ThreatBrief non salva né mostra gli indirizzi .onion.",
          ],
        },
      ],
    },
  ],
  practice: [
    { label: "Fonti", href: "/fonti", task: "Per ogni fonte proponi un codice Admiralty di default e motivalo in una riga." },
    { label: "Briefs → Cobalt Strike", href: "/briefs/esempio-cobalt-strike-c2", task: "Guarda i codici Admiralty delle fonti: sei d'accordo? Cosa cambieresti?" },
  ],
  exercise:
    "Prendi tre informazioni: un advisory CISA, un post di un ricercatore su X e una rivendicazione su ransomware.live. Assegna a ognuna un codice Admiralty e un'etichetta TLP con cui la ridistribuiresti, motivando le scelte.",
  pitfalls: [
    "Usare un solo giudizio («fonte affidabile, quindi vero»).",
    "Dare A1 per abitudine.",
    "Inoltrare un'informazione TLP:AMBER a un fornitore esterno, o pubblicarla: è una violazione di fiducia che chiude i canali di condivisione.",
    "Scrivere «TLP:WHITE»: nella versione 2.0 è diventato CLEAR.",
  ],
  interview: [
    {
      q: "Come valuti l'affidabilità di una fonte?",
      a: "Separando la fonte dall'informazione, come fa il codice Admiralty. Per la fonte guardo lo storico di accuratezza, l'accesso diretto ai dati, eventuali interessi o bias; per l'informazione la conferma da fonti indipendenti, la coerenza con ciò che so, il dettaglio tecnico verificabile. Motivo sempre il voto.",
    },
    {
      q: "Spiega il TLP 2.0.",
      a: "È un protocollo di FIRST che indica i limiti di condivisione: RED solo ai presenti, AMBER+STRICT solo nell'organizzazione, AMBER nell'organizzazione e ai suoi clienti secondo necessità, GREEN nella comunità ma non pubblicamente, CLEAR senza limiti. Lo decide chi produce l'informazione e chi la riceve deve rispettarlo.",
    },
    {
      q: "Ricevi un report TLP:AMBER da un ISAC che sarebbe utile a un tuo fornitore. Cosa fai?",
      a: "Non lo inoltro così com'è: AMBER copre la mia organizzazione e i suoi clienti, non i fornitori. Chiedo all'autore il permesso di condividerlo, oppure estraggo indicazioni generiche non riconducibili alla fonte, se le regole lo permettono, o chiedo una versione GREEN o CLEAR.",
    },
  ],
  sources: [
    { title: "FIRST — Traffic Light Protocol 2.0", url: "https://www.first.org/tlp/" },
    { title: "CISA — Known Exploited Vulnerabilities Catalog", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog" },
    { title: "CSIRT Italia / ACN", url: "https://www.acn.gov.it/portale/csirt-italia" },
  ],
};
