/**
 * Recupera gli oggetti completi dell'array `key` da un JSON troncato (es. risposta
 * interrotta dal server). Restituisce null se non trova l'array.
 */
export function salvageJsonArray<T>(text: string, key: string): T[] | null {
  const start = text.search(new RegExp(`"${key}"\\s*:\\s*\\[`));
  if (start < 0) return null;
  const out: T[] = [];
  let depth = 0;
  let inString = false;
  let objStart = -1;
  for (let i = text.indexOf("[", start) + 1; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try {
          out.push(JSON.parse(text.slice(objStart, i + 1)) as T);
        } catch {
          return out;
        }
        objStart = -1;
      }
    } else if (c === "]" && depth === 0) break;
  }
  return out;
}
