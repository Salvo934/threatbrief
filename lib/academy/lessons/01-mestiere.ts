import type { Lesson } from "../types";

export const mestiere: Lesson = {
  slug: "il-mestiere",
  group: "Fondamenti",
  title: "Il mestiere: cos'è la Cyber Threat Intelligence",
  summary: "Dati, informazioni e intelligence; i quattro livelli; chi usa la CTI e cosa fa davvero un analista.",
  minutes: 20,
  goals: [
    "Spiegare in 30 secondi cos'è la CTI e a cosa serve",
    "Distinguere dati, informazioni e intelligence",
    "Riconoscere i livelli strategico, operativo, tattico e tecnico e i loro lettori",
  ],
  sections: [
    {
      title: "Una definizione da usare a voce",
      blocks: [
        "La **Cyber Threat Intelligence** è conoscenza sulle minacce, raccolta e analizzata per **aiutare qualcuno a prendere una decisione**: cosa difendere per primo, cosa bloccare, dove investire, come rispondere a un incidente.",
        "La parola chiave è *decisione*. Un elenco di 10.000 indirizzi IP malevoli non è intelligence: è un dato. Diventa intelligence quando qualcuno lo filtra, lo contestualizza e dice: «questi 40 indirizzi sono usati dal gruppo che sta colpendo il nostro settore; bloccarli riduce il rischio X».",
        { note: "Frase da colloquio: «La CTI non è sapere tutto sulle minacce, è sapere le cose giuste, abbastanza presto, per la persona che deve decidere»." },
      ],
    },
    {
      title: "Dati, informazioni, intelligence",
      blocks: [
        {
          table: {
            head: ["Livello", "Esempio", "Cosa manca per salire"],
            rows: [
              ["**Dato**", "`185.220.101.4` compare in un feed di IP malevoli", "Contesto: chi lo usa, quando, contro chi"],
              ["**Informazione**", "L'IP è un server di comando di Cobalt Strike segnalato ieri", "Rilevanza: riguarda noi? cosa ne facciamo?"],
              ["**Intelligence**", "Il server è collegato a una campagna contro aziende manifatturiere italiane: va bloccato e cercato nei log degli ultimi 30 giorni", "—"],
            ],
          },
        },
        "In ThreatBrief lo vedi bene nell'**Analisi IOC**: l'indicatore da solo è un dato; lo stato *collegato* con malware e gruppi è informazione; il brief con rischio e azioni è intelligence.",
      ],
    },
    {
      title: "I quattro livelli (e chi li legge)",
      blocks: [
        {
          table: {
            head: ["Livello", "Domanda tipica", "Lettore", "Prodotto", "Orizzonte"],
            rows: [
              ["**Strategico**", "Quali minacce contano per il nostro business nei prossimi 12 mesi?", "CdA, CISO, direzione", "Brief, report di scenario", "Mesi / anni"],
              ["**Operativo**", "Chi ci sta prendendo di mira, con quale campagna?", "CISO, responsabili SOC e IR", "Profili di attori e campagne", "Settimane"],
              ["**Tattico**", "Con quali tecniche (TTP) operano?", "SOC, threat hunter, detection engineer", "Mappature ATT&CK, regole di detection", "Settimane / mesi"],
              ["**Tecnico**", "Quali indicatori bloccare adesso?", "SOC, strumenti automatici", "Feed di IOC", "Ore / giorni"],
            ],
          },
        },
        "Molte fonti uniscono *tattico* e *tecnico* in un solo livello: va bene, l'importante è saper dire **chi legge cosa**. In ThreatBrief il **brief esecutivo** è strategico, la **scheda tecnica** è tattica/tecnica, le **dashboard di settore** sono operative.",
      ],
    },
    {
      title: "Cosa fa davvero un analista CTI",
      blocks: [
        {
          list: [
            "**Raccoglie i requisiti**: parla con chi userà l'intelligence (SOC, CISO, clienti) e capisce le domande.",
            "**Segue le fonti**: report di vendor, advisory (CISA, CSIRT Italia), feed, comunità di condivisione.",
            "**Analizza**: collega attori, tecniche, vulnerabilità e vittime; valuta l'affidabilità; formula giudizi con un livello di confidenza.",
            "**Scrive e comunica**: brief per i dirigenti, report tecnici, avvisi rapidi; spesso li presenta a voce.",
            "**Supporta altri team**: dà contesto durante un incidente, propone ipotesi per il threat hunting, priorità per il patching.",
            "**Misura e migliora**: chiede feedback e verifica che i prodotti siano stati usati.",
          ],
        },
        "In consulenza (come in Accenture) si aggiunge una dimensione: lo stesso lavoro va adattato a **clienti diversi**, con settori, obblighi normativi e livelli di maturità diversi. Saper dire «per te, cliente del settore sanitario, questo significa…» è metà del lavoro.",
      ],
    },
  ],
  practice: [
    { label: "Dashboard", href: "/", task: "Individua un elemento per ognuno dei quattro livelli (strategico, operativo, tattico, tecnico)." },
    { label: "Analisi IOC", href: "/analisi", task: "Carica il testo di esempio e osserva il passaggio da dato (indicatore) a informazione (collegato a un software o attore)." },
  ],
  exercise:
    "Scrivi in 5 righe come spiegheresti la CTI a un amministratore delegato che non è del settore. Poi riscrivila per un analista SOC. Confronta: cosa cambia nel lessico e in cosa ti concentri?",
  pitfalls: [
    "Confondere un feed di IOC con «intelligence»: senza contesto e rilevanza è solo un dato.",
    "Rispondere «la CTI serve a sapere chi ci attacca»: l'attribuzione è utile, ma raramente è la cosa che serve di più a chi deve decidere.",
    "Dimenticare il lettore: lo stesso fatto va scritto in modo diverso per il CdA e per il SOC.",
  ],
  interview: [
    {
      q: "Che cos'è la threat intelligence, in parole tue?",
      a: "È conoscenza sulle minacce che è stata raccolta, analizzata e messa nel contesto di un'organizzazione per supportare una decisione: cosa difendere, cosa bloccare, dove investire. La differenza con i semplici dati è proprio la rilevanza e l'azionabilità per un lettore specifico.",
    },
    {
      q: "Qual è la differenza tra intelligence strategica e tattica?",
      a: "Cambiano lettore e orizzonte. La strategica risponde a domande di business per la direzione, su mesi o anni: quali minacce contano, che impatto possono avere. La tattica descrive come operano gli avversari, cioè le TTP, per chi deve rilevarli e difendersi: SOC, hunter, detection engineer.",
    },
    {
      q: "Un IOC è intelligence?",
      a: "Da solo no, è un dato. Diventa intelligence quando so chi lo usa, in quale campagna, se riguarda la mia organizzazione e cosa devo farne. Per questo un buon feed di IOC porta con sé contesto e data di validità.",
    },
    {
      q: "Chi sono i clienti interni di un team CTI?",
      a: "La direzione e il CISO per la parte strategica, il SOC e l'incident response per la parte operativa e tattica, il vulnerability management per le priorità di patching, a volte il risk management, l'ufficio legale o la compliance, per esempio per la NIS2. Ognuno ha domande e formati diversi.",
    },
  ],
  sources: [
    { title: "MITRE ATT&CK — CTI Training (gratuito)", url: "https://attack.mitre.org/resources/learn-more-about-attack/training/cti/" },
    { title: "ENISA Threat Landscape (rapporti annuali)", url: "https://www.enisa.europa.eu/topics/cyber-threats/threat-landscape" },
  ],
};
