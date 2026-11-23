import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLOSSARY } from "@/lib/academy/glossary";
import { CARDS, GROUPS, LESSONS } from "@/lib/academy";

/** Rotte esistenti nell'app (da app/), per controllare i link "Prova nell'app". */
function routes(dir = "app", base = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    const seg = `${base}/${name}`;
    if (readdirSync(full).some((f) => /^(page|route)\.tsx?$/.test(f))) out.push(seg);
    out.push(...routes(full, seg));
  }
  return out;
}
const ROUTES = ["/", ...routes()];
const matches = (path: string) =>
  ROUTES.some((r) => new RegExp(`^${r.replace(/\[[^/]+\]/g, "[^/]+")}$`).test(path));

describe("Accademia", () => {
  it("ha lezioni con slug unici, gruppi validi e contenuti completi", () => {
    expect(new Set(LESSONS.map((l) => l.slug)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      expect(GROUPS).toContain(l.group);
      expect(l.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(l.goals.length).toBeGreaterThanOrEqual(2);
      expect(l.sections.length).toBeGreaterThanOrEqual(2);
      expect(l.interview.length).toBeGreaterThanOrEqual(3);
      expect(l.practice.length).toBeGreaterThanOrEqual(1);
      for (const s of l.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("i link «Prova nell'app» puntano a pagine esistenti", () => {
    for (const l of LESSONS) {
      for (const p of l.practice) {
        const path = p.href.split("?")[0];
        expect(matches(path), `${l.slug}: ${p.href}`).toBe(true);
      }
    }
  });

  it("le schede hanno id unici e il glossario rimanda a lezioni esistenti", () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    const slugs = new Set(LESSONS.map((l) => l.slug));
    for (const g of GLOSSARY) if (g.lesson) expect(slugs.has(g.lesson), g.term).toBe(true);
  });
});
