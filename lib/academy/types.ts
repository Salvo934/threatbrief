/** Blocchi di contenuto di una lezione. Testo con **grassetto** e `codice` inline. */
export type Block =
  | string
  | { list: string[]; ordered?: boolean }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string; tone?: "info" | "warn" };

export type Lesson = {
  slug: string;
  group: "Fondamenti" | "Metodo" | "Tecnica" | "Contesto" | "Colloquio";
  title: string;
  summary: string;
  minutes: number;
  goals: string[];
  sections: { title: string; blocks: Block[] }[];
  /** Pagine di ThreatBrief dove mettere in pratica la lezione. */
  practice: { label: string; href: string; task: string }[];
  exercise: string;
  pitfalls: string[];
  /** Domande da colloquio con risposta modello (sintetica, da dire a voce). */
  interview: { q: string; a: string }[];
  /** Letture consigliate (fonti primarie, gratuite dove possibile). */
  sources: { title: string; url: string }[];
};

/** Caso pratico «sul campo»: una situazione ricorrente del lavoro, passo per passo. */
export type FieldCase = {
  slug: string;
  title: string;
  frequency: "Ogni giorno" | "Ogni settimana" | "Più volte al mese" | "Raro, ma capita";
  requester: string;
  summary: string;
  /** La situazione di partenza, raccontata come succede di solito. */
  scenario: Block[];
  /** Evento reale e pubblico che mostra lo stesso schema (facoltativo). */
  realExample?: { title: string; text: string; url: string };
  steps: { when: string; title: string; detail: string }[];
  /** Esempio del prodotto da consegnare (simulato, con dati di esempio). */
  deliverable: { title: string; text: string };
  tools: string[];
  inApp: { label: string; href: string; task: string }[];
  pitfalls: string[];
  interview: { q: string; a: string }[];
};
