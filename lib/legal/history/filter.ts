// The person and period filters of the Historique du Juridique (JUR-29),
// read from the URL (?branche=, ?par=, ?mois=YYYY-MM, Paris time). Only the
// people and months the history holds are offered. Pure, client-safe.

import { parisDay } from "@/lib/project-history/format";
import type { HistoryBranch, LegalEvent } from "@/lib/legal/history/types";

export type HistoryFilter = {
  branch: HistoryBranch | null;
  person: string | null;
  month: string | null;
};

const monthOf = (e: LegalEvent) => parisDay(e.at).slice(0, 7);

export const filterHistory = (events: LegalEvent[], f: HistoryFilter) =>
  events.filter(
    (e) =>
      (!f.branch || e.branch === f.branch) &&
      (!f.person || e.by === f.person) &&
      (!f.month || monthOf(e) === f.month),
  );

/** The people who acted, by name order. */
export const historyPeople = (events: LegalEvent[]) =>
  [...new Set(events.flatMap((e) => (e.by ? [e.by] : [])))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );

/** The months with events, newest first. */
export const historyMonths = (events: LegalEvent[]) =>
  [...new Set(events.map(monthOf))].sort().reverse();

const monthName = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
/** « octobre 2026 ». */
export const formatMonth = (month: string) =>
  monthName.format(new Date(`${month}-15T12:00:00Z`));

export const isMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
