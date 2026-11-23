import type { Block } from "../types";

/**
 * La realtà del lavoro: giornata e settimana tipo. Sono indicative (variano molto tra un team
 * interno, un MSSP e una società di consulenza) e lo dichiarano.
 */
export const REALITY: { title: string; blocks: Block[] }[] = [
  {
    title: "Prima di tutto: com'è davvero",
    blocks: [
      "Il lavoro dell'analista CTI, nella grande maggioranza dei giorni, **non** è inseguire hacker famosi né attribuire attacchi a uno stato. È fatto soprattutto di quattro cose:",
      {
        list: [
          "**Leggere e filtrare** molto materiale (advisory, report, notizie, feed) per trovare le poche cose che contano per i *tuoi* lettori.",
          "**Rispondere a richieste** di altri team o clienti: «questo indirizzo è malevolo?», «siamo esposti a questa vulnerabilità?», «chi è questo gruppo?».",
          "**Scrivere**: avvisi rapidi, risposte brevi, report periodici, profili. La scrittura è una parte grande del lavoro.",
          "**Collaborare**: con il SOC, l'incident response, il vulnerability management, il management o i clienti.",
        ],
      },
      { note: "Quello che segue è indicativo: cambia molto tra un team interno di un'azienda, un MSSP che serve molti clienti e una società di consulenza. Ma lo schema di fondo si ritrova quasi ovunque." },
    ],
  },
  {
    title: "Una giornata tipo",
    blocks: [
      {
        table: {
          head: ["Quando", "Cosa", "Esempio"],
          rows: [
            ["**Inizio giornata** (1–1,5 h)", "Triage delle fonti e dei feed", "Nuove voci nel catalogo KEV, advisory di CSIRT Italia e CISA, report dei vendor, rivendicazioni ransomware della notte"],
            ["**Mattina**", "Digest o briefing per il team", "5 righe: cosa è successo, cosa ci riguarda, cosa fare"],
            ["**Durante il giorno** (a ondate)", "Richieste in arrivo (RFI)", "Il SOC chiede un parere su un dominio; un cliente chiede se una notizia lo riguarda"],
            ["**Blocchi di lavoro profondo**", "Analisi e scrittura", "Profilo di un attore, report mensile, mappatura ATT&CK di una campagna"],
            ["**Riunioni**", "Allineamento", "Daily del SOC, call con un cliente, revisione di un report con il responsabile"],
            ["**Imprevisti** (più volte al mese)", "Avvisi urgenti", "Una vulnerabilità critica sfruttata su un prodotto che i clienti usano: si interrompe tutto per un flash alert"],
          ],
        },
      },
    ],
  },
  {
    title: "Una settimana (e un mese) tipo",
    blocks: [
      {
        list: [
          "**Ogni giorno**: triage, digest, richieste del SOC o dei clienti.",
          "**Ogni settimana**: report settimanale (minacce rilevanti, vulnerabilità da patchare, trend), aggiornamento degli indicatori, spesso un'analisi di phishing.",
          "**Più volte al mese**: flash alert su vulnerabilità sfruttate, rivendicazioni che toccano clienti o fornitori, profili su richiesta.",
          "**Ogni mese o trimestre**: report per il management (scenario, trend, metriche), revisione dei requisiti (PIR) con i lettori.",
          "**Raramente, ma con grande intensità**: supporto a un incidente vero. In quei giorni la CTI lavora a stretto contatto con l'incident response.",
        ],
      },
    ],
  },
  {
    title: "Cose che nessuno ti dice prima",
    blocks: [
      {
        list: [
          "Gran parte di ciò che leggi **non è rilevante**: saper scartare in fretta è una competenza, non pigrizia.",
          "**«Non lo sappiamo»** è una risposta legittima, se accompagnata da cosa servirebbe per saperlo.",
          "Le richieste arrivano spesso **vaghe** («siamo a rischio?»): metà del lavoro è capire la domanda vera.",
          "I tempi sono spesso **stretti**: un avviso utile tra 2 ore vale più di un report perfetto tra 3 giorni.",
          "Le attribuzioni certe sono **rare**; la maggior parte del valore sta nel dire cosa fare.",
          "I lettori **non leggono tutto**: la prima frase fa il lavoro, il resto è per chi vuole approfondire.",
          "Gli **errori** capitano (un IOC sbagliato, una valutazione troppo sicura): si correggono pubblicamente e in fretta, ed è questo che crea fiducia.",
        ],
      },
    ],
  },
];
