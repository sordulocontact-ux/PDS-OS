// Where a link opens an income in Finance › Factures: the view that lists it
// in its state, its side sheet open (`?ouvrir=`). One rule for the ⌘K
// search, the Planning and every other link. Client-safe.
import { routes } from "@/lib/auth/redirects";
import type { IncomeState } from "@/lib/finance/money-in";

export function incomeHref(id: string, state: IncomeState): string {
  const view =
    state === "cancelled"
      ? "annulees"
      : state === "received"
        ? "encaissees"
        : state === "credited"
          ? null
          : state === "late"
            ? "retard"
            : "a-encaisser";
  return view
    ? `${routes.financeIncomes}?vue=${view}&ouvrir=${id}`
    : routes.financeIncomes;
}
