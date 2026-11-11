// What a spend's label suggests: its poste and the lever or deliverable it
// names (MKT-S1-11, MKT-S1-15). Client-safe, pure code.

import type { BudgetFamily } from "@/lib/budget/types";

// Words of a label that point at a family (MKT-S1-11): a suggestion the
// person sees with its reason and may refuse, never a silent choice.
// What is paid before what it is for: « Train pour le showcase » is a
// Transport, « Uber Eats » a meal delivery before a ride, « Repas de session
// studio » a meal; then what is made (the look and the shoot before the
// content they serve), who is paid, what makes known.
const FAMILY_WORDS: Array<[BudgetFamily, RegExp]> = [
  ["food_delivery", /\b(uber ?eats|deliveroo|just ?eat|livraison de repas)/],
  ["per_diem", /\b(per ?diem|indemnite)/],
  ["lodging", /\b(hotel|hebergement|airbnb|logement)/],
  [
    "transport",
    /\b(train|avion|vol\b|billet|transport|deplacement|taxi|uber|vtc|essence|peage)/,
  ],
  [
    "food",
    /\b(repas|restau|dejeuner|diner|traiteur|catering|grec|kebab|pizza|burger|sushi|sandwich)/,
  ],
  ["image", /\b(stylis|tenue|coiff|maquill|habill)/],
  ["photo_video", /\b(photo|shooting|tournage|video|reels?\b|tiktok)/],
  [
    "content_production",
    /\b(clip|visuel|pochette|montage|teaser|contenu|motion|graphis)/,
  ],
  [
    "services",
    /\b(prestat|freelance|mixage|mix\b|master|ingenieur|inge son|avocat|comptab|graphiste|realisat|consultant)/,
  ],
  ["studio", /\b(studio)/],
  ["coaching", /\b(coach|media training)/],
  ["equipment", /\b(materiel|instrument|micro\b|location de|enceinte|casque)/],
  [
    "advertising",
    /\b(campagne|pub\b|publicit|ads?\b|sponsor|boost|promo|playlist|presse|rp\b|influen)/,
  ],
  [
    "events",
    /\b(concert|showcase|evenement|soiree|release party|live|salle|festival|activation|pop.?up)/,
  ],
  ["misc", /\b(frais|fourniture|abonnement|logiciel|licence|divers)/],
];

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** The family a label suggests, with the word that suggests it; null when
 * nothing does. */
export function suggestBudgetFamily(
  label: string,
): { family: BudgetFamily; word: string } | null {
  const text = fold(label);
  for (const [family, pattern] of FAMILY_WORDS) {
    const match = pattern.exec(text);
    if (match) return { family, word: match[1] };
  }
  return null;
}

// The lever or deliverable a label names (MKT-S1-15): the one sharing the
// most significant words with it, if any.
export function suggestBudgetLink<T extends { id: string; label: string }>(
  label: string,
  candidates: T[],
): T | null {
  const words = (text: string) =>
    new Set(
      fold(text)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4),
    );
  const mine = words(label);
  let best: { item: T; score: number } | null = null;
  for (const item of candidates) {
    const score = [...words(item.label)].filter((w) => mine.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item ?? null;
}
