// « Budget » of a signed artist (retour de Sacha du 07/11/2026): the spends
// of no release in particular. Client-safe, pure code: every total shown is
// computed here from the rows, never by PO (CLAUDE.md, rule 6).

// In the order the form lists them (migration 20261108140101: Uber Eats
// apart from the restaurant, as Sacha named them on 08/11/2026).
export const ARTIST_EXPENSE_CATEGORIES = [
  "transport",
  "lodging",
  "food",
  "food_delivery",
  "per_diem",
  "studio",
  "equipment",
  "coaching",
  "image",
  "photo_video",
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

/** What one kind of spend adds up to (« Par poste »). */
export type ArtistCategoryTotal = {
  category: ArtistExpenseCategory;
  count: number;
  // Paid and planned together; the planned part said apart.
  totalCents: number;
  plannedCents: number;
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

/** The kinds of spend the artist has, the costliest first. */
export function artistCategoryTotals(
  expenses: Pick<ArtistExpense, "amountCents" | "category" | "status">[],
): ArtistCategoryTotal[] {
  const totals = new Map<ArtistExpenseCategory, ArtistCategoryTotal>();
  for (const e of expenses) {
    const row = totals.get(e.category) ?? {
      category: e.category,
      count: 0,
      totalCents: 0,
      plannedCents: 0,
    };
    row.count += 1;
    row.totalCents += e.amountCents;
    if (e.status === "planned") row.plannedCents += e.amountCents;
    totals.set(e.category, row);
  }
  return [...totals.values()].sort(
    (a, b) =>
      b.totalCents - a.totalCents ||
      ARTIST_EXPENSE_CATEGORIES.indexOf(a.category) -
        ARTIST_EXPENSE_CATEGORIES.indexOf(b.category),
  );
}
