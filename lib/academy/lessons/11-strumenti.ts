import type { Lesson } from "../types";

export const strumenti: Lesson = {
  slug: "strumenti-hunting-detection",
  group: "Tecnica",
  title: "Strumenti del mestiere, threat hunting e detection",
  summary: "Gli strumenti che un analista usa ogni giorno e come la CTI alimenta hunting e detection engineering.",
  minutes: 25,
  goals: [
    "Conoscere gli strumenti principali e a cosa servono",
    "Spiegare il threat hunting guidato da ipotesi",
    "Tradurre un report in idee di detection (Sigma, YARA)",
  ],
  sections: [
    {
      title: "La cassetta degli attrezzi",
      blocks: [
        {
          table: {
            head: ["Strumento", "A cosa serve"],
            rows: [
              ["**MITRE ATT&CK Navigator**", "Colorare la matrice: tecniche di un attore, copertura delle detection, confronti"],
              ["**VirusTotal**, **MalwareBazaar**", "Reputazione e relazioni di file, domini, IP; campioni di malware"],
              ["**urlscan.io**", "Analisi sicura di pagine web e kit di phishing"],
              ["**Shodan**, **Censys**", "Servizi esposti su Internet, certificati, infrastruttura degli attaccanti"],
              ["**CyberChef**", "Decodifica e trasformazione dei dati (base64, XOR, …)"],
              ["**MISP**, **OpenCTI**", "Gestione e condivisione dell'intelligence"],
              ["**Sigma**, **YARA**", "Regole di detection: Sigma per i log, YARA per file e memoria"],
            ],
          },
        },
        "In un colloquio non serve conoscerli tutti a fondo: serve sapere **quale usare per quale domanda** e citare un uso concreto.",
      ],
    },
    {
      title: "Threat hunting guidato da ipotesi",
      blocks: [
        "Il **threat hunting** cerca in modo proattivo attività malevole che le detection automatiche non hanno segnalato. La CTI fornisce le **ipotesi**:",
        {
          list: [
            "**Ipotesi**: «Un gruppo che colpisce il nostro settore usa T1003.001 (dump di LSASS): se ci fosse, vedremmo processi non di sistema accedere a lsass.exe».",
            "**Dati**: log EDR, Sysmon, eventi di Windows.",
            "**Ricerca** e analisi dei risultati.",
            "**Esito**: trovato (incidente), non trovato (ma la ricerca diventa una detection permanente), oppure lacune di visibilità da colmare.",
          ],
          ordered: true,
        },
        "Le **tecniche più usate dagli attori del settore**, nella dashboard di settore, sono un ottimo elenco da cui scegliere le ipotesi.",
      ],
    },
    {
      title: "Dal report alla detection",
      blocks: [
        "Un report utile al SOC si chiude con idee di detection. Esempio in **Sigma** (concettuale) per una procedura comune:",
        { note: "Regola: processo figlio `powershell.exe` con argomento `-enc` o `-EncodedCommand`, avviato da un'applicazione Office (`winword.exe`, `excel.exe`). Tecnica: T1059.001; contesto: documenti con macro (T1566.001)." },
        "**YARA** invece descrive pattern di stringhe e byte per riconoscere famiglie di malware in file o memoria. La CTI non deve per forza scrivere le regole, ma deve sapere **cosa** rilevare e con quale priorità, e parlare la lingua del detection engineer.",
      ],
    },
  ],
  practice: [
    { label: "Settori → Finanza", href: "/settori/finanza", task: "Dalle tecniche più usate scegli tre ipotesi di threat hunting e scrivi quali dati servono per verificarle." },
    { label: "STIX di un report", href: "/briefs/esempio-sandworm-energia/stix", task: "Scarica il bundle e importalo in un'istanza OpenCTI o MISP di prova (in locale)." },
  ],
  exercise:
    "Installa in locale MISP o OpenCTI (con Docker, seguendo la documentazione ufficiale) e importa il bundle STIX di un report di ThreatBrief. Annota cosa viene riconosciuto correttamente e cosa no.",
  pitfalls: [
    "Elencare strumenti senza saper dire a quale domanda rispondono.",
    "Proporre detection basate solo su IOC.",
    "Fare hunting senza ipotesi («guardiamo i log e vediamo»).",
  ],
  interview: [
    {
      q: "Come collabora la CTI con il SOC e il threat hunting?",
      a: "Fornisce contesto e priorità: quali attori e tecniche sono rilevanti per l'organizzazione, quindi le ipotesi di hunting e le detection da costruire, insieme a indicatori filtrati e con scadenza. In cambio riceve dal SOC dati sugli incidenti reali, che migliorano i requisiti e l'analisi.",
    },
    {
      q: "Cos'è il threat hunting e come lo imposti?",
      a: "È la ricerca proattiva di attività malevole non rilevate. Lo imposto per ipotesi, basate sulla CTI: una tecnica di un attore rilevante; identifico i dati necessari, cerco e analizzo. Qualunque sia l'esito produce valore: un incidente, una nuova detection o una lacuna di visibilità da colmare.",
    },
    {
      q: "Differenza tra Sigma e YARA?",
      a: "Sigma è un formato aperto per regole di detection sui log, convertibile nelle query dei vari SIEM. YARA descrive pattern di stringhe e byte per identificare file o malware, anche in memoria. Il primo guarda i comportamenti nei log, il secondo gli artefatti.",
    },
  ],
  sources: [
    { title: "MITRE ATT&CK Navigator", url: "https://mitre-attack.github.io/attack-navigator/" },
    { title: "SigmaHQ", url: "https://github.com/SigmaHQ/sigma" },
    { title: "YARA — documentazione", url: "https://yara.readthedocs.io/" },
    { title: "CyberChef", url: "https://gchq.github.io/CyberChef/" },
  ],
};
