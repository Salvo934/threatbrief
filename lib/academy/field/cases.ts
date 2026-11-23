import type { FieldCase } from "../types";

/**
 * Casi «sul campo»: le situazioni più frequenti del lavoro. Gli esempi di prodotto sono
 * SIMULATI (domini .invalid, IP di documentazione 203.0.113.0/24, clienti generici); gli
 * eventi citati in «Esempio reale» sono pubblici e linkati alla fonte primaria.
 */
export const CASES: FieldCase[] = [
  {
    slug: "triage-mattutino",
    title: "Il triage del mattino e il digest",
    frequency: "Ogni giorno",
    requester: "Nessuno: è la routine del team",
    summary: "Leggere tanto, scegliere poco: le prime ore della giornata e le cinque righe che il team legge davvero.",
    scenario: [
      "Sono le 9. Nella notte sono uscite due nuove voci nel catalogo KEV, un advisory di CSIRT Italia, tre report di vendor, una decina di notizie e alcune nuove rivendicazioni ransomware contro aziende italiane. Il tuo compito: capire cosa conta per i **tuoi** lettori e dirlo in pochi minuti di lettura.",
    ],
    steps: [
      { when: "9:00–9:45", title: "Scorri le fonti in ordine di priorità", detail: "Prima le fonti autorevoli e azionabili (KEV, CSIRT Italia, CISA, advisory dei vendor che i clienti usano), poi i report dei vendor di sicurezza, poi le notizie. Usa i requisiti (PIR) come filtro: per ogni elemento chiediti «riguarda i nostri settori, tecnologie o fornitori?»." },
      { when: "9:45–10:00", title: "Scegli 3–5 elementi", detail: "Scarta senza rimorsi. Per ognuno decidi: solo da segnalare, da approfondire, o urgente (diventa un flash alert, vedi il caso sulle vulnerabilità)." },
      { when: "10:00–10:20", title: "Scrivi il digest", detail: "Una riga per elemento: cosa è successo, perché ci riguarda, cosa fare (anche «nessuna azione, monitoriamo»). Fonte linkata. Niente aggettivi allarmistici." },
      { when: "10:20", title: "Invia e archivia", detail: "Al canale del team, nel formato concordato. Gli elementi da approfondire diventano attività in agenda." },
    ],
    deliverable: {
      title: "Digest quotidiano (esempio simulato) · TLP:AMBER",
      text: `DIGEST CTI — 23/11 — TLP:AMBER

1. [AZIONE] Nuova vulnerabilità nel catalogo KEV su un appliance VPN usato da 3 nostri clienti.
   Sfruttamento attivo confermato da CISA. → Flash alert in preparazione entro le 12.
2. [MONITORARE] Rivendicazione ransomware contro un'azienda manifatturiera italiana
   (non cliente). Stesso gruppo segnalato a ottobre nel settore. Nessuna azione oggi.
3. [INFO] CSIRT Italia: campagna di phishing a tema fatture con allegati HTML.
   Indicatori già inviati al SOC per la ricerca nei log.
4. [INFO] Report vendor su nuovo loader distribuito via malvertising. Bassa rilevanza
   per i nostri clienti (nessun settore coinvolto). Archiviato.

Fonti: link nel ticket. Prossimo digest domani alle 10.`,
    },
    tools: ["Lettore RSS o piattaforma TI", "Catalogo CISA KEV", "Portale CSIRT Italia", "ThreatBrief (dashboard e fonti)"],
    inApp: [
      { label: "Dashboard", href: "/", task: "Fai il triage di oggi: nuove KEV con uso ransomware, rivendicazioni, ultimi alert." },
      { label: "Fonti → CSIRT Italia", href: "/fonti", task: "Controlla che la raccolta sia andata bene prima di fidarti dei dati." },
    ],
    pitfalls: [
      "Copiare titoli di notizie senza dire perché contano.",
      "Mettere 15 elementi: nessuno li legge.",
      "Usare toni allarmistici («critico!», «urgente!») per cose che non richiedono azioni.",
      "Non dire mai «nessuna azione»: anche questo è un'informazione utile.",
    ],
    interview: [
      {
        q: "Com'è il tuo primo giorno di lavoro, la prima ora?",
        a: "Triage delle fonti in ordine di priorità: KEV, CSIRT Italia e advisory dei vendor che usiamo, poi report e notizie. Filtro con i requisiti del team e scelgo pochi elementi, per ognuno dico cosa è successo, perché ci riguarda e cosa fare, anche «nessuna azione». Gli elementi urgenti diventano un avviso separato.",
      },
      {
        q: "Come gestisci il sovraccarico di informazioni?",
        a: "Con i requisiti di intelligence come filtro e un ordine fisso delle fonti, dalle più autorevoli e azionabili alle notizie. Accetto di scartare molto: il valore non sta nel leggere tutto, ma nel non perdere ciò che riguarda i nostri lettori.",
      },
    ],
  },
  {
    slug: "richiesta-dal-soc",
    title: "«Questo indirizzo è malevolo?»: la richiesta del SOC",
    frequency: "Ogni giorno",
    requester: "Analista SOC (turno)",
    summary: "La richiesta più frequente: arricchire un indicatore e dare un parere chiaro, con confidenza, in pochi minuti.",
    scenario: [
      "Messaggio dal SOC: «Abbiamo una connessione in uscita da un PC della contabilità verso `203.0.113.45` porta 443, alle 14:12. L'EDR non ha bloccato nulla. È malevolo? Dobbiamo isolare?»",
      "Il SOC ha bisogno di una risposta **veloce** e **utilizzabile**: non un saggio, ma un parere con il livello di confidenza e il prossimo passo consigliato.",
    ],
    steps: [
      { when: "0–5 min", title: "Chiarisci il contesto", detail: "Quale processo ha fatto la connessione? Quanti dati? È successo su altri host? Spesso il contesto vale più dell'indirizzo." },
      { when: "5–15 min", title: "Arricchisci l'indicatore", detail: "Archivio interno e piattaforma TI, feed (ThreatFox, URLhaus), reputazione (VirusTotal), DNS passivo (quali domini puntano a quell'IP?), hosting (cloud condiviso? CDN?), certificati." },
      { when: "15–20 min", title: "Valuta", detail: "Collegamento forte (C2 noto di un malware, visto di recente) o debole (IP di hosting condiviso, segnalazione vecchia)? Considera i falsi positivi." },
      { when: "20–25 min", title: "Rispondi", detail: "Verdetto, confidenza, motivazione in 2–3 righe, azione consigliata, e cosa cercare ancora (es. altri host verso lo stesso dominio)." },
    ],
    deliverable: {
      title: "Risposta al SOC (esempio simulato) · TLP:AMBER",
      text: `RIF: ticket #4521 — 203.0.113.45:443

VERDETTO: probabilmente malevolo — confidenza MEDIA.
MOTIVI: IP segnalato da ThreatFox 2 giorni fa come C2 di Cobalt Strike (fonte B2);
certificato TLS self-signed con attributi tipici dei profili di default.
Nessun dominio legittimo associato nel DNS passivo.
AZIONE CONSIGLIATA: isolare l'host, raccogliere memoria e log del processo che ha
avviato la connessione; bloccare l'IP sul perimetro.
DA CERCARE: altri host verso 203.0.113.45 o verso il JA3/JA4 osservato, ultimi 14 giorni.
NOTA: non attribuibile a un attore specifico (Cobalt Strike è usato da molti gruppi).`,
    },
    tools: ["Piattaforma TI interna", "VirusTotal", "DNS passivo", "ThreatFox / URLhaus", "ThreatBrief (Analisi IOC)"],
    inApp: [
      { label: "Analisi IOC", href: "/analisi", task: "Incolla un IP «collegato» del testo di esempio e scrivi una risposta al SOC nel formato del caso." },
    ],
    pitfalls: [
      "Rispondere «è su VirusTotal con 3 rilevamenti» senza un verdetto né un'azione.",
      "Dare un verdetto sicuro su un IP di cloud condiviso.",
      "Attribuire l'attività a un gruppo per la sola presenza di uno strumento comune.",
      "Metterci due ore per una risposta che serviva in venti minuti.",
    ],
    interview: [
      {
        q: "Il SOC ti chiede se un IP è malevolo. Cosa fai?",
        a: "Prima chiedo il contesto: processo, volume, altri host. Poi arricchisco l'IP: archivio interno, feed, reputazione, DNS passivo, tipo di hosting, certificati. Valuto se il collegamento è forte o debole e i falsi positivi, e rispondo in pochi minuti con verdetto, confidenza, motivi, azione consigliata e cosa cercare ancora.",
      },
      {
        q: "Un IP compare in un feed come malevolo ma appartiene a un grande cloud provider. Lo blocchi?",
        a: "Con cautela: su un cloud o una CDN lo stesso IP può servire servizi legittimi e cambiare spesso cliente. Guardo quanto è recente la segnalazione, il dominio associato e il contesto della connessione; spesso è meglio bloccare il dominio o l'URL specifico, o usare l'IP solo per la ricerca nei log.",
      },
    ],
  },
  {
    slug: "vulnerabilita-critica-sfruttata",
    title: "Vulnerabilità critica sfruttata: il flash alert",
    frequency: "Più volte al mese",
    requester: "Vulnerability management, CISO, clienti",
    summary: "Un prodotto molto diffuso ha una falla sfruttata attivamente: in poche ore bisogna dire chi è esposto e cosa fare.",
    scenario: [
      "Alle 11 compare nel catalogo KEV una vulnerabilità di un dispositivo perimetrale (VPN o gateway di accesso remoto) molto diffuso. Ci sono segnalazioni di sfruttamento attivo e, in passato, gruppi ransomware hanno usato falle simili per entrare nelle reti. Il CISO scrive: «Ci riguarda? Cosa facciamo?».",
    ],
    realExample: {
      title: "Citrix Bleed (CVE-2023-4966), 2023",
      text: "Una vulnerabilità di NetScaler ADC e Gateway permetteva di rubare token di sessione e aggirare l'autenticazione, MFA compresa. Dopo la pubblicazione è stata sfruttata su larga scala; CISA e FBI hanno documentato l'uso da parte di affiliati di LockBit 3.0. Molte organizzazioni hanno dovuto non solo aggiornare, ma anche invalidare tutte le sessioni attive: un dettaglio che solo chi aveva letto bene gli advisory ha comunicato subito.",
      url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-325a",
    },
    steps: [
      { when: "0–30 min", title: "Raccogli i fatti", detail: "Advisory del vendor (versioni colpite, patch, mitigazioni), KEV (data, uso ransomware noto), CISA o CSIRT Italia, primi report di sfruttamento. Distingui ciò che è confermato da ciò che è ipotesi." },
      { when: "30–60 min", title: "Verifica l'esposizione", detail: "Con il vulnerability management o l'inventario: abbiamo quel prodotto? Quali versioni? È esposto su Internet? Chi lo gestisce?" },
      { when: "60–90 min", title: "Definisci le azioni in ordine", detail: "Patch o mitigazione temporanea; azioni aggiuntive richieste dal vendor (es. invalidare le sessioni, ruotare credenziali); ricerca di segni di compromissione precedente alla patch." },
      { when: "90–120 min", title: "Scrivi e invia il flash alert", detail: "Breve, con BLUF, TLP, azioni numerate e responsabili. Poi aggiornalo quando escono nuove informazioni (indicatori, exploit pubblici)." },
    ],
    deliverable: {
      title: "Flash alert (esempio simulato) · TLP:AMBER",
      text: `FLASH ALERT — Vulnerabilità critica su gateway VPN [prodotto X] — TLP:AMBER

BLUF: La vulnerabilità è sfruttata attivamente e consente l'accesso senza credenziali.
Abbiamo 2 gateway esposti su Internet con versione vulnerabile: aggiornare oggi.

FATTI
- Il vendor ha pubblicato la patch per le versioni A.B.C e successive [1].
- CISA ha inserito la vulnerabilità nel catalogo KEV il 23/11 [2].
- Sfruttamento in corso segnalato da più fonti indipendenti [3].
VALUTAZIONE
- Valutiamo PROBABILE (confidenza media) che gruppi ransomware la usino entro
  pochi giorni, come già successo con vulnerabilità simili.
AZIONI (in ordine)
1. Applicare la patch ai gateway gw-01 e gw-02 entro oggi (team rete).
2. Dopo la patch: invalidare le sessioni attive come indicato dal vendor.
3. SOC: cercare nei log del gateway gli indicatori dell'advisory dal 01/11 in poi.
Prossimo aggiornamento: domani alle 10 o prima se cambia qualcosa.`,
    },
    tools: ["Advisory del vendor", "CISA KEV", "Inventario e scanner di vulnerabilità", "Shodan/Censys (esposizione esterna)", "ThreatBrief (KEV in dashboard)"],
    inApp: [
      { label: "Dashboard", href: "/", task: "Trova una KEV recente con uso ransomware noto e scrivi un flash alert nel formato del caso." },
      { label: "Analisi IOC", href: "/analisi", task: "Incolla l'ID di una CVE: l'app ti dice se è nel catalogo KEV e da quando." },
    ],
    pitfalls: [
      "Ricopiare l'advisory del vendor invece di dire «ci riguarda / non ci riguarda».",
      "Dimenticare le azioni oltre la patch (sessioni, credenziali, ricerca di compromissioni precedenti).",
      "Aspettare di avere tutte le informazioni: meglio un avviso alle 13 e un aggiornamento alle 17.",
      "Confondere «exploit pubblico» con «sfruttamento attivo».",
    ],
    interview: [
      {
        q: "Esce una vulnerabilità critica sfruttata attivamente su un prodotto che usiamo. Cosa fai nelle prime due ore?",
        a: "Raccolgo i fatti: advisory del vendor, KEV, CSIRT, report di sfruttamento. Verifico con il vulnerability management se siamo esposti, quali versioni e se sono raggiungibili da Internet. Definisco le azioni in ordine: patch o mitigazione, eventuali passi aggiuntivi come invalidare le sessioni, ricerca di compromissioni precedenti. Mando un flash alert breve con BLUF, TLP e azioni, e lo aggiorno man mano.",
      },
      {
        q: "Perché il catalogo KEV è utile per dare priorità alle patch?",
        a: "Perché contiene solo vulnerabilità con sfruttamento attivo confermato, e indica se sono note in campagne ransomware. Tra migliaia di CVE con punteggio alto, quelle sfruttate davvero sono una piccola parte: partire da lì riduce il rischio reale più in fretta.",
      },
    ],
  },
  {
    slug: "analisi-campagna-phishing",
    title: "Una campagna di phishing segnalata dagli utenti",
    frequency: "Ogni settimana",
    requester: "SOC o team di sicurezza email",
    summary: "Da un'email sospetta a indicatori, tecniche e raccomandazioni: il lavoro più classico.",
    scenario: [
      "Dieci dipendenti hanno segnalato nella mattinata un'email «Fattura scaduta – sollecito» con un allegato HTML. Due hanno aperto l'allegato. Il SOC chiede: cosa fa l'allegato? Ci sono altre email simili? Cosa blocchiamo?",
    ],
    steps: [
      { when: "0–20 min", title: "Analizza l'email in sicurezza", detail: "Intestazioni (mittente reale, server di invio, SPF/DKIM/DMARC), corpo, allegato. Non aprire nulla sulla tua postazione: usa una sandbox o un servizio di analisi; per le pagine web urlscan.io." },
      { when: "20–45 min", title: "Ricostruisci la catena", detail: "L'allegato HTML porta a una pagina di raccolta credenziali? Scarica un file? Annota URL, domini, hash, e mappa le tecniche (es. T1566.001 allegato, T1204 esecuzione da parte dell'utente)." },
      { when: "45–60 min", title: "Misura l'estensione", detail: "Con il team email: quanti destinatari, quanti clic, altre varianti (stesso mittente, stesso oggetto, stessa infrastruttura)." },
      { when: "60–90 min", title: "Consegna", detail: "Indicatori da bloccare e da cercare, raccomandazioni (reset delle credenziali per chi ha inserito la password, regole email), breve nota per la comunicazione agli utenti." },
    ],
    deliverable: {
      title: "Nota tecnica per il SOC (esempio simulato) · TLP:AMBER",
      text: `CAMPAGNA PHISHING «Fattura scaduta» — 23/11 — TLP:AMBER

SINTESI: allegato HTML che apre una finta pagina di login Microsoft 365 e invia
le credenziali a un dominio registrato 3 giorni fa. Nessun malware scaricato.
TECNICHE: T1566.001 (allegato), T1204.002 (apertura da parte dell'utente),
T1056.003 (cattura credenziali da portale web).
INDICATORI
- Dominio: fatture-portale[.]invalid (registrato il 20/11)
- URL: hxxps://fatture-portale[.]invalid/m365/login
- Mittente: sollecito@pagamenti-online[.]invalid (SPF fail)
ESTENSIONE: 41 destinatari, 2 aperture, 1 inserimento di credenziali.
AZIONI: reset della password e revoca delle sessioni per l'utente coinvolto;
blocco del dominio; regola per quarantena degli allegati HTML da mittenti esterni.`,
    },
    tools: ["Sandbox", "urlscan.io", "Analisi delle intestazioni email", "WHOIS e DNS passivo", "ThreatBrief (Analisi IOC, Briefs)"],
    inApp: [
      { label: "Analisi IOC", href: "/analisi", task: "Incolla un testo con indicatori defanged: verifica che l'app li riconosca e li confronti con le fonti." },
      { label: "I miei report", href: "/report", task: "Trasforma la nota tecnica in un report evento con tecniche ATT&CK e indicatori." },
    ],
    pitfalls: [
      "Aprire allegati o link sulla propria postazione.",
      "Fermarsi agli indicatori senza raccomandazioni (reset credenziali, regole email).",
      "Dimenticare chi ha già inserito le credenziali: è il rischio vero.",
      "Pubblicare gli indicatori senza defanging.",
    ],
    interview: [
      {
        q: "Ti arriva un'email di phishing segnalata da più utenti. Come la analizzi?",
        a: "In sicurezza: intestazioni e autenticazione del mittente, poi allegato e link in sandbox o urlscan, senza aprirli sulla mia postazione. Ricostruisco la catena, estraggo gli indicatori e mappo le tecniche. Con il team email misuro quanti l'hanno ricevuta e aperta, e consegno indicatori da bloccare, ricerche da fare e azioni, a partire dal reset delle credenziali per chi le ha inserite.",
      },
      {
        q: "Cosa sono SPF, DKIM e DMARC, in breve?",
        a: "SPF dice quali server possono inviare email per un dominio; DKIM firma i messaggi per verificarne integrità e origine; DMARC dice al destinatario cosa fare se SPF o DKIM falliscono e permette di ricevere report. Nel phishing, un fallimento è un indizio, ma molte campagne usano domini propri configurati correttamente.",
      },
    ],
  },
  {
    slug: "rivendicazione-su-fornitore",
    title: "Un fornitore compare su un leak site ransomware",
    frequency: "Più volte al mese",
    requester: "CISO, ufficio acquisti, legale, clienti",
    summary: "Una rivendicazione tocca un fornitore o un cliente: verificare, valutare l'impatto, comunicare senza panico.",
    scenario: [
      "Lunedì mattina scopri, dalle rivendicazioni raccolte da un aggregatore, che un gruppo ransomware dichiara di aver colpito il fornitore che gestisce le buste paga della tua azienda. Il gruppo minaccia di pubblicare i dati tra 7 giorni. Il CISO chiede: «Quali nostri dati sono coinvolti? Dobbiamo notificare qualcosa?»",
    ],
    realExample: {
      title: "MOVEit Transfer e Cl0p (CVE-2023-34362), 2023",
      text: "Il gruppo Cl0p ha sfruttato una vulnerabilità di MOVEit Transfer, un software di trasferimento file, per rubare dati da moltissime organizzazioni, e poi ha pubblicato elenchi di vittime sul proprio leak site. Molte aziende sono state coinvolte non direttamente ma tramite fornitori, ad esempio servizi di gestione delle buste paga: l'esempio di scuola del rischio di catena di fornitura.",
      url: "https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a",
    },
    steps: [
      { when: "Prima ora", title: "Verifica cosa è noto", detail: "La rivendicazione è su un leak site (tramite aggregatore, senza scaricare dati): data, gruppo, cosa dichiara. Ci sono comunicazioni del fornitore, notizie, advisory? Ricorda: è una rivendicazione, non un fatto verificato." },
      { when: "Prima ora", title: "Contatta il fornitore", detail: "Insieme al referente del contratto: conferma dell'incidente, perimetro, quali dati dell'azienda sono coinvolti, accessi o integrazioni con i vostri sistemi." },
      { when: "Primo giorno", title: "Valuta l'esposizione", detail: "Quali dati condivisi (personali, finanziari)? Connessioni tecniche (VPN, account, API) da sospendere o ruotare? Il gruppo è noto per usare i dati rubati per phishing mirato?" },
      { when: "Primo giorno", title: "Informa chi deve decidere", detail: "Brief al CISO, al legale e al DPO: se ci sono dati personali dei dipendenti, il titolare deve valutare gli obblighi GDPR (notifica al Garante entro 72 ore dalla conoscenza). Non sei tu a decidere, ma devi dare le informazioni giuste in tempo." },
      { when: "Giorni successivi", title: "Monitora", detail: "Pubblicazione dei dati, aggiornamenti del fornitore, campagne di phishing che sfruttano l'incidente." },
    ],
    deliverable: {
      title: "Brief per CISO, legale e DPO (esempio simulato) · TLP:AMBER",
      text: `BRIEF — Rivendicazione ransomware contro fornitore paghe — TLP:AMBER

BLUF: Il gruppo [X] rivendica un attacco al nostro fornitore delle buste paga.
Il fornitore conferma un incidente, non ancora il perimetro. Possibile
coinvolgimento dei dati personali dei dipendenti: serve una valutazione GDPR oggi.

FATTI
- Rivendicazione pubblicata il 22/11 sul leak site del gruppo, raccolta da
  ransomware.live (non verificata, C3) [1].
- Il fornitore ha confermato per email un «incidente di sicurezza in corso» [2].
VALUTAZIONE
- Valutiamo PROBABILE (confidenza media) il furto di dati: il gruppo pubblica
  di solito campioni di dati reali entro la scadenza.
AZIONI
1. Legale/DPO: valutare gli obblighi di notifica (GDPR) con le informazioni del fornitore.
2. IT: sospendere l'integrazione SFTP con il fornitore e ruotare le credenziali.
3. Comunicazione: preparare un avviso ai dipendenti sul rischio di phishing mirato.`,
    },
    tools: ["Aggregatori di rivendicazioni (es. ransomware.live)", "Contratti e registro dei fornitori", "ThreatBrief (Settori, Attori)"],
    inApp: [
      { label: "Settori → Manifatturiero", href: "/settori/manifatturiero", task: "Scegli una rivendicazione recente e scrivi il brief come se fosse un tuo fornitore." },
      { label: "Lezione: ecosistema ransomware", href: "/accademia/ecosistema-ransomware", task: "Ripassa come si citano correttamente le rivendicazioni." },
    ],
    pitfalls: [
      "Scaricare i dati pubblicati dal gruppo: è un rischio legale ed etico, e non serve.",
      "Presentare la rivendicazione come un fatto accertato.",
      "Decidere tu sugli obblighi di notifica invece di informare legale e DPO in tempo.",
      "Dimenticare le connessioni tecniche con il fornitore.",
    ],
    interview: [
      {
        q: "Un fornitore compare su un leak site ransomware. Cosa fai?",
        a: "Verifico cosa è noto senza scaricare dati: rivendicazione, comunicazioni del fornitore, notizie. Contatto il fornitore tramite il referente per capire perimetro e dati coinvolti. Valuto l'esposizione, cioè dati condivisi e connessioni tecniche da sospendere o ruotare, e informo subito CISO, legale e DPO, perché con dati personali ci sono obblighi GDPR a 72 ore. Poi monitoro pubblicazione e phishing mirato.",
      },
      {
        q: "Perché il rischio della catena di fornitura è così importante oggi?",
        a: "Perché un singolo fornitore compromesso espone molti clienti insieme, come nel caso MOVEit del 2023, in cui Cl0p ha colpito moltissime organizzazioni sfruttando un unico software di trasferimento file, spesso tramite fornitori. Per questo la NIS2 inserisce la sicurezza della catena di approvvigionamento tra le misure minime, la lettera d) dell'articolo 24.",
      },
    ],
  },
  {
    slug: "report-periodico-direzione",
    title: "Il report periodico per la direzione",
    frequency: "Ogni settimana",
    requester: "CISO, direzione, cliente (servizio continuativo)",
    summary: "Trasformare una settimana o un mese di eventi in una pagina che aiuta a decidere.",
    scenario: [
      "Ogni venerdì (o a fine mese, per i clienti) consegni un report alla direzione. Il CISO lo legge in 3 minuti prima di una riunione con il CdA. Deve uscirne con una visione chiara: cosa è cambiato nel panorama delle minacce per l'azienda, e cosa serve fare.",
    ],
    steps: [
      { when: "Durante la settimana", title: "Raccogli i candidati", detail: "Dal digest quotidiano, dai flash alert e dalle richieste ricevute: segna gli elementi con impatto potenziale sul business." },
      { when: "Giovedì", title: "Scegli i 3 temi", detail: "Al massimo tre, legati ai requisiti (PIR). Per ognuno: cosa è successo, cosa significa per noi, cosa raccomandiamo." },
      { when: "Giovedì", title: "Aggiungi due o tre numeri", detail: "Trend semplici e onesti: rivendicazioni ransomware nel settore, vulnerabilità KEV che ci riguardano e stato delle patch, campagne di phishing bloccate." },
      { when: "Venerdì", title: "Rileggi e consegna", detail: "Prima riga = conclusione. Niente gergo, niente ID tecnici. Allegato tecnico separato per chi vuole i dettagli." },
    ],
    deliverable: {
      title: "Report settimanale (esempio simulato) · TLP:AMBER",
      text: `MINACCE — SETTIMANA 47 — TLP:AMBER

IN SINTESI: rischio stabile. Un'azione urgente (patch VPN, completata al 80%);
nessun incidente confermato.

1. VULNERABILITÀ VPN SFRUTTATA — 2 gateway su 3 aggiornati; il terzo entro lunedì.
   Senza la patch un attaccante può entrare senza credenziali.
2. RANSOMWARE NEL SETTORE — 9 rivendicazioni contro aziende manifatturiere
   italiane questo mese (media degli ultimi 6 mesi: 7). Accesso iniziale
   tipico: VPN non aggiornate e credenziali rubate.
3. PHISHING «FATTURA SCADUTA» — 41 email ricevute, 1 credenziale inserita e
   subito reimpostata. Proposta: blocco degli allegati HTML esterni.

DECISIONE RICHIESTA: approvare il blocco degli allegati HTML (impatto minimo).`,
    },
    tools: ["Digest e alert della settimana", "Dati interni (patch, phishing)", "ThreatBrief (Dashboard, Settori, Briefs)"],
    inApp: [
      { label: "Settori", href: "/settori", task: "Scegli un settore e scrivi il report settimanale di un'azienda di quel settore con 3 temi e 2 numeri." },
      { label: "Lezione: scrivere per il lettore", href: "/accademia/scrivere-per-il-lettore", task: "Usa la checklist di revisione prima di «consegnare»." },
    ],
    pitfalls: [
      "Fare la cronaca della settimana invece di dire cosa significa.",
      "Mettere 10 temi.",
      "Numeri senza confronto (9 rivendicazioni: tante o poche?).",
      "Non chiedere mai una decisione: il report diventa una lettura facoltativa.",
    ],
    interview: [
      {
        q: "Come imposteresti un report settimanale per il CISO?",
        a: "Una pagina: in apertura la sintesi e il livello di rischio; al massimo tre temi legati ai requisiti, ognuno con cosa è successo, cosa significa per noi e cosa raccomandiamo; due o tre numeri con un confronto; se serve, una decisione richiesta. I dettagli tecnici vanno in un allegato separato.",
      },
      {
        q: "Quali metriche metteresti in un report per la direzione?",
        a: "Poche e comprensibili, con un confronto nel tempo: stato delle patch sulle vulnerabilità sfruttate che ci riguardano, rivendicazioni ransomware nel nostro settore rispetto alla media, campagne di phishing ricevute e bloccate, eventuali incidenti. Evito metriche di volume come il numero di IOC raccolti.",
      },
    ],
  },
  {
    slug: "profilo-attore-su-richiesta",
    title: "Profilo di un attore su richiesta",
    frequency: "Più volte al mese",
    requester: "CISO, threat hunting, cliente",
    summary: "«Chi è questo gruppo e cosa dobbiamo fare?»: dal nome in un articolo a un profilo utilizzabile.",
    scenario: [
      "Un articolo cita un gruppo che avrebbe colpito aziende del vostro settore in Europa. Il CISO inoltra il link: «Chi sono? Dobbiamo preoccuparci?». Hai due giorni.",
    ],
    steps: [
      { when: "Giorno 1, mattina", title: "Identifica il gruppo", detail: "Alias tra vendor (ATT&CK, report), periodo di attività, motivazione, vittimologia. Attenzione: nomi diversi possono indicare cluster solo in parte sovrapposti." },
      { when: "Giorno 1, pomeriggio", title: "Raccogli le TTP", detail: "Tecniche ATT&CK con le procedure documentate, software usato, vulnerabilità sfruttate, accesso iniziale tipico. Fonti primarie, con codice Admiralty." },
      { when: "Giorno 2, mattina", title: "Valuta la rilevanza", detail: "Colpisce il nostro settore e la nostra area? Usa tecnologie che abbiamo? Le nostre difese coprono le sue tecniche principali? Qui si formulano i giudizi, con confidenza." },
      { when: "Giorno 2, pomeriggio", title: "Scrivi e consegna", detail: "Brief esecutivo (rilevanza e 3 azioni) + scheda tecnica (TTP, indicatori, detection e mitigazioni prioritarie)." },
    ],
    deliverable: {
      title: "Struttura del profilo (esempio)",
      text: `PROFILO ATTORE — [Nome] (alias: …) — TLP:CLEAR

BLUF: Gruppo [criminale/statale] attivo dal [anno], colpisce [settori] in [aree].
Rilevanza per noi: MEDIA — stesso settore, ma accesso iniziale via [tecnologia]
che non usiamo esposta su Internet.

CHI È (fatti, con fonti e Admiralty)
COME OPERA (tecniche ATT&CK principali con procedure)
COSA CI RIGUARDA (valutazioni con confidenza)
COSA FARE (3 azioni) + allegato tecnico: indicatori, idee di detection,
mitigazioni prioritarie (con misure NIS2).`,
    },
    tools: ["MITRE ATT&CK", "Report di vendor e advisory", "ThreatBrief (Attori, Matrice, editor dei report)"],
    inApp: [
      { label: "Attori", href: "/attori", task: "Scegli un attore che colpisce il tuo settore preferito e costruisci il profilo con l'editor dei report." },
      { label: "Matrice", href: "/matrice", task: "Confronta l'attore con uno simile per capire cosa lo distingue." },
    ],
    pitfalls: [
      "Copiare la scheda ATT&CK senza dire perché il gruppo conta (o non conta) per il lettore.",
      "Fidarsi di un solo report di vendor.",
      "Trattare gli alias come perfettamente equivalenti.",
      "Dimenticare le azioni.",
    ],
    interview: [
      {
        q: "Ti chiedono un profilo su un gruppo citato in un articolo. Come procedi?",
        a: "Identifico il gruppo e gli alias, con attenzione alle sovrapposizioni tra vendor; raccolgo TTP, software, vulnerabilità sfruttate e vittimologia da fonti primarie valutate con l'Admiralty; valuto la rilevanza per l'organizzazione, cioè settore, area, tecnologie e copertura delle difese, con giudizi e confidenza; consegno un brief con tre azioni e una scheda tecnica.",
      },
    ],
  },
  {
    slug: "supporto-incidente",
    title: "Supporto a un incidente in corso",
    frequency: "Raro, ma capita",
    requester: "Incident response, CISO, direzione",
    summary: "Quando l'incidente è vero: dare contesto, ipotesi e priorità a chi sta rispondendo, sotto pressione.",
    scenario: [
      "Il SOC conferma una compromissione: un dispositivo di accesso remoto è stato violato e ci sono segni di movimento laterale. L'incident response guida la risposta. A te chiedono: «Chi potrebbe essere? Cosa farà dopo? Cosa dobbiamo cercare?»",
    ],
    realExample: {
      title: "Ivanti Connect Secure (CVE-2023-46805 e CVE-2024-21887), 2024",
      text: "All'inizio del 2024 due vulnerabilità concatenate di Ivanti Connect Secure sono state sfruttate per compromettere dispositivi di accesso remoto. CISA ha emesso una direttiva d'emergenza per le agenzie federali con passi precisi: mitigazioni, uso degli strumenti di verifica del vendor, e in caso di compromissione azioni molto più ampie. Gli analisti CTI hanno avuto un ruolo chiave nel tradurre gli aggiornamenti continui (indicatori, metodi di aggiramento delle mitigazioni) in istruzioni per i team di risposta.",
      url: "https://www.cisa.gov/news-events/directives/ed-24-01-mitigate-ivanti-connect-secure-and-ivanti-policy-secure-vulnerabilities",
    },
    steps: [
      { when: "Subito", title: "Allineati con l'IR", detail: "Cosa si sa (cronologia, sistemi coinvolti, indicatori trovati) e cosa serve. Nell'incidente comanda l'IR: la CTI è un supporto, non un'indagine parallela." },
      { when: "Prime ore", title: "Dai contesto agli indicatori", detail: "Arricchisci quanto trovato: malware, infrastruttura, vulnerabilità sfruttata, campagne note con lo stesso schema." },
      { when: "Prime ore", title: "Proponi ipotesi di caccia", detail: "Se lo schema somiglia a campagne note, cosa fanno di solito dopo? Quali tecniche cercare (persistenza, credenziali, esfiltrazione) e dove." },
      { when: "Durante", title: "Aggiornamenti brevi e regolari", detail: "Note sintetiche per l'IR e per la direzione, ad orari concordati; distingui sempre fatti e ipotesi." },
      { when: "Dopo", title: "Lezioni apprese", detail: "Indicatori e TTP nella piattaforma, nuove detection, aggiornamento dei requisiti. Se l'organizzazione è soggetta alla NIS2, l'IR e il legale gestiscono le notifiche (24 ore, 72 ore, un mese): la CTI fornisce le informazioni tecniche." },
    ],
    deliverable: {
      title: "Aggiornamento all'incident response (esempio simulato) · TLP:RED",
      text: `AGGIORNAMENTO CTI #3 — 23/11 16:00 — TLP:RED

FATTI
- Il webshell trovato su gw-01 corrisponde a quello descritto nell'advisory [1].
- I due IP di accesso (203.0.113.20, 203.0.113.21) sono VPS usati nella
  stessa campagna secondo [2].
IPOTESI (confidenza media)
- Lo schema è coerente con un'operazione di spionaggio più che con ransomware:
  nessuna attività di cifratura, raccolta di configurazioni e credenziali.
DA CERCARE (priorità)
1. Uso di account di servizio del gateway su altri sistemi (ultimi 30 giorni).
2. Accessi LDAP anomali dal gateway (raccolta di credenziali).
3. Traffico in uscita verso i due IP da qualsiasi altro host.
Prossimo aggiornamento: 20:00.`,
    },
    tools: ["Piattaforma TI", "Advisory e report sulla campagna", "MITRE ATT&CK", "Strumenti dell'IR (EDR, SIEM)"],
    inApp: [
      { label: "Lezione: strumenti, hunting e detection", href: "/accademia/strumenti-hunting-detection", task: "Ripassa come si formula un'ipotesi di caccia." },
      { label: "Attori", href: "/attori", task: "Scegli un attore e scrivi tre ipotesi di caccia basate sulle sue tecniche più usate." },
    ],
    pitfalls: [
      "Fare un'indagine parallela senza coordinarsi con l'IR.",
      "Spingere un'attribuzione invece di dare indicazioni utili alla risposta.",
      "Mescolare fatti e ipotesi negli aggiornamenti sotto pressione.",
      "Inviare informazioni sensibili fuori dal gruppo di risposta (il TLP conta ancora di più).",
    ],
    interview: [
      {
        q: "Che ruolo ha la CTI durante un incidente?",
        a: "Supporta l'incident response, che guida la risposta: dà contesto a indicatori e malware trovati, riconosce schemi di campagne note, propone ipotesi su cosa cercare dopo, come persistenza, credenziali ed esfiltrazione, e prepara aggiornamenti brevi che separano fatti e ipotesi. Dopo l'incidente porta le lezioni apprese in detection e requisiti.",
      },
      {
        q: "Durante un incidente il management vuole sapere chi è stato. Cosa rispondi?",
        a: "Che l'attribuzione richiede tempo e prove multiple, e che in quel momento la priorità è contenere e capire l'estensione. Posso dire se lo schema è coerente con campagne note, con una confidenza esplicita, e cosa implica per la risposta, ad esempio spionaggio contro ransomware, ma senza promettere un nome che non posso sostenere.",
      },
    ],
  },
];
