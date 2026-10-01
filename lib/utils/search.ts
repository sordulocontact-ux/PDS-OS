/**
 * Text as an instant search compares it: case, accents and separators (spaces,
 * dashes) do not matter ("fr-xxx" finds "FRXXX…", "eleve" finds "Élève").
 */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "");
}
