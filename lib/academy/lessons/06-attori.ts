import type { Lesson } from "../types";

export const attori: Lesson = {
  slug: "attori-attribuzione",
  group: "Tecnica",
  title: "Attori della minaccia e attribuzione",
  summary: "Tipi di avversari e motivazioni, il caos dei nomi, cosa significa davvero attribuire e perché è difficile.",
  minutes: 30,
  goals: [
    "Classificare gli attori per motivazione e capacità",
    "Orientarsi tra le convenzioni di naming dei vendor",
    "Spiegare livelli, limiti e rischi dell'attribuzione",
  ],
  sections: [
    {
      title: "Tipi di attori",
      blocks: [
        {
          table: {
            head: ["Tipo", "Motivazione", "Esempi noti (ATT&CK)"],
            rows: [
              ["**Statali / sponsorizzati**", "Spionaggio, sabotaggio, influenza", "APT28, APT29, Sandworm Team, Lazarus Group, APT41"],
              ["**Criminali**", "Profitto: ransomware, frodi, furto di dati", "FIN7, Wizard Spider, Scattered Spider, gruppi ransomware-as-a-service"],
              ["**Hacktivisti**", "Ideologia, visibilità (spesso DDoS e defacement)", "Gruppi pro-russi che colpiscono siti istituzionali europei"],
              ["**Insider**", "Rancore, profitto, errore", "—"],
            ],
          },
        },
        "I confini sono sfumati: alcuni gruppi statali fanno anche crimine (Lazarus e il furto di criptovalute), alcuni criminali lavorano con o per uno stato. Nel **profilo** degli attori ThreatBrief mostra motivazione, settori e paesi colpiti: i badge gialli sono *derivati* dal testo, da verificare.",
      ],
    },
    {
      title: "Il problema dei nomi",
      blocks: [
        "Ogni vendor dà nomi propri ai gruppi che traccia, in base a ciò che osserva. Lo stesso attore ha molti nomi, e i nomi non sempre coincidono perfettamente:",
        {
          table: {
            head: ["ATT&CK", "Altri nomi noti", "Attribuzione pubblica"],
            rows: [
              ["**APT28** (G0007)", "Fancy Bear (CrowdStrike), Forest Blizzard (Microsoft), Sofacy, Sednit", "GRU russo, unità 26165"],
              ["**Sandworm Team** (G0034)", "Voodoo Bear, Seashell Blizzard, IRIDIUM", "GRU russo, unità 74455"],
              ["**APT29** (G0016)", "Cozy Bear, Midnight Blizzard, NOBELIUM", "SVR russo"],
            ],
          },
        },
        "Le convenzioni: CrowdStrike usa animali per paese (Bear = Russia, Panda = Cina, Kitten = Iran, Chollima = Corea del Nord), Microsoft usa fenomeni meteorologici per paese (Blizzard = Russia, Typhoon = Cina, Sandstorm = Iran, Sleet = Corea del Nord). ATT&CK raccoglie gli alias: usali nella ricerca degli **Attori**.",
        { note: "Due nomi possono descrivere gruppi che si sovrappongono solo in parte: quando citi un alias, cita anche chi lo usa." },
      ],
    },
    {
      title: "Cosa significa attribuire",
      blocks: [
        "L'attribuzione ha livelli diversi, con difficoltà e utilità diverse:",
        {
          list: [
            "**Al cluster di attività**: questi incidenti sono opera dello stesso operatore (infrastruttura, strumenti, TTP, orari ricorrenti).",
            "**A un gruppo noto**: il cluster coincide con un gruppo già tracciato.",
            "**A uno stato o organizzazione**: richiede spesso fonti che un'azienda privata non ha (intelligence governativa, indagini giudiziarie).",
          ],
          ordered: true,
        },
        "Le prove si pesano insieme, mai da sole: infrastruttura, malware e codice condivisi, TTP, vittimologia, orari e lingua, errori operativi. Ognuna si può falsificare.",
        { note: "Caso da conoscere: **Olympic Destroyer** (Olimpiadi di PyeongChang, 2018) conteneva false tracce che puntavano ad altri gruppi; l'attribuzione pubblica, anche giudiziaria (2020), è andata al GRU (Sandworm). È l'esempio classico di **false flag**.", tone: "warn" },
        "Domanda da porsi sempre: **all'utente serve davvero l'attribuzione?** Per difendersi spesso bastano le TTP; per decisioni strategiche, diplomatiche o legali serve di più.",
      ],
    },
  ],
  practice: [
    { label: "Attori: cerca «Fancy Bear»", href: "/attori?q=Fancy", task: "La ricerca trova APT28 tramite gli alias: controlla quali altri nomi ha." },
    { label: "Matrice: APT28 vs APT29", href: "/matrice?a=G0007&b=G0016", task: "Due gruppi russi, servizi diversi: quanto si sovrappongono? Cosa ti dice e cosa non ti dice?" },
    { label: "Attori → Lazarus Group", href: "/attori/G0032", task: "Leggi la descrizione: quali motivazioni convivono nello stesso gruppo?" },
  ],
  exercise:
    "Scegli due attori con alta sovrapposizione nella Matrice. Scrivi un paragrafo che spieghi perché la sovrapposizione di tecniche NON basta a dire che sono lo stesso gruppo, e quali prove aggiuntive cercheresti.",
  pitfalls: [
    "Attribuire sulla base di un solo indicatore, per esempio un IP già usato da un gruppo o un malware disponibile pubblicamente.",
    "Considerare gli alias perfettamente equivalenti tra vendor.",
    "Promettere attribuzioni che il cliente non può verificare né usare.",
    "Confondere «stesso strumento» (Cobalt Strike, Mimikatz) con «stesso attore».",
  ],
  interview: [
    {
      q: "Come attribuiresti un attacco?",
      a: "Per livelli: prima raggruppo l'attività in un cluster coerente, con infrastruttura, strumenti, TTP e vittimologia, poi valuto la sovrapposizione con gruppi noti, e solo con prove forti e multiple arrivo a un'organizzazione. Peso ogni prova sapendo che può essere falsificata, considero ipotesi alternative e dichiaro la confidenza. E mi chiedo se al cliente serve davvero.",
    },
    {
      q: "Perché lo stesso gruppo ha tanti nomi?",
      a: "Ogni vendor traccia gruppi in base alla propria visibilità e usa una propria convenzione: CrowdStrike animali per paese, Microsoft fenomeni meteorologici. I cluster non coincidono sempre esattamente, quindi quando cito un alias dico anche chi lo usa. ATT&CK raccoglie i principali alias.",
    },
    {
      q: "Cos'è una false flag? Fai un esempio.",
      a: "È l'inserimento deliberato di tracce che puntano a un altro attore. L'esempio classico è Olympic Destroyer nel 2018, contro le Olimpiadi invernali: conteneva elementi che rimandavano ad altri gruppi, ma l'attribuzione pubblica, anche in sede giudiziaria nel 2020, è andata al GRU russo. Insegna a non attribuire su un singolo indizio.",
    },
  ],
  sources: [
    { title: "MITRE ATT&CK — Groups", url: "https://attack.mitre.org/groups/" },
    { title: "Microsoft — How Microsoft names threat actors", url: "https://learn.microsoft.com/en-us/unified-secops/microsoft-threat-actor-naming" },
    { title: "US DOJ — Indictment of GRU officers (ottobre 2020)", url: "https://www.justice.gov/opa/pr/six-russian-gru-officers-charged-connection-worldwide-deployment-destructive-malware-and" },
  ],
};
