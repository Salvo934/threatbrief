import type { Lesson } from "../types";

export const colloquio: Lesson = {
  slug: "preparazione-colloquio",
  group: "Colloquio",
  title: "Preparazione al colloquio",
  summary: "Come si svolge, come affrontare un caso pratico, come presentare ThreatBrief e cosa chiedere.",
  minutes: 40,
  goals: [
    "Affrontare un caso pratico con una struttura chiara",
    "Presentare il proprio progetto in 2 minuti",
    "Rispondere a domande comportamentali con il metodo STAR",
  ],
  sections: [
    {
      title: "Come si svolge, di solito",
      blocks: [
        {
          list: [
            "**Screening** con HR: motivazioni, disponibilità, lingua (l'inglese è quasi sempre richiesto: preparati a rispondere anche in inglese).",
            "**Colloquio tecnico**: concetti (le lezioni di questa Accademia), a volte un **caso pratico** o un esercizio scritto (es. «leggi questo report e scrivi un brief»).",
            "**Colloquio con il manager**: come ragioni, come comunichi, come lavori con clienti e colleghi.",
          ],
        },
        "In consulenza contano molto la **comunicazione con il cliente** e la capacità di adattare lo stesso contenuto a interlocutori diversi. Prima del colloquio leggi uno o due report pubblici recenti del team di threat intelligence dell'azienda e prepara un commento: è un'ottima domanda da fare e mostra interesse reale.",
      ],
    },
    {
      title: "Il caso pratico: una struttura che funziona",
      blocks: [
        "Esempio tipico: **«Un cliente del settore manifatturiero legge che un concorrente è stato colpito da un ransomware. Ti chiama: cosa fai nelle prime 24 ore?»**",
        {
          list: [
            "**Chiarisci la domanda** (requisito): cosa vuole sapere il cliente? Se è a rischio, cosa fare subito, cosa dire al CdA?",
            "**Raccogli**: rivendicazione (leak site tramite aggregatori), advisory, report sul gruppo; vulnerabilità sfruttate dal gruppo (KEV); TTP note (ATT&CK).",
            "**Valuta la rilevanza**: il cliente ha la stessa esposizione (VPN, fornitori in comune, stessa filiera)?",
            "**Azioni immediate**: verifica delle vulnerabilità sfruttate, ricerca degli indicatori nei log, MFA sugli accessi remoti, controllo dei backup.",
            "**Comunica**: un brief di una pagina per la direzione (rischio, fatti, valutazioni con confidenza, 3 azioni) e una nota tecnica per il SOC.",
            "**Segui**: aggiornamenti, feedback, e se il cliente è un soggetto NIS2 ricorda i tempi di notifica in caso di incidente.",
          ],
          ordered: true,
        },
        { note: "Ragiona ad alta voce: chi ti ascolta valuta il metodo più della risposta «giusta». Dichiara le assunzioni e cosa non sai." },
      ],
    },
    {
      title: "Presentare ThreatBrief in 2 minuti",
      blocks: [
        {
          list: [
            "**Problema**: le aziende italiane ricevono tanti dati sulle minacce ma poca intelligence utilizzabile per il loro settore e per la NIS2.",
            "**Cosa fa**: raccoglie automaticamente sette fonti aperte, collega attori, tecniche, vulnerabilità e rivendicazioni ai settori italiani e alle misure dell'art. 24, e produce report con TLP 2.0, Admiralty, fatti separati dalle valutazioni, PDF e STIX 2.1.",
            "**Scelte da analista**: niente dati inventati spacciati per reali, derivazioni automatiche dichiarate, rivendicazioni marcate come non verificate, mappatura NIS2 dichiarata come valutazione.",
            "**Scelte tecniche** (se chiedono): Next.js su Cloudflare, Supabase con RLS su ogni tabella, ingestion su GitHub Actions, chiavi segrete mai nel Worker, cache per restare nel piano gratuito.",
            "**Cosa ho imparato e cosa migliorerei**: preparati due punti onesti (es. qualità delle regole di estrazione, una fonte in più, detection Sigma nella scheda tecnica).",
          ],
          ordered: true,
        },
        "Mostra dal vivo: Dashboard → Settori (Sanità) → un attore e la Matrice → Analisi IOC con il testo di esempio → un report e il suo PDF.",
      ],
    },
    {
      title: "Domande comportamentali: il metodo STAR",
      blocks: [
        "**S**ituazione, **T**ask (compito), **A**zione, **R**isultato. Prepara 4–5 storie (università, tirocini, ThreatBrief) da adattare a domande come: un problema difficile, un errore, un conflitto, una scadenza stretta, una cosa imparata da solo.",
        { note: "Esempio da ThreatBrief: «S: prima del deploy, T: verificare la sicurezza, A: ho scoperto che il build includeva la chiave segreta del database, ho separato le chiavi e aggiunto un controllo automatico, R: nessun segreto in produzione e un controllo che blocca il deploy». Storie vere e specifiche convincono più di qualsiasi aggettivo." },
      ],
    },
    {
      title: "Domande da fare a loro",
      blocks: [
        {
          list: [
            "Chi sono i lettori principali dei vostri prodotti e come raccogliete il loro feedback?",
            "Come sono organizzati i requisiti di intelligence per i clienti?",
            "Quali fonti e piattaforme usate (es. MISP, OpenCTI, soluzioni commerciali)?",
            "Com'è una settimana tipica di un analista junior? Come viene formato?",
            "Su quali settori o minacce vi aspettate più lavoro nel prossimo anno?",
          ],
        },
      ],
    },
  ],
  practice: [
    { label: "Allenamento", href: "/accademia/allenamento", task: "Ripassa tutte le domande con le schede finché non le sai spiegare a voce in meno di un minuto." },
    { label: "Dashboard", href: "/", task: "Prova la demo di 5 minuti ad alta voce, cronometrandoti." },
  ],
  exercise:
    "Registrati (anche solo audio) mentre rispondi al caso pratico delle 24 ore e mentre presenti ThreatBrief in 2 minuti. Riascolta e taglia: pause, gergo, parti non necessarie. Ripeti in inglese.",
  pitfalls: [
    "Rispondere subito al caso pratico senza chiarire la domanda.",
    "Raccontare il progetto partendo dalla tecnologia invece che dal problema.",
    "Inventare una risposta: meglio «non lo so, ma ragionerei così…».",
    "Non preparare domande da fare.",
  ],
  interview: [
    {
      q: "Perché vuoi fare l'analista di threat intelligence?",
      a: "Rispondi con una storia personale vera: cosa ti ha avvicinato (studi, un caso che ti ha colpito), cosa ti piace del lavoro, cioè l'analisi, la scrittura e l'impatto sulle decisioni, e cosa hai già fatto per prepararti, con ThreatBrief come prova concreta.",
    },
    {
      q: "Un cliente ti chiede: «Siamo a rischio per l'attacco di cui parlano i giornali?» Come rispondi?",
      a: "Prima capisco cosa vuole sapere e cosa espone il cliente. Poi raccolgo ciò che è noto: attore, vettore d'ingresso, vulnerabilità sfruttate, TTP. Lo confronto con la superficie del cliente e rispondo con una valutazione dichiarando probabilità e confidenza, più le azioni immediate: verifiche sulle vulnerabilità, ricerca degli indicatori, controlli sugli accessi remoti. Infine fisso un momento di aggiornamento.",
    },
    {
      q: "Raccontami un errore che hai fatto e cosa hai imparato.",
      a: "Usa una storia STAR vera. Per esempio, dal progetto: le regole automatiche di estrazione dei settori davano falsi positivi, come «financially motivated» classificato come settore finanza. Le ho verificate a campione, corrette e coperte con test, e da allora dichiaro sempre come «derivato» ciò che non è verificato da una fonte.",
    },
    {
      q: "Come ti tieni aggiornato?",
      a: "Seguo fonti primarie, come gli advisory di CISA e CSIRT Italia, gli aggiornamenti di MITRE ATT&CK e i report dei vendor; leggo rapporti annuali come ENISA Threat Landscape e Clusit; e soprattutto metto in pratica: ThreatBrief aggiorna le fonti ogni 6 ore e scrivo report su ciò che emerge.",
    },
  ],
  sources: [
    { title: "ENISA Threat Landscape", url: "https://www.enisa.europa.eu/topics/cyber-threats/threat-landscape" },
    { title: "Clusit — Rapporto sulla sicurezza ICT in Italia", url: "https://clusit.it/rapporto-clusit/" },
    { title: "SANS FOR578 — Cyber Threat Intelligence (riferimento per la certificazione GCTI)", url: "https://www.sans.org/cyber-security-courses/cyber-threat-intelligence/" },
  ],
};
