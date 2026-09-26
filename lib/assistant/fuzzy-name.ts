// Finds a catalog name from a mangled one: a dictated or misspelled artist
// or master name ("untrill" → "Huntrill"). Pure code, no model: the list is
// what the user can see, and a name is picked only when it clearly stands
// out; otherwise nothing is picked, never a guess between two close names.

export const foldName = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** How a name sounds, roughly, in French and English: silent h, doubled letters… */
export function soundKey(text: string): string {
  return foldName(text)
    .replace(/&/g, "et")
    .replace(/ph/g, "f")
    .replace(/qu|ck|c(?=[aou])|q/g, "k")
    .replace(/c/g, "s")
    .replace(/y/g, "i")
    .replace(/z/g, "s")
    .replace(/w/g, "v")
    .replace(/h/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(.)\1+/g, "$1");
}

function trigrams(key: string): Set<string> {
  const padded = `  ${key} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1)
    grams.add(padded.slice(i, i + 3));
  return grams;
}

/** 0 → nothing in common, 1 → same sound. */
export function nameSimilarity(a: string, b: string): number {
  const ka = soundKey(a);
  const kb = soundKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  // One name inside the other ("nono" in "nono la grinta").
  if (ka.length >= 3 && kb.length >= 3 && (ka.includes(kb) || kb.includes(ka)))
    return 0.9;
  const ga = trigrams(ka);
  const gb = trigrams(kb);
  let common = 0;
  for (const g of ga) if (gb.has(g)) common += 1;
  return common / (ga.size + gb.size - common);
}

// A candidate must be this close, and ahead of the next one by the margin.
const MIN_SIMILARITY = 0.4;
const MARGIN = 0.12;

/** Items that sound like `name`, closest first. */
export function rankByName<T>(
  items: readonly T[],
  name: string,
  key: (item: T) => string,
): Array<{ item: T; score: number }> {
  return items
    .map((item) => ({ item, score: nameSimilarity(name, key(item)) }))
    .filter((r) => r.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);
}

/** The one item `name` designates, spelled right or not; null when unclear. */
export function matchByName<T>(
  items: readonly T[],
  name: string,
  key: (item: T) => string,
): T | null {
  const wanted = foldName(name);
  if (!wanted) return null;
  const exact = items.filter((item) => foldName(key(item)) === wanted);
  if (exact.length > 0) return exact.length === 1 ? exact[0] : null;
  const [best, next] = rankByName(items, name, key);
  if (!best) return null;
  if (next && best.score - next.score < MARGIN) return null;
  return best.item;
}
