import type { Lesson } from "../types";

export const framework: Lesson = {
  slug: "framework-attack-killchain-diamond",
  group: "Tecnica",
  title: "I framework: MITRE ATT&CK, Kill Chain, Diamond Model, Pyramid of Pain",
  summary: "Il linguaggio comune dell'analista: come descrivere un attacco e perché le TTP valgono più degli IOC.",
  minutes: 35,
  goals: [
    "Spiegare la struttura di ATT&CK (tattiche, tecniche, sotto-tecniche, procedure)",
    "Usare Kill Chain e Diamond Model per organizzare un'analisi",
    "Spiegare la Pyramid of Pain e le sue conseguenze pratiche",
  ],
  sections: [
    {
      title: "MITRE ATT&CK",
      blocks: [
        "**ATT&CK** è una base di conoscenza, gratuita e mantenuta da MITRE, dei comportamenti osservati negli attacchi reali. La matrice Enterprise (quella usata da ThreatBrief) organizza:",
        {
          list: [
            "**Tattiche**: il *perché*, cioè l'obiettivo dell'avversario in quella fase (es. *Initial Access*, `TA0001`).",
            "**Tecniche** e **sotto-tecniche**: il *come* (es. *Phishing* `T1566` → *Spearphishing Attachment* `T1566.001`).",
            "**Procedure**: il modo specifico in cui *un* attore ha usato una tecnica (es. «APT28 ha inviato documenti con macro…»).",
            "**Gruppi** (`G0007` = APT28), **Software** (`S0154` = Cobalt Strike), **Mitigazioni** (`M1032` = MFA), **Campagne** e, dalla v18, le **strategie di detection** come oggetti separati.",
          ],
        },
        "Nella versione 20.1 usata da ThreatBrief le tattiche sono 15: Reconnaissance, Resource Development, Initial Access, Execution, Persistence, Privilege Escalation, **Stealth**, **Defense Impairment**, Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration, Impact.",
        { note: "Dettaglio da colloquio: la storica tattica *Defense Evasion* (TA0005) nelle versioni recenti si chiama **Stealth**, ed è stata affiancata da **Defense Impairment** (TA0112). Molti documenti e corsi usano ancora il nome vecchio: citare la differenza mostra che segui il framework." },
        "Usi pratici: mappare un report («l'attore usa T1059.001»), confrontare attori (la **Matrice** di ThreatBrief), misurare la copertura delle detection, dare priorità alle mitigazioni (le **mitigazioni prioritarie** nelle schede).",
      ],
    },
    {
      title: "Cyber Kill Chain (Lockheed Martin, 2011)",
      blocks: [
        "Descrive un'intrusione come una catena di sette fasi: **Reconnaissance, Weaponization, Delivery, Exploitation, Installation, Command and Control, Actions on Objectives**.",
        "L'idea chiave: interrompere **qualsiasi** anello ferma l'attacco, e prima lo interrompi meno costa. Limiti: è lineare e pensata per intrusioni «classiche» con malware; descrive male movimenti laterali, abusi di credenziali, attacchi cloud. ATT&CK è più granulare; la Kill Chain resta utile per raccontare un attacco a un pubblico non tecnico.",
      ],
    },
    {
      title: "Diamond Model (2013)",
      blocks: [
        "Ogni evento malevolo ha quattro vertici collegati: **Adversary** (chi), **Capability** (con cosa: malware, exploit), **Infrastructure** (attraverso cosa: domini, IP, server) e **Victim** (contro chi).",
        "È lo strumento principe del **pivoting**: da un vertice noto ti muovi verso gli altri. Hai un dominio di comando (infrastruttura)? Cerchi altri campioni di malware che lo contattano (capacità), altre vittime che lo hanno risolto, e infine l'attore. Ci sono anche meta-caratteristiche (tempo, fase, risultato, direzione, metodologia, risorse) e un asse socio-politico (perché quella vittima?) e tecnologico (come la capacità usa l'infrastruttura).",
      ],
    },
    {
      title: "Pyramid of Pain (David Bianco, 2013)",
      blocks: [
        "Ordina gli indicatori per **quanto costa all'avversario cambiarli** quando li blocchi:",
        {
          table: {
            head: ["Livello (dal basso)", "Costo per l'avversario"],
            rows: [
              ["Hash dei file", "Banale: ricompila e cambia"],
              ["Indirizzi IP", "Facile"],
              ["Nomi di dominio", "Semplice"],
              ["Artefatti di rete e di host", "Fastidioso"],
              ["Strumenti (tool)", "Impegnativo"],
              ["**TTP**", "**Difficile**: deve cambiare il modo di operare"],
            ],
          },
        },
        "Conseguenza pratica: bloccare IOC è utile ma effimero; le **detection basate sui comportamenti** (TTP) durano di più. È il motivo per cui un buon team CTI non si ferma ai feed, ma traduce i report in tecniche ATT&CK e in priorità di detection e mitigazione, che è esattamente il passaggio da scheda tecnica a «mitigazioni prioritarie» in ThreatBrief.",
      ],
    },
  ],
  practice: [
    { label: "Attori → Sandworm Team", href: "/attori/G0034", task: "Leggi tre procedure e identifica tattica, tecnica e sotto-tecnica di ognuna." },
    { label: "Matrice: APT28 vs Sandworm", href: "/matrice?a=G0007&b=G0034", task: "Quali tecniche in comune sono «di base» (le usano quasi tutti) e quali distintive?" },
    { label: "Mitigazioni e NIS2", href: "/mitigazioni", task: "Apri M1032 (MFA) e guarda quante tecniche copre: perché è così in alto nelle priorità?" },
  ],
  exercise:
    "Prendi il report di esempio su Cobalt Strike e descrivilo con il Diamond Model: cosa sai di ogni vertice, cosa non sai, quale pivot faresti per primo. Poi colloca gli indicatori allegati sulla Pyramid of Pain.",
  pitfalls: [
    "Usare ATT&CK come checklist da «completare»: non tutte le tecniche hanno lo stesso peso.",
    "Pensare che coprire una tecnica con una detection significhi coprire tutte le sue procedure.",
    "Presentare la Kill Chain come superata: è complementare, non sostituita.",
  ],
  interview: [
    {
      q: "Cos'è MITRE ATT&CK e come lo useresti?",
      a: "È una base di conoscenza dei comportamenti degli attaccanti osservati nel mondo reale, organizzata in tattiche (obiettivi), tecniche e sotto-tecniche (modi), procedure (come un attore specifico le usa), con gruppi, software e mitigazioni. Lo uso per mappare i report, confrontare attori, misurare la copertura delle detection e dare priorità alle difese.",
    },
    {
      q: "Spiega la Pyramid of Pain.",
      a: "Ordina gli indicatori per quanto costa all'attaccante cambiarli quando vengono bloccati: hash, IP, domini, artefatti, strumenti e in cima le TTP. Bloccare un hash è facile da aggirare, rilevare un comportamento no. Per questo conviene investire in detection basate sulle TTP e non solo sui feed di IOC.",
    },
    {
      q: "Differenza tra Cyber Kill Chain e ATT&CK?",
      a: "La Kill Chain descrive l'intrusione in sette fasi lineari ed è ottima per ragionare su dove interrompere l'attacco e per comunicare. ATT&CK è molto più granulare, non lineare, documenta tecniche e procedure reali e copre anche il post-compromissione, cioè movimenti laterali e credenziali. Li uso insieme.",
    },
    {
      q: "Come usi il Diamond Model in un'indagine?",
      a: "Per strutturare l'evento nei quattro vertici, avversario, capacità, infrastruttura e vittima, e soprattutto per fare pivoting: da un elemento noto, per esempio un dominio di comando, cerco gli altri, cioè altri campioni, altre vittime e altra infrastruttura condivisa, fino a ipotesi sull'attore.",
    },
  ],
  sources: [
    { title: "MITRE ATT&CK", url: "https://attack.mitre.org/" },
    { title: "Lockheed Martin — Cyber Kill Chain", url: "https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html" },
    { title: "The Diamond Model of Intrusion Analysis (Caltagirone, Pendergast, Betz)", url: "https://www.activeresponse.org/the-diamond-model/" },
    { title: "The Pyramid of Pain (David J. Bianco)", url: "https://detect-respond.blogspot.com/2013/03/the-pyramid-of-pain.html" },
  ],
};
