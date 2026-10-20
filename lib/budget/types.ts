// Budget lines and their totals. Client-safe, pure code: every amount shown
// is computed here from the lines, never by PO (CLAUDE.md, rule 6).

// Estimé → Proposé (a quote, not accepted) → Engagé (accepted) → Facturé
// → Payé (ticket Master § 9, MKT-S1-12 / 15). A proposed amount does not
// consume the envelope; the real spend is what was invoiced or paid.
export const BUDGET_STATUSES = [
  "planned",
  "proposed",
  "committed",
  "invoiced",
  "paid",
] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

// The team's real spending (MKT-S1-11), each with a definition and
// examples (fr.budget.families); « Autre » asks a precision.
export const BUDGET_FAMILIES = [
  "content_production",
  "advertising",
  "events",
  "services",
  "travel",
  "misc",
  "other",
] as const;
export type BudgetFamily = (typeof BUDGET_FAMILIES)[number];

export type BudgetLine = {
  id: string;
  label: string;
  amountCents: number;
  status: BudgetStatus;
  family: BudgetFamily | null;
  // What « Autre » is (required with it).
  familyDetail: string | null;
  leverId: string | null;
  leverLabel: string | null;
  // The deliverable it pays for (MKT-S1-12).
  deliverableId: string | null;
  deliverableTitle: string | null;
  // Its proof: a file of the project's library, opened by a signed link.
  attachment: { id: string; name: string; url: string | null } | null;
  note: string | null;
  // Follows an invoice (lib/invoices): its amount and state are the
  // invoice's, never typed; the amount agreed kept when the invoice changed it.
  invoiceId: string | null;
  committedCents: number | null;
};

export type BudgetLever = { id: string; label: string };
export type BudgetDeliverable = {
  id: string;
  title: string;
  // Null: « Hors levier » (proto, lot 3 of the Stratégie).
  leverId: string | null;
};

export type BudgetTotals = {
  plannedCents: number;
  // Quoted, not accepted yet: shown, never taken from the envelope.
  proposedCents: number;
  // Committed includes invoiced and paid: money the project is bound to spend.
  committedCents: number;
  invoicedCents: number;
  paidCents: number;
  // Every line, whatever its state: the forecast.
  forecastCents: number;
  // Invoiced or paid: the real spend.
  realCents: number;
  // Envelope minus committed; null without an envelope. Negative = overrun.
  remainingCents: number | null;
  // MKT-S1-12: a remainder for each kind, never one for all.
  remaining: {
    forecast: number | null;
    committed: number | null;
    real: number | null;
  };
};

export function isBudgetStatus(value: unknown): value is BudgetStatus {
  return (
    typeof value === "string" &&
    (BUDGET_STATUSES as readonly string[]).includes(value)
  );
}

export function isBudgetFamily(value: unknown): value is BudgetFamily {
  return (
    typeof value === "string" &&
    (BUDGET_FAMILIES as readonly string[]).includes(value)
  );
}

export function budgetTotals(
  lines: Pick<BudgetLine, "amountCents" | "status">[],
  envelopeCents: number | null,
): BudgetTotals {
  const sum = (statuses: BudgetStatus[]) =>
    lines
      .filter((l) => statuses.includes(l.status))
      .reduce((total, l) => total + l.amountCents, 0);
  const committedCents = sum(["committed", "invoiced", "paid"]);
  const forecastCents = sum([...BUDGET_STATUSES]);
  const realCents = sum(["invoiced", "paid"]);
  const rest = (spent: number) =>
    envelopeCents === null ? null : envelopeCents - spent;
  return {
    plannedCents: sum(["planned"]),
    proposedCents: sum(["proposed"]),
    committedCents,
    invoicedCents: sum(["invoiced"]),
    paidCents: sum(["paid"]),
    forecastCents,
    realCents,
    remainingCents: rest(committedCents),
    remaining: {
      forecast: rest(forecastCents),
      committed: rest(committedCents),
      real: rest(realCents),
    },
  };
}

// Words of a label that point at a family (MKT-S1-11): a suggestion the
// person sees with its reason and may refuse, never a silent choice.
const FAMILY_WORDS: Array<[BudgetFamily, RegExp]> = [
  [
    "advertising",
    /\b(campagne|pub\b|publicit|ads?\b|sponsor|boost|promo|playlist|presse|rp\b|influen)/,
  ],
  [
    "content_production",
    /\b(clip|tournage|video|photo|shooting|visuel|pochette|montage|teaser|contenu|motion|graphis)/,
  ],
  [
    "events",
    /\b(concert|showcase|evenement|soiree|release party|live|salle|festival|activation|pop.?up)/,
  ],
  [
    "travel",
    /\b(train|avion|vol|billet|transport|deplacement|hotel|hebergement|taxi|uber|essence|peage)/,
  ],
  [
    "services",
    /\b(prestat|freelance|mixage|mix|master|ingenieur|studio|avocat|comptab|graphiste|realisat|consultant)/,
  ],
  ["misc", /\b(frais|repas|fourniture|abonnement|logiciel|licence|divers)/],
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

// « 1 100 € HT »: the one formatter of an amount (lib/utils/money.ts), kept
// under this name for the modules that import it from the budget.
export { formatAmount as formatEuros } from "@/lib/utils/money";

// The amount as typed back into the form ("1500,5"), without currency sign.
export const centsToInput = (cents: number): string =>
  (cents / 100).toString().replace(".", ",");
