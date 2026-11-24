// The records a page's top band lets one switch between (Sacha 24/11/2026:
// « comme dans projet, le nom en haut, et on peut changer de
// budget / deal / contrat »). Client-safe.

export const SWITCHER_KINDS = [
  "budget",
  "deal",
  "contract",
  "contact",
  "list",
  "artist",
  "master",
  "demo",
  "selection",
] as const;
export type SwitcherKind = (typeof SWITCHER_KINDS)[number];

export type SwitcherItem = {
  id: string;
  label: string;
  // A second line (its artist, its type), or null.
  detail: string | null;
  href: string;
};
