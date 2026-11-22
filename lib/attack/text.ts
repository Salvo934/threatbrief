/** Testo ATT&CK: rimuove (Citation: ...) e converte [testo](url) in testo semplice. */
export function cleanAttackText(md: string | null | undefined): string {
  if (!md) return "";
  return md
    .replace(/\(Citation:[^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<code>|<\/code>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ +([.,;:])/g, "$1")
    .trim();
}
