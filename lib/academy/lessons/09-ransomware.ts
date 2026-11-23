import type { Lesson } from "../types";

export const ransomware: Lesson = {
  slug: "ecosistema-ransomware",
  group: "Contesto",
  title: "L'ecosistema ransomware",
  summary: "RaaS, affiliati, broker di accessi, doppia estorsione e leak site: come funziona il crimine che colpisce di più le aziende italiane.",
  minutes: 25,
  goals: [
    "Spiegare il modello ransomware-as-a-service e i suoi ruoli",
    "Descrivere la catena tipica di un attacco ransomware",
    "Interpretare con prudenza i dati dei leak site",
  ],
  sections: [
    {
      title: "Un'industria con ruoli specializzati",
      blocks: [
        {
          table: {
            head: ["Ruolo", "Cosa fa"],
            rows: [
              ["**Operatori RaaS**", "Sviluppano il ransomware, gestiscono il leak site e la negoziazione; trattengono una percentuale del riscatto"],
              ["**Affiliati**", "Eseguono le intrusioni usando il «kit» degli operatori"],
              ["**Initial Access Broker (IAB)**", "Vendono accessi già ottenuti (credenziali VPN, RDP, web shell)"],
              ["**Servizi di supporto**", "Infostealer, bulletproof hosting, riciclaggio di criptovalute"],
            ],
          },
        },
        "Conseguenza per l'analista: lo stesso affiliato può lavorare per più marchi, e un marchio può sparire e rinascere con un altro nome (*rebranding*). Le TTP seguono spesso l'affiliato più che il marchio.",
      ],
    },
    {
      title: "La catena tipica",
      blocks: [
        {
          list: [
            "**Accesso iniziale**: credenziali valide (T1078) da infostealer o IAB, servizi remoti esposti (T1133), vulnerabilità di dispositivi perimetrali (T1190), phishing (T1566).",
            "**Ricognizione e movimento laterale** con strumenti legittimi (living off the land), spesso con Cobalt Strike o tool simili.",
            "**Furto di credenziali** e presa del dominio (es. dump di LSASS, T1003.001).",
            "**Esfiltrazione** dei dati prima della cifratura (T1567).",
            "**Inibizione del ripristino**: cancellazione di copie shadow e backup (T1490), arresto dei servizi (T1489).",
            "**Cifratura** (T1486) e **estorsione**: riscatto, minaccia di pubblicazione, a volte DDoS o contatto diretto con clienti e partner.",
          ],
          ordered: true,
        },
        "Le difese con più resa sono quasi sempre le stesse: MFA sugli accessi remoti, patch delle vulnerabilità nel catalogo KEV con uso ransomware noto, backup offline testati, segmentazione, monitoraggio degli account privilegiati. È ciò che emerge anche dalle **mitigazioni prioritarie** delle dashboard di settore.",
      ],
    },
    {
      title: "Leggere i dati dei leak site con prudenza",
      blocks: [
        {
          list: [
            "Sono **rivendicazioni**, non attacchi verificati: possono essere gonfiate, false o riferite a un fornitore della vittima.",
            "Le vittime che **pagano** spesso non compaiono: i numeri sottostimano il fenomeno.",
            "La **data di pubblicazione** non è la data dell'attacco.",
            "Il **settore** è assegnato dall'aggregatore e può essere impreciso (in ThreatBrief, ad esempio, le telecomunicazioni non hanno una categoria e sono indicate come «n.d.»).",
            "Mai ripubblicare dati rubati, né linkare i leak site.",
          ],
        },
        { note: "Formula sicura in un report: «Secondo le rivendicazioni pubblicate dai gruppi e raccolte da ransomware.live (non verificate)…», con codice Admiralty adeguato (tipicamente C3)." },
      ],
    },
  ],
  practice: [
    { label: "Dashboard", href: "/", task: "Guarda il grafico delle rivendicazioni e i gruppi più attivi: quale trend vedi negli ultimi 12 mesi?" },
    { label: "Settori → Sanità", href: "/settori/sanita", task: "Confronta i gruppi più attivi e le ultime rivendicazioni: cosa puoi affermare come fatto, e cosa solo come valutazione?" },
    { label: "Attori → Wizard Spider", href: "/attori/G0102", task: "Ricostruisci la catena di un attacco ransomware con le tecniche ATT&CK del gruppo." },
  ],
  exercise:
    "Scrivi un brief esecutivo sul ransomware in un settore a tua scelta usando la dashboard di settore, con almeno due fatti (fonte ransomware.live, C3) e una valutazione con confidenza, più tre azioni. Attenzione alla formulazione delle rivendicazioni.",
  pitfalls: [
    "Presentare le rivendicazioni come attacchi certi.",
    "Attribuire le TTP al marchio ignorando gli affiliati.",
    "Ripubblicare nomi o dati delle vittime oltre a quanto già pubblico e necessario.",
  ],
  interview: [
    {
      q: "Come funziona il modello ransomware-as-a-service?",
      a: "Gli operatori sviluppano il ransomware e l'infrastruttura, cioè leak site e negoziazione, e lo affittano ad affiliati che fanno le intrusioni in cambio di una percentuale del riscatto. Intorno ci sono initial access broker che vendono accessi, infostealer e servizi di riciclaggio. Per l'analista significa che le TTP seguono spesso l'affiliato più del marchio.",
    },
    {
      q: "Cos'è la doppia estorsione?",
      a: "L'attaccante, prima di cifrare, esfiltra i dati e minaccia di pubblicarli sul leak site se non viene pagato il riscatto. Così fa pressione anche su chi ha backup funzionanti. A volte si aggiungono DDoS o il contatto diretto con clienti e partner della vittima.",
    },
    {
      q: "Quanto ti fidi dei dati dei leak site?",
      a: "Li tratto come rivendicazioni non verificate: utili per i trend e la vittimologia, ma possono essere false, gonfiate o riferite a un fornitore, e sottostimano il fenomeno perché chi paga spesso non compare. Nei report li cito con cautela esplicita e un codice Admiralty adeguato, tipicamente C3.",
    },
    {
      q: "Quali sono le tre difese con più resa contro il ransomware?",
      a: "MFA su tutti gli accessi remoti e privilegiati; patch prioritarie delle vulnerabilità sfruttate attivamente, in particolare quelle del catalogo KEV con uso ransomware noto, sui sistemi esposti; backup offline e testati con un piano di ripristino. Poi segmentazione e monitoraggio degli account privilegiati.",
    },
  ],
  sources: [
    { title: "CISA — #StopRansomware Guide", url: "https://www.cisa.gov/stopransomware/ransomware-guide" },
    { title: "ransomware.live", url: "https://www.ransomware.live/" },
    { title: "CISA KEV (colonna knownRansomwareCampaignUse)", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog" },
  ],
};
