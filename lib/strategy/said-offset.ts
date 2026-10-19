// A milestone's day relative to the release, read by code in the words
// said (« une semaine après le titre » → J+7, « J-14 », « deux semaines
// avant la sortie », « le jour de la sortie » → J). Never a date and never
// guessed: words the code cannot read give null, and PO proposes no
// milestone (rule 6; docs/ARCHITECTURE.md § 6 bis « Lot 3 »). Also the kind
// of the milestone, from its name. Pure, client-safe.

const NUMBERS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  quinze: 15,
  vingt: 20,
  trente: 30,
};

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Days from the release, or null when the words do not say it. */
export function saidOffsetDays(...texts: string[]): number | null {
  for (const raw of texts) {
    const text = plain(raw);
    const j = /\bj\s*([+\-−])\s*(\d{1,3})\b/.exec(text);
    if (j) return (j[1] === "+" ? 1 : -1) * Number(j[2]);
    if (/\b(le )?jour (de la sortie|j)\b|\ble jour meme\b/.test(text)) return 0;
    if (/\bla veille\b/.test(text)) return -1;
    if (/\ble lendemain\b/.test(text)) return 1;
    const rel =
      /\b(\d{1,3}|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|quinze|vingt|trente)\s+(jours?|semaines?|mois)\s+(avant|apres)\b/.exec(
        text,
      );
    if (rel) {
      const n = /^\d+$/.test(rel[1]) ? Number(rel[1]) : NUMBERS[rel[1]];
      const unit = rel[2].startsWith("semaine")
        ? 7
        : rel[2] === "mois"
          ? 30
          : 1;
      const days = n * unit;
      if (days > 365) return null;
      return rel[3] === "avant" ? -days : days;
    }
  }
  return null;
}

/** milestones.kind from the milestone's words (Sortie, Annonce, Teaser…). */
export function saidMilestoneKind(label: string): string {
  const text = plain(label);
  if (/\bteaser/.test(text)) return "teaser";
  if (/\bannonce/.test(text)) return "announcement";
  if (/\b(live|showcase|concert)\b/.test(text)) return "live";
  if (/\b(presse|interview|media)/.test(text)) return "press";
  if (/\bsortie\b/.test(text)) return "release";
  return "other";
}
