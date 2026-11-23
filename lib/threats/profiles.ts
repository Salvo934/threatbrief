import type { Block } from "@/lib/academy/types";

/**
 * Schede in italiano dei gruppi ransomware più attivi contro organizzazioni italiane.
 * Ogni affermazione viene da una fonte primaria citata (MITRE ATT&CK, avvisi CISA/FBI):
 * sono sintesi e traduzioni del progetto, non valutazioni originali. I numeri sull'Italia
 * NON sono scritti qui: la pagina li calcola dai dati raccolti (ransomware.live).
 */
export type ThreatProfile = {
  slug: string;
  name: string;
  aliases: string[];
  /** Nomi usati da ransomware.live per i leak site del gruppo. */
  leakNames: string[];
  /** Oggetti ATT&CK collegati (external_id). */
  attack: { groups: string[]; software: string[]; relatedGroup?: { id: string; label: string } };
  inShort: string;
  howItWorks: Block[];
  /** Contromisure specifiche, dalle raccomandazioni delle fonti e dalle tecniche documentate. */
  countermeasures: string[];
  caveat?: string;
  sources: { title: string; url: string }[];
};

export const PROFILES: ThreatProfile[] = [
  {
    slug: "qilin",
    name: "Qilin",
    aliases: ["Agenda"],
    leakNames: ["qilin"],
    attack: { groups: [], software: ["S1242"] },
    inShort:
      "Famiglia ransomware offerta «as-a-service» (RaaS) ad affiliati, attiva almeno dal 2022, con varianti per Windows, Linux e VMware ESXi.",
    howItWorks: [
      "**Chi è**: un servizio ransomware a cui si affiliano criminali diversi, che conducono le intrusioni e dividono i proventi con gli operatori. Per questo le tecniche di accesso possono variare da un attacco all'altro.",
      "**Cosa usa**: varianti scritte in **Go** e **Rust**, capaci di colpire **Windows, Linux e VMware ESXi** (i server di virtualizzazione: colpirli ferma molte macchine in un colpo solo). MITRE segnala sovrapposizioni di funzionalità con Black Basta, REvil e BlackCat.",
      "**Chi colpisce**: secondo MITRE gli affiliati hanno colpito organizzazioni in tutto il mondo, soprattutto negli Stati Uniti, in Francia, Canada e Regno Unito, nei settori **manifatturiero, tecnologico, servizi finanziari e sanità**.",
      { note: "ATT&CK documenta Qilin come **software** (il ransomware), non come gruppo: le tecniche elencate sotto descrivono soprattutto il comportamento del programma (cifratura, arresto dei servizi, cancellazione delle copie), meno le fasi di intrusione degli affiliati." },
    ],
    countermeasures: [
      "Proteggere e monitorare gli hypervisor **VMware ESXi**: accesso di gestione solo da rete dedicata, MFA, aggiornamenti tempestivi.",
      "Backup **offline o immutabili**, separati dal dominio, con prove di ripristino periodiche anche delle macchine virtuali.",
      "MFA su tutti gli accessi remoti e sugli account amministrativi: gli affiliati sfruttano spesso credenziali valide.",
      "Rilevare l'arresto massivo di servizi e la cancellazione delle copie shadow, tipici della fase finale.",
    ],
    sources: [
      { title: "MITRE ATT&CK — Qilin (S1242)", url: "https://attack.mitre.org/software/S1242/" },
    ],
  },
  {
    slug: "the-gentlemen",
    name: "The Gentlemen",
    aliases: ["Storm-2697", "GOLD SHERWOOD"],
    leakNames: ["thegentlemen"],
    attack: { groups: ["G1058"], software: ["S9051"] },
    inShort:
      "Gruppo comparso a metà 2025 che gestisce un ransomware-as-a-service, aperto agli affiliati da settembre 2025.",
    howItWorks: [
      "**Chi è**: osservato per la prima volta a **metà 2025**, inizialmente con un ransomware «chiuso» (usato solo dal gruppo) e poi, da **settembre 2025**, aperto agli affiliati come RaaS. MITRE lo collega ai cluster **Storm-2697** e **GOLD SHERWOOD**.",
      "**Cosa usa**: un ransomware scritto in **Go**, offuscato con lo strumento **Garble** per ostacolare l'analisi, con componenti per cifrare sistemi **Windows, Linux, NAS, BSD ed ESXi**: cioè non solo i PC, ma anche i dispositivi di archiviazione e i server di virtualizzazione.",
      "**Perché conta**: un gruppo giovane e in crescita è spesso alla ricerca di affiliati e visibilità; il passaggio a RaaS di solito aumenta il numero di vittime.",
    ],
    countermeasures: [
      "Includere **NAS e hypervisor** nel perimetro di protezione: aggiornamenti, accesso di gestione non esposto su Internet, MFA.",
      "Backup immutabili o offline, non raggiungibili con le credenziali di dominio.",
      "Monitorare l'esecuzione di binari sconosciuti e offuscati sui server (allowlisting dove possibile).",
      "Ricerca proattiva sulle tecniche documentate del gruppo (vedi sotto) a partire dall'accesso iniziale.",
    ],
    sources: [
      { title: "MITRE ATT&CK — The Gentlemen (G1058)", url: "https://attack.mitre.org/groups/G1058/" },
      { title: "MITRE ATT&CK — The Gentlemen Ransomware (S9051)", url: "https://attack.mitre.org/software/S9051/" },
    ],
  },
  {
    slug: "lockbit",
    name: "LockBit",
    aliases: ["LockBit 2.0", "LockBit 3.0", "LockBit Black", "LockBit 5.0"],
    leakNames: ["lockbit5", "lockbit3", "lockbit2"],
    attack: { groups: [], software: ["S1202", "S1199"] },
    inShort:
      "Una delle famiglie ransomware-as-a-service più diffuse degli ultimi anni, con versioni successive per Windows e VMware ESXi. I leak site più recenti compaiono come «LockBit 5».",
    howItWorks: [
      "**Chi è**: un RaaS basato su affiliati. **LockBit 2.0** è in uso almeno da giugno 2021; **LockBit 3.0** (detto anche *LockBit Black*) almeno da giugno 2022, con somiglianze con BlackMatter e BlackCat e tecniche di evasione ed esfiltrazione più evolute.",
      "**Come entrano** (secondo l'avviso congiunto CISA/FBI su LockBit 3.0): sfruttamento del **desktop remoto (RDP)**, **phishing**, **account validi** rubati o acquistati, **vulnerabilità di applicazioni esposte** su Internet e siti compromessi visitati dagli utenti (*drive-by*).",
      "**Cosa usano dopo l'ingresso**: **ProcDump** di Sysinternals per estrarre credenziali dalla memoria di LSASS, **SoftPerfect Network Scanner** per mappare la rete, **Splashtop** per muoversi tra i sistemi, lo strumento proprietario **StealBit**, **rclone** e il servizio **MEGA** per portare fuori i dati.",
      "**Impatto**: arresto di processi e servizi, cancellazione di log, cestino e copie shadow, poi cifratura dei sistemi Windows ed ESXi e doppia estorsione.",
    ],
    caveat:
      "ATT&CK e l'avviso CISA documentano le versioni 2.0 e 3.0. «LockBit 5» (il nome con cui ransomware.live traccia il leak site più recente) non ha ancora una scheda tecnica nelle fonti del progetto: le tecniche sotto si riferiscono alle versioni precedenti della stessa famiglia.",
    countermeasures: [
      "Nessun **RDP esposto** su Internet; accesso remoto solo tramite VPN o gateway con MFA.",
      "**MFA** e monitoraggio degli accessi per tutti gli account, in particolare quelli privilegiati.",
      "Protezione di **LSASS** (es. Credential Guard, regole EDR contro i dump di memoria).",
      "Bloccare o allertare su **rclone**, **MEGA** e strumenti di accesso remoto non autorizzati (es. Splashtop non aziendale).",
      "Aggiornamento prioritario delle applicazioni esposte, a partire dalle vulnerabilità nel catalogo KEV.",
      "Formazione contro il phishing e filtri sugli allegati.",
    ],
    sources: [
      { title: "CISA/FBI — #StopRansomware: LockBit 3.0 (AA23-075A)", url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-075a" },
      { title: "MITRE ATT&CK — LockBit 3.0 (S1202)", url: "https://attack.mitre.org/software/S1202/" },
      { title: "MITRE ATT&CK — LockBit 2.0 (S1199)", url: "https://attack.mitre.org/software/S1199/" },
    ],
  },
  {
    slug: "akira",
    name: "Akira",
    aliases: ["GOLD SAHARA", "PUNK SPIDER", "Howling Scorpius"],
    leakNames: ["akira"],
    attack: { groups: ["G1024"], software: ["S1129", "S1194"] },
    inShort:
      "Gruppo ransomware attivo almeno da marzo 2023, noto per entrare tramite VPN senza autenticazione a più fattori.",
    howItWorks: [
      "**Come entrano**: secondo MITRE e l'avviso CISA/FBI, soprattutto tramite **VPN senza MFA**, usando credenziali compromesse o vulnerabilità note, tra cui alcune di dispositivi **Cisco** (es. `CVE-2020-3259`, `CVE-2023-20269`) e di **VMware ESXi** (`CVE-2024-37085`).",
      "**Cosa usano dopo l'ingresso**: strumenti pubblici e legittimi. Per il controllo remoto **AnyDesk, RustDesk, MobaXterm, Cloudflare Tunnel** e **Ngrok**; per raccogliere ed esfiltrare i dati **WinRAR, FileZilla, WinSCP** e **RClone**, anche verso servizi cloud come **Mega**. Estraggono credenziali dalla memoria di LSASS e dai browser e cancellano le copie shadow.",
      "**Il ransomware**: varianti per **Windows** e per **VMware ESXi** (Akira_v2), e dall'agosto 2023 anche **Megazord**, scritto in Rust. MITRE segnala sovrapposizioni con il codice del ransomware Conti.",
      "**Impatto**: doppia estorsione (dati rubati e poi sistemi cifrati). Secondo l'avviso CISA, a fine settembre 2025 il gruppo aveva incassato circa **244 milioni di dollari** di riscatti.",
    ],
    countermeasures: [
      "**MFA obbligatoria su tutte le VPN** e sugli accessi remoti: è la contromisura principale contro questo gruppo.",
      "Aggiornare con priorità **firewall/VPN Cisco** e **hypervisor ESXi** alle versioni che correggono le vulnerabilità citate.",
      "Allertare su strumenti di accesso remoto e tunneling non autorizzati (**AnyDesk, RustDesk, Ngrok, Cloudflare Tunnel**).",
      "Bloccare o monitorare **RClone, WinSCP** e il traffico verso servizi di archiviazione cloud non aziendali.",
      "Protezione di LSASS e delle credenziali salvate nei browser; backup offline e separati dal dominio.",
    ],
    sources: [
      { title: "CISA/FBI — #StopRansomware: Akira Ransomware (AA24-109A, aggiornato nov. 2025)", url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa24-109a" },
      { title: "MITRE ATT&CK — Akira (G1024)", url: "https://attack.mitre.org/groups/G1024/" },
      { title: "MITRE ATT&CK — Akira (S1129)", url: "https://attack.mitre.org/software/S1129/" },
    ],
  },
  {
    slug: "inc-ransom",
    name: "INC Ransom",
    aliases: ["GOLD IONIC"],
    leakNames: ["incransom"],
    attack: { groups: ["G1032"], software: ["S1139"] },
    inShort:
      "Gruppo di ransomware ed estorsione attivo almeno da luglio 2023, che colpisce spesso industria, sanità e istruzione in Europa e Stati Uniti.",
    howItWorks: [
      "**Chi è**: un gruppo di ransomware ed estorsione dei dati associato al ransomware **INC Ransomware**, attivo almeno da **luglio 2023**.",
      "**Chi colpisce**: secondo MITRE organizzazioni in tutto il mondo, più spesso nei settori **industriale, sanitario e dell'istruzione**, negli **Stati Uniti e in Europa**: settori molto presenti anche in Italia.",
      "**Il ransomware**: usa la **cifratura parziale** dei file e il multi-threading per cifrare più velocemente, riducendo il tempo a disposizione per reagire.",
    ],
    countermeasures: [
      "Per sanità e manifatturiero: segmentare le reti operative (OT, dispositivi medicali) da quella d'ufficio.",
      "Rilevamento rapido: con la cifratura parziale il tempo tra l'inizio dell'attacco e l'impatto si accorcia, quindi servono allarmi sugli indicatori precoci (movimento laterale, esfiltrazione).",
      "Backup offline e piano di continuità provato per i servizi critici.",
      "Le contromisure prioritarie sotto, calcolate sulle tecniche documentate del gruppo.",
    ],
    sources: [
      { title: "MITRE ATT&CK — INC Ransom (G1032)", url: "https://attack.mitre.org/groups/G1032/" },
      { title: "MITRE ATT&CK — INC Ransomware (S1139)", url: "https://attack.mitre.org/software/S1139/" },
    ],
  },
  {
    slug: "clop",
    name: "Clop",
    aliases: ["CL0P", "TA505 (secondo CISA)"],
    leakNames: ["clop"],
    attack: { groups: [], software: ["S0611"], relatedGroup: { id: "G0092", label: "TA505" } },
    inShort:
      "Famiglia ransomware nota per le campagne di **sfruttamento di massa** di software per il trasferimento di file, che colpiscono molte organizzazioni insieme, spesso tramite i fornitori.",
    howItWorks: [
      "**Chi è**: famiglia ransomware osservata dal **febbraio 2019**, variante di CryptoMix, usata contro moltissimi settori (commercio, trasporti e logistica, istruzione, manifattura, energia, finanza, sanità e altri). CISA associa la banda Clop al gruppo **TA505**.",
      "**La firma del gruppo**: campagne basate su vulnerabilità **zero-day** in software per il trasferimento di file esposti su Internet. Nel 2023 ha sfruttato **MOVEit Transfer** (`CVE-2023-34362`) installando la web shell **LEMURLOOT** per rubare dati; in precedenza aveva colpito **Accellion FTA** (2020-2021) e **GoAnywhere MFT** (inizio 2023).",
      "**Impatto**: spesso puro **furto di dati ed estorsione**, anche senza cifratura, con pubblicazione delle vittime sul leak site. Molte organizzazioni sono state coinvolte indirettamente, tramite fornitori che usavano quei software.",
    ],
    countermeasures: [
      "Inventario e protezione dei software di **trasferimento file** (MOVEit, GoAnywhere e simili): non esporli su Internet se non indispensabile, aggiornarli subito.",
      "Monitorare i flussi di dati in uscita dai server di trasferimento file e la comparsa di web shell.",
      "Gestione del rischio dei **fornitori**: sapere quali vostri dati gestiscono e con quali software (NIS2, lettera d).",
      "Avere pronto un piano per un furto di dati senza cifratura: notifiche (GDPR, NIS2), comunicazione, legale.",
    ],
    sources: [
      { title: "CISA/FBI — #StopRansomware: CL0P exploits MOVEit (AA23-158A)", url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a" },
      { title: "MITRE ATT&CK — Clop (S0611)", url: "https://attack.mitre.org/software/S0611/" },
    ],
  },
];

export const getProfile = (slug: string) => PROFILES.find((p) => p.slug === slug);
export const profileForLeakName = (name: string) => PROFILES.find((p) => p.leakNames.includes(name));
