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
