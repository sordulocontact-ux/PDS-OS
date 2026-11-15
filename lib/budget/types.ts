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

// The « Poste » of a line: the team's real spending (MKT-S1-11) and, since
// the retour du 09/11/2026, the finer kinds the artist's Budget had
// (transport, restauration, livraison de repas, per diem…), in one list,
// grouped: what is made, what makes known, who is paid, the trips, the
// meals, the rest. Each with a definition and examples
// (fr.budget.familyHints); « Autre » asks a precision. Named « family » in
// the code and the database (server functions write 'services').
export const BUDGET_FAMILIES = [
  "content_production",
  "photo_video",
  "image",
  "advertising",
  "events",
  "studio",
  "services",
  "coaching",
  "equipment",
  "transport",
  "lodging",
  "per_diem",
  "food",
  "food_delivery",
  "misc",
  "other",
] as const;
export type BudgetFamily = (typeof BUDGET_FAMILIES)[number];

/** What a spend belongs to (BUD 1): a project or an artist, never both;
 * since Ibé's ticket « Cockpit Finance » (lot 3, 13/11/2026) also a cost
 * center of the Finance, or none at all (« hors budget », id ""). */
export type BudgetTargetKind =
  "project" | "artist" | "cost_center" | "off_budget";
export type BudgetTarget = { kind: BudgetTargetKind; id: string };

/** A spend's money out: its HT plus its VAT when known (SQL
 * budget_line_ttc). */
export const budgetLineTtcCents = (cents: number, vatBp: number | null) =>
  Math.round((cents * (10000 + (vatBp ?? 0))) / 10000);

/** A target the Finance keeps (its proof in finance-files, its spends
 * written by manage_finance). */
export const isFinanceTarget = (target: Pick<BudgetTarget, "kind">) =>
  target.kind === "cost_center" || target.kind === "off_budget";

/** A target offered to a quick spend (BUD 4): its name, and whether the
 * reader spent on it lately (those lead the list). */
export type ExpenseTarget = BudgetTarget & { label: string; recent?: boolean };

export type BudgetLine = {
  id: string;
  target: BudgetTarget;
  // Its title or name, when the reader sees it (null otherwise).
  targetLabel: string | null;
  label: string;
  // The day the money was spent (« AAAA-MM-JJ »): what an artist's envelope
  // period reads.
  spentOn: string;
  // Who entered it.
  authorName: string | null;
  amountCents: number;
  status: BudgetStatus;
  family: BudgetFamily | null;
  // What « Autre » is (required with it).
  familyDetail: string | null;
  // « Sous-poste » (Finance, lot 4): a finer kind under the poste.
  subpost: string | null;
  leverId: string | null;
  leverLabel: string | null;
  // The deliverable it pays for (MKT-S1-12).
  deliverableId: string | null;
  deliverableTitle: string | null;
  // Its proof: a file of the project's library, or the receipt kept in the
  // artist's, opened by a signed link.
  attachment: { id: string; name: string; url: string | null } | null;
  note: string | null;
  // Follows an invoice (lib/invoices): its amount and state are the
  // invoice's, never typed; the amount agreed kept when the invoice changed it.
  invoiceId: string | null;
  committedCents: number | null;
  // Lot 3 of the Finance: VAT (basis points, null when not given; the
  // amount stays HT), supplier (a contact or a name), due day, rebillable,
  // validator (a member).
  vatBp: number | null;
  supplierContactId: string | null;
  supplierName: string | null;
  dueOn: string | null;
  rebillable: boolean;
  validatorId: string | null;
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

/**
 * A real spend (invoiced or paid) with no proof: signalled and filtered
 * (BUD 1). A line that follows an invoice has it there; an estimate needs
 * none yet.
 */
export function lacksProof(
  line: Pick<BudgetLine, "status" | "attachment" | "invoiceId">,
): boolean {
  return (
    (line.status === "invoiced" || line.status === "paid") &&
    !line.attachment &&
    !line.invoiceId
  );
}

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

/** What one poste adds up to (« Par poste », retour du 09/11/2026). */
export type BudgetFamilyTotal = {
  // Null: the lines with no poste chosen.
  family: BudgetFamily | null;
  count: number;
  // Every line, whatever its state: the forecast of the poste.
  totalCents: number;
  // Of which not engaged yet (estimated or quoted).
  pendingCents: number;
};

/** The postes the project's lines use, the costliest first, the lines
 * without one last; computed by code, never by PO. */
export function budgetFamilyTotals(
  lines: Pick<BudgetLine, "amountCents" | "status" | "family">[],
): BudgetFamilyTotal[] {
  const totals = new Map<BudgetFamily | null, BudgetFamilyTotal>();
  for (const line of lines) {
    const row = totals.get(line.family) ?? {
      family: line.family,
      count: 0,
      totalCents: 0,
      pendingCents: 0,
    };
    row.count += 1;
    row.totalCents += line.amountCents;
    if (line.status === "planned" || line.status === "proposed")
      row.pendingCents += line.amountCents;
    totals.set(line.family, row);
  }
  const order = (family: BudgetFamily | null) =>
    family === null ? BUDGET_FAMILIES.length : BUDGET_FAMILIES.indexOf(family);
  return [...totals.values()].sort(
    (a, b) =>
      Number(a.family === null) - Number(b.family === null) ||
      b.totalCents - a.totalCents ||
      order(a.family) - order(b.family),
  );
}

// The poste and the lever a label suggests (lib/budget/suggest.ts), kept
// importable from here for the modules that already do.
export { suggestBudgetFamily, suggestBudgetLink } from "@/lib/budget/suggest";

// « 1 100 € HT »: the one formatter of an amount (lib/utils/money.ts), kept
// under this name for the modules that import it from the budget.
export { formatAmount as formatEuros } from "@/lib/utils/money";

// The amount as typed back into the form ("1500,5"), without currency sign.
export const centsToInput = (cents: number): string =>
  (cents / 100).toString().replace(".", ",");
