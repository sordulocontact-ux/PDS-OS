import { daysBetween } from "@/lib/utils/calendar-period";

/**
 * An awaited due day within this many days is « near »: said in words and in
 * orange (docs/STYLE-FINANCE-PARTOUT.md § 6.3). Past it, the plain short date.
 */
export const DUE_SOON_DAYS = 7;

export type DueGap =
  | { kind: "late"; days: number }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "soon"; days: number }
  | { kind: "far" };

/** Where a due day stands against today ("YYYY-MM-DD" both, Paris). Pure code. */
export function dueGap(dueOn: string, today: string): DueGap {
  const days = daysBetween(today, dueOn);
  if (days < 0) return { kind: "late", days: -days };
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  if (days <= DUE_SOON_DAYS) return { kind: "soon", days };
  return { kind: "far" };
}
