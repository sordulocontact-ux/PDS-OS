// What the bulletin's rubrique D does to the DEP and DR (JUR-23,
// docs/ARCHITECTURE.md § 8 sexies, « DEP / DR »): Phono, DEP and DR are
// three different things, never added together. The DEP and DR are first
// shared between categories by a versioned rule, then inside each category
// equally (rubrique D empty) or as the Phono shares (rubrique D ticked);
// ticking D never changes the fractions between categories. Computed by the
// code, in exact units (lib/legal/splits/shares.ts), shown for a person to
// confirm. Pure, client-safe.
//
// Source of rule V1: the notice of the bulletin 725 (édition 02/2026) as the
// ticket JUR-23 quotes it — DEP « répartition réglementaire par catégories
// (auteurs, compositeurs, éditeurs), puis partage égal au sein de chaque
// catégorie »; DR « règlement général, partage égal au sein de chaque
// catégorie ». The fractions are the usual ones of the Règlement général for
// an edited work (DEP a third each, DR half to the publishers) and stay to
// confirm by the legal referent before production (ticket: « Les règles
// exactes doivent être confirmées »). Arrangers and adapters take their
// share from the authors or composers by rules V1 does not hold: said, never
// computed.

import { FULL, unitsOf } from "@/lib/legal/splits/shares";

export type Category = "author" | "composer" | "publisher";
type Fractions = Partial<Record<Category, [number, number]>>;

export type SharingRule = {
  id: string;
  // Where it comes from, said under the preview.
  source: string;
  dep: { edited: Fractions; unedited: Fractions };
  dr: { edited: Fractions; unedited: Fractions };
};

export const SHARING_RULES: Record<string, SharingRule> = {
  SACEM_725_V1: {
    id: "SACEM_725_V1",
    source: "Notice du bulletin 725 (édition 02/2026), règle V1 à confirmer",
    dep: {
      edited: { author: [1, 3], composer: [1, 3], publisher: [1, 3] },
      unedited: { author: [1, 2], composer: [1, 2] },
    },
    dr: {
      edited: { author: [1, 4], composer: [1, 4], publisher: [1, 2] },
      unedited: { author: [1, 2], composer: [1, 2] },
    },
  },
};

/** The rule a new dossier is computed with; a saved one keeps its own. */
export const CURRENT_SHARING_RULE = "SACEM_725_V1";

export type SharingPerson = {
  name: string;
  // author, composer, arranger, adapter, or publisher.
  quality: string;
  phono: string;
};

export type SharingLine = {
  name: string;
  quality: string;
  phono: number | null;
  // Null: not computed by this rule (arranger, adapter).
  dep: number | null;
  dr: number | null;
};

export type SharingAlert =
  | { kind: "phono_total"; total: number }
  | { kind: "empty_category"; category: Category }
  | { kind: "not_covered"; name: string; quality: string }
  | { kind: "unknown_rule"; rule: string };

export type SharingPreview = {
  rule: SharingRule | null;
  lines: SharingLine[];
  alerts: SharingAlert[];
};

/**
 * `total` shared by `weights` exactly: floors, then the remainders to the
 * largest fractions (ties to the first), so the parts always sum to total.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const parts = raw.map(Math.floor);
  let rest = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i]++;
    rest--;
  }
  return parts;
}

const categoryOf = (quality: string): Category | null =>
  quality === "author" || quality === "composer" || quality === "publisher"
    ? quality
    : null;

function shareOut(
  fractions: Fractions,
  people: SharingPerson[],
  followPhono: boolean,
): Array<number | null> {
  const cats = Object.keys(fractions) as Category[];
  const catTotals = allocate(
    FULL,
    cats.map((c) => fractions[c]![0] / fractions[c]![1]),
  );
  const result: Array<number | null> = people.map(() => null);
  cats.forEach((cat, k) => {
    const members = people
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => categoryOf(p.quality) === cat);
    if (members.length === 0) return;
    const phono = members.map(({ p }) => unitsOf(p.phono) ?? 0);
    const weights =
      followPhono && phono.some((u) => u > 0) ? phono : members.map(() => 1);
    allocate(catTotals[k], weights).forEach((units, j) => {
      result[members[j].i] = units;
    });
  });
  return result;
}

/**
 * The DEP and DR each line receives under `ruleId`, with rubrique D ticked
 * or not, and what keeps the preview from being complete.
 */
export function sharingPreview(input: {
  creators: SharingPerson[];
  publishers: Array<Omit<SharingPerson, "quality">>;
  followPhono: boolean;
  ruleId: string;
}): SharingPreview {
  const rule = SHARING_RULES[input.ruleId] ?? null;
  const people: SharingPerson[] = [
    ...input.creators,
    ...input.publishers.map((p) => ({ ...p, quality: "publisher" })),
  ];
  const alerts: SharingAlert[] = [];
  const phono = people.map((p) => unitsOf(p.phono));
  const total = phono.reduce<number>((s, u) => s + (u ?? 0), 0);
  if (total !== FULL) alerts.push({ kind: "phono_total", total });
  if (!rule) {
    alerts.push({ kind: "unknown_rule", rule: input.ruleId });
    return {
      rule,
      alerts,
      lines: people.map((p, i) => ({
        name: p.name,
        quality: p.quality,
        phono: phono[i],
        dep: null,
        dr: null,
      })),
    };
  }
  const edited = input.publishers.length > 0;
  const fractions = {
    dep: edited ? rule.dep.edited : rule.dep.unedited,
    dr: edited ? rule.dr.edited : rule.dr.unedited,
  };
  for (const cat of Object.keys(fractions.dep) as Category[])
    if (!people.some((p) => categoryOf(p.quality) === cat))
      alerts.push({ kind: "empty_category", category: cat });
  for (const p of people)
    if (!categoryOf(p.quality))
      alerts.push({ kind: "not_covered", name: p.name, quality: p.quality });
  const dep = shareOut(fractions.dep, people, input.followPhono);
  const dr = shareOut(fractions.dr, people, input.followPhono);
  return {
    rule,
    alerts,
    lines: people.map((p, i) => ({
      name: p.name,
      quality: p.quality,
      phono: phono[i],
      dep: dep[i],
      dr: dr[i],
    })),
  };
}
