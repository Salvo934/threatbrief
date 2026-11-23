import type { Lesson } from "../types";

export const ioc: Lesson = {
  slug: "ioc-pivoting-condivisione",
  group: "Tecnica",
  title: "IOC, pivoting e standard di condivisione (STIX, TAXII, MISP)",
  summary: "Lavorare bene con gli indicatori: ciclo di vita, falsi positivi, pivoting sull'infrastruttura e formati di scambio.",
  minutes: 30,
  goals: [
    "Distinguere IOC, IOA e TTP",
    "Gestire il ciclo di vita e i falsi positivi degli indicatori",
    "Spiegare STIX 2.1, TAXII e il ruolo di MISP e OpenCTI",
  ],
  sections: [
    {
      title: "IOC, IOA, TTP",
      blocks: [
        {
          table: {
            head: ["Termine", "Cos'è", "Esempio"],
            rows: [
              ["**IOC** (Indicator of Compromise)", "Traccia osservabile che indica una possibile compromissione", "Hash di un file, IP di comando, dominio di phishing"],
              ["**IOA** (Indicator of Attack)", "Comportamento in corso che indica un attacco, indipendente dagli strumenti", "Word che lancia PowerShell codificato; dump della memoria di LSASS"],
              ["**TTP**", "Tattiche, tecniche e procedure dell'avversario", "T1003.001 — credenziali da LSASS con Mimikatz"],
            ],
          },
        },
        "Gli IOC sono **reattivi** e scadono in fretta; gli IOA e le TTP sono **proattivi** e durano di più (vedi Pyramid of Pain).",
      ],
    },
    {
      title: "Ciclo di vita e qualità",
      blocks: [
        {
          list: [
            "**Scadenza**: un IP di comando cambia in giorni, un dominio in settimane, un hash è eterno ma inutile se il malware viene ricompilato. ThreatBrief elimina gli IOC non visti da 90 giorni.",
            "**Falsi positivi**: IP di CDN o cloud condivisi, domini legittimi compromessi, hash di strumenti leciti (es. PsExec). Prima di bloccare, chiediti cosa rompi.",
            "**Contesto**: un IOC senza data, fonte, malware e confidenza è quasi inutilizzabile.",
            "**Defanging**: si scrivono `hxxp://` e `esempio[.]com` nei report per evitare clic accidentali; gli strumenti devono saperli «rifangare». L'**Analisi IOC** di ThreatBrief lo fa.",
            "**Deduplicazione**: lo stesso indicatore arriva da più fonti; serve una riga per indicatore e un'osservazione per fonte, come nel database di ThreatBrief.",
          ],
        },
      ],
    },
    {
      title: "Pivoting sull'infrastruttura",
      blocks: [
        "Da un indicatore noto si cercano elementi collegati, per allargare il quadro o confermare un'ipotesi:",
        {
          list: [
            "**DNS passivo**: quali domini hanno puntato a questo IP, e quando.",
            "**WHOIS** e registrar: email, nameserver, date di registrazione ricorrenti.",
            "**Certificati TLS**: lo stesso certificato o gli stessi attributi su più server (motori come Censys).",
            "**Scansioni Internet** (Shodan, Censys): porte, banner, configurazioni tipiche di un framework di comando.",
            "**Sandbox e repository di campioni** (VirusTotal, MalwareBazaar): altri file che contattano lo stesso dominio.",
            "**urlscan.io**: com'è fatta una pagina di phishing, che risorse carica, altri siti uguali.",
          ],
        },
        { note: "Opsec: quando interroghi direttamente un'infrastruttura malevola (visitarla, scansionarla) l'avversario può accorgersene. Preferisci dati passivi e ambienti isolati.", tone: "warn" },
      ],
    },
    {
      title: "Formati e piattaforme",
      blocks: [
        {
          list: [
            "**STIX 2.1** (OASIS): linguaggio JSON per descrivere intelligence. Oggetti come `report`, `indicator` (con un `pattern`), `intrusion-set`, `attack-pattern`, `malware`, `vulnerability`, `relationship`, `note`, `marking-definition` (TLP).",
            "**TAXII 2.1**: protocollo per scambiare STIX tra sistemi (server e collezioni).",
            "**MISP**: piattaforma open source di condivisione molto diffusa in Europa e tra i CERT; eventi, attributi, tassonomie, galassie.",
            "**OpenCTI**: piattaforma open source per gestire la conoscenza CTI in un grafo, basata su STIX.",
          ],
        },
        "L'export di ThreatBrief è un bundle STIX 2.1 validato con il validatore ufficiale OASIS: ogni report diventa `report` + `intrusion-set` o `identity` di settore + `attack-pattern` + `indicator` + `note` (fatti e valutazioni), marcati con TLP 2.0.",
      ],
    },
  ],
  practice: [
    { label: "Analisi IOC", href: "/analisi", task: "Analizza il testo di esempio: per ogni indicatore distingui il collegamento «dichiarato dalla fonte» (blu) da quello «derivato» (grigio)." },
    { label: "STIX del report Cobalt Strike", href: "/briefs/esempio-cobalt-strike-c2/stix", task: "Apri il JSON: trova un indicator, il suo pattern e la marking-definition TLP." },
    { label: "Fonti", href: "/fonti", task: "Quante osservazioni IOC ha ogni fonte? Perché l'archivio è deduplicato?" },
  ],
  exercise:
    "Prendi un indicatore collegato dall'Analisi IOC e fai tre pivot con strumenti gratuiti (urlscan.io, VirusTotal con account gratuito, un servizio di DNS passivo). Annota cosa trovi, con data e fonte, e valuta con il codice Admiralty.",
  pitfalls: [
    "Bloccare in automatico un feed senza filtrare i falsi positivi (CDN, cloud, strumenti leciti).",
    "Considerare un IOC valido per sempre.",
    "Visitare direttamente un sito malevolo dalla propria postazione.",
    "Confondere STIX (il formato) con TAXII (il trasporto).",
  ],
  interview: [
    {
      q: "Differenza tra IOC e IOA?",
      a: "Un IOC è una traccia di una compromissione già avvenuta o in corso, come un hash, un IP o un dominio, ed è legato a strumenti e infrastruttura specifici. Un IOA descrive un comportamento d'attacco, per esempio un processo Office che lancia PowerShell codificato, indipendente dallo strumento. Gli IOA reggono meglio quando l'avversario cambia infrastruttura.",
    },
    {
      q: "Ricevi 5.000 IOC da un feed: li blocchi tutti?",
      a: "No. Prima filtro la rilevanza per la mia organizzazione e la freschezza, elimino i falsi positivi noti come CDN, cloud e strumenti legittimi, verifico il contesto e la confidenza della fonte. Poi decido cosa bloccare, cosa usare solo per la ricerca nei log e cosa scartare, con una scadenza per ogni indicatore.",
    },
    {
      q: "Cos'è STIX e cos'è TAXII?",
      a: "STIX 2.1 è uno standard OASIS in JSON per rappresentare intelligence: indicatori con pattern, attori, tecniche, relazioni, marking TLP. TAXII è il protocollo per trasportare STIX tra sistemi. Nel mio progetto i report si esportano in STIX 2.1, validato con il validatore OASIS.",
    },
    {
      q: "Come faresti pivoting partendo da un dominio di phishing?",
      a: "WHOIS e date di registrazione, DNS passivo per gli IP e gli altri domini sullo stesso host, certificati TLS condivisi, urlscan per la struttura della pagina e kit simili, ricerca di campioni che contattano il dominio. Per ogni scoperta annoto fonte e data e distinguo i collegamenti forti da quelli deboli, per esempio un hosting condiviso.",
    },
  ],
  sources: [
    { title: "OASIS — STIX 2.1 e TAXII 2.1", url: "https://oasis-open.github.io/cti-documentation/" },
    { title: "MISP Project", url: "https://www.misp-project.org/" },
    { title: "OpenCTI", url: "https://github.com/OpenCTI-Platform/opencti" },
    { title: "abuse.ch (ThreatFox, URLhaus, MalwareBazaar)", url: "https://abuse.ch/" },
  ],
};
