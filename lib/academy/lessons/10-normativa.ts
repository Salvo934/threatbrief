import type { Lesson } from "../types";

export const normativa: Lesson = {
  slug: "normativa-nis2-italia",
  group: "Contesto",
  title: "Il contesto normativo: NIS2, D.Lgs. 138/2024 e dintorni",
  summary: "Cosa chiede la legge alle organizzazioni italiane e dove si inserisce la CTI.",
  minutes: 30,
  goals: [
    "Spiegare NIS2 e il suo recepimento italiano",
    "Conoscere obblighi di notifica, misure e sanzioni principali",
    "Collegare il lavoro CTI agli obblighi normativi (GDPR, DORA, Perimetro)",
  ],
  sections: [
    {
      title: "NIS2 e D.Lgs. 138/2024",
      blocks: [
        "La **direttiva (UE) 2022/2555 (NIS2)** alza il livello di cybersicurezza nell'Unione. In Italia è recepita dal **D.Lgs. 4 settembre 2024, n. 138**, in vigore dal **16 ottobre 2024**. L'autorità nazionale competente è l'**Agenzia per la Cybersicurezza Nazionale (ACN)**; il **CSIRT Italia** gestisce le notifiche degli incidenti.",
        {
          list: [
            "**Chi**: soggetti **essenziali** e **importanti** nei settori ad alta criticità (Allegato I: energia, trasporti, banche, sanità, acqua, infrastrutture digitali, PA…) e negli altri settori critici (Allegato II: manifattura di alcuni prodotti, servizi postali, alimentare, chimica…), in base a dimensione e criteri specifici.",
            "**Registrazione** annuale sulla piattaforma ACN.",
            "**Organi di amministrazione**: approvano le misure, ne sono responsabili e devono seguire una formazione in materia.",
            "**Misure di sicurezza (art. 24)**: un insieme minimo di dieci elementi, dalla lettera a) alla l), che trovi nella pagina **Mitigazioni e NIS2** con il testo ufficiale.",
            "**Notifica degli incidenti significativi (art. 25)**: **preallarme entro 24 ore**, **notifica entro 72 ore**, **relazione finale entro un mese**.",
            "**Sanzioni**: per i soggetti essenziali fino a **10 milioni di euro o 2%** del fatturato mondiale annuo; per gli importanti fino a **7 milioni o 1,4%** (si applica il valore più alto).",
          ],
        },
        { note: "Le modalità e i tempi di applicazione delle misure sono dettagliati dalle determinazioni dell'ACN, pubblicate progressivamente: in un colloquio cita il principio e, se ti chiedono i dettagli, la fonte (sito ACN)." , tone: "warn" },
      ],
    },
    {
      title: "Dove entra la CTI",
      blocks: [
        {
          table: {
            head: ["Misura (art. 24, c. 2)", "Contributo della CTI"],
            rows: [
              ["a) analisi dei rischi", "Quali attori e tecniche minacciano il settore (dashboard di settore)"],
              ["b) gestione degli incidenti", "Contesto durante la risposta, indicatori, informazioni per le notifiche"],
              ["d) catena di approvvigionamento", "Monitoraggio di incidenti e rivendicazioni che riguardano i fornitori"],
              ["e) vulnerabilità", "Priorità di patching con il catalogo KEV e l'uso da parte dei ransomware"],
              ["f) efficacia delle misure", "Copertura delle tecniche degli attori prioritari"],
              ["g) formazione", "Esempi reali e attuali per la sensibilizzazione"],
            ],
          },
        },
        "È il ragionamento dietro la mappatura ATT&CK → NIS2 di ThreatBrief: le mitigazioni che coprono più tecniche degli attori di un settore indicano dove le misure dell'art. 24 rendono di più.",
      ],
    },
    {
      title: "Le altre norme da conoscere",
      blocks: [
        {
          table: {
            head: ["Norma", "Ambito", "Punto chiave"],
            rows: [
              ["**GDPR** (Reg. UE 2016/679), art. 33", "Violazioni di dati personali", "Notifica al Garante entro **72 ore** dalla conoscenza"],
              ["**DORA** (Reg. UE 2022/2554)", "Settore finanziario", "Applicabile dal **17 gennaio 2025**: gestione del rischio ICT, notifica degli incidenti gravi, test di resilienza, rischio dei fornitori ICT"],
              ["**Perimetro di sicurezza nazionale cibernetica** (D.L. 105/2019, conv. L. 133/2019)", "Soggetti strategici nazionali", "Obblighi su beni ICT critici e notifica degli incidenti"],
              ["**Legge 90/2024**", "Rafforzamento della cybersicurezza nazionale e reati informatici", "Tra l'altro, obblighi di notifica per alcune pubbliche amministrazioni e inasprimento delle pene"],
            ],
          },
        },
        "Un incidente può far scattare più obblighi insieme (es. NIS2 e GDPR): l'analista CTI non è un giurista, ma deve sapere quali informazioni servono e in che tempi.",
      ],
    },
  ],
  practice: [
    { label: "Mitigazioni e NIS2", href: "/mitigazioni", task: "Leggi le dieci lettere dell'art. 24: per ognuna indica una mitigazione ATT&CK e un'attività CTI di supporto." },
    { label: "Settori → Energia", href: "/settori/energia", task: "Prendi le prime tre mitigazioni prioritarie: quali lettere NIS2 coprono? Cosa resta scoperto?" },
  ],
  exercise:
    "Simula un caso: un ospedale (soggetto essenziale) subisce un ransomware con esfiltrazione di dati sanitari. Scrivi una timeline delle prime 72 ore con gli obblighi di notifica (NIS2 e GDPR) e le informazioni che la CTI può fornire a ogni passo.",
  pitfalls: [
    "Confondere i termini di notifica (24 ore di preallarme NIS2, 72 ore di notifica NIS2 e GDPR).",
    "Presentare la mappatura ATT&CK → NIS2 come ufficiale: è una valutazione.",
    "Dimenticare DORA per i clienti del settore finanziario.",
  ],
  interview: [
    {
      q: "Cosa sai della NIS2 in Italia?",
      a: "È recepita dal D.Lgs. 138/2024, in vigore dal 16 ottobre 2024. Si applica a soggetti essenziali e importanti di settori critici, con l'ACN come autorità e il CSIRT Italia per le notifiche. Impone misure di gestione del rischio, all'art. 24 con dieci elementi minimi, notifica degli incidenti significativi, preallarme in 24 ore, notifica in 72 e relazione finale entro un mese, responsabilità degli organi di amministrazione e sanzioni fino a 10 milioni o al 2% del fatturato.",
    },
    {
      q: "Come può la CTI aiutare un cliente a essere conforme alla NIS2?",
      a: "Rende l'analisi dei rischi basata sulle minacce reali del settore, dà priorità al patching con le vulnerabilità sfruttate attivamente, supporta la gestione degli incidenti e le notifiche con contesto e indicatori, monitora la catena di fornitura e misura l'efficacia delle misure con la copertura delle tecniche degli attori prioritari.",
    },
    {
      q: "Un cliente bancario: quale norma consideri oltre alla NIS2?",
      a: "DORA, il Regolamento UE 2022/2554, applicabile dal 17 gennaio 2025 e specifico per il settore finanziario: gestione del rischio ICT, notifica degli incidenti gravi, test di resilienza, inclusi i test basati sulla threat intelligence, e gestione del rischio dei fornitori ICT. Per i dati personali, il GDPR con la notifica in 72 ore.",
    },
  ],
  sources: [
    { title: "D.Lgs. 138/2024 (Normattiva)", url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138" },
    { title: "ACN — NIS2", url: "https://www.acn.gov.it/portale/nis" },
    { title: "Direttiva (UE) 2022/2555 (EUR-Lex)", url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj" },
    { title: "Regolamento DORA (EUR-Lex)", url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj" },
  ],
};
