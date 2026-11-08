// « Budget » of a signed artist (retour de Sacha du 07/11/2026): the spends
// of no release in particular. Client-safe, pure code: every total shown is
// computed here from the rows, never by PO (CLAUDE.md, rule 6).

export const ARTIST_EXPENSE_CATEGORIES = [
  "transport",
  "food",
  "lodging",
  "studio",
  "marketing",
  "other",
] as const;
export type ArtistExpenseCategory = (typeof ARTIST_EXPENSE_CATEGORIES)[number];

// Prévue (to come) or Payée: an artist's spend is mostly typed once paid.
export const ARTIST_EXPENSE_STATUSES = ["planned", "paid"] as const;
export type ArtistExpenseStatus = (typeof ARTIST_EXPENSE_STATUSES)[number];

export type ArtistExpense = {
  id: string;
  label: string;
  amountCents: number;
  category: ArtistExpenseCategory;
  // What « Autre » is (required with it).
  categoryDetail: string | null;
  // YYYY-MM-DD.
  spentOn: string;
  status: ArtistExpenseStatus;
  note: string | null;
};

/** One project of the artist whose budget the viewer may read. */
export type ArtistProjectSpend = {
  projectId: string;
  title: string;
  // Engagé, facturé or payé: what the project owes (lib/budget).
  committedCents: number;
};

export type ArtistBudgetTotals = {
  paidCents: number;
  plannedCents: number;
  projectsCents: number;
  // What is spent or owed: the artist's paid spends and the projects' engaged.
  totalCents: number;
};

export function isArtistExpenseCategory(
  value: unknown,
): value is ArtistExpenseCategory {
  return (
    typeof value === "string" &&
    (ARTIST_EXPENSE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isArtistExpenseStatus(
  value: unknown,
): value is ArtistExpenseStatus {
  return (
    typeof value === "string" &&
    (ARTIST_EXPENSE_STATUSES as readonly string[]).includes(value)
  );
}

export function artistBudgetTotals(
  expenses: Pick<ArtistExpense, "amountCents" | "status">[],
  projects: Pick<ArtistProjectSpend, "committedCents">[],
): ArtistBudgetTotals {
  const sum = (status: ArtistExpenseStatus) =>
    expenses
      .filter((e) => e.status === status)
      .reduce((total, e) => total + e.amountCents, 0);
  const paidCents = sum("paid");
  const projectsCents = projects.reduce((t, p) => t + p.committedCents, 0);
  return {
    paidCents,
    plannedCents: sum("planned"),
    projectsCents,
    totalCents: paidCents + projectsCents,
  };
}
