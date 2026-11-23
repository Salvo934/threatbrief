import { analisi } from "./lessons/07-analisi";
import { attori } from "./lessons/06-attori";
import { ciclo } from "./lessons/02-ciclo";
import { colloquio } from "./lessons/12-colloquio";
import { fonti } from "./lessons/03-fonti";
import { framework } from "./lessons/04-framework";
import { ioc } from "./lessons/05-ioc";
import { mestiere } from "./lessons/01-mestiere";
import { normativa } from "./lessons/10-normativa";
import { ransomware } from "./lessons/09-ransomware";
import { scrittura } from "./lessons/08-scrittura";
import { strumenti } from "./lessons/11-strumenti";
import type { Lesson } from "./types";

/** Percorso in ordine: fondamenti → tecnica → metodo → contesto → colloquio. */
export const LESSONS: Lesson[] = [
  mestiere,
  ciclo,
  fonti,
  framework,
  ioc,
  attori,
  strumenti,
  analisi,
  scrittura,
  ransomware,
  normativa,
  colloquio,
];

export const GROUPS = ["Fondamenti", "Tecnica", "Metodo", "Contesto", "Colloquio"] as const;

export const getLesson = (slug: string) => LESSONS.find((l) => l.slug === slug);

export type Card = { id: string; lesson: string; lessonTitle: string; q: string; a: string };

/** Tutte le domande da colloquio, con id stabile per salvare i progressi. */
export const CARDS: Card[] = LESSONS.flatMap((l) =>
  l.interview.map((item, i) => ({ id: `${l.slug}#${i}`, lesson: l.slug, lessonTitle: l.title, ...item })),
);
