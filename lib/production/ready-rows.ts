// A line of the synthesis before the shoot (proto synthesis): what, its
// value as read, ready or not, and its severity (recette 23/10, MKT-PROD-002).
// Client-safe.

import type { Json } from "@/lib/supabase/database.types";

export type ReadyRow = {
  key: string;
  label: string;
  value: string;
  ok: boolean;
  // Not ready, a critical line asks the direction and a catch-up plan; a
  // minor one only a reason. Decided from the key, as in SQL
  // (`production_ready_critical`).
  critical: boolean;
};

// The same list as `production_ready_critical` (20261026300101).
const CRITICAL = new Set([
  "place",
  "date",
  "crew",
  "plan",
  "quote",
  "direction",
  "blockers",
]);

export const isCriticalReadyKey = (key: string) => CRITICAL.has(key);

// What reopened a confirmed preparation (MKT-PROD-001).
export const READY_CHANGES = ["place", "date", "quote", "direction"] as const;
export type ReadyChange = (typeof READY_CHANGES)[number];

// A line of the catch-up plan of a derogation: who, before when.
export type ReadyPlanLine = {
  key: string;
  label: string;
  personId: string;
  dueOn: string;
};

/** The frozen synthesis read back from the sheet (never trusted blindly). */
export function readyRowsOf(json: Json | null): ReadyRow[] | null {
  if (!Array.isArray(json)) return null;
  return json.flatMap((r) => {
    if (
      !r ||
      typeof r !== "object" ||
      Array.isArray(r) ||
      typeof r.label !== "string" ||
      typeof r.value !== "string"
    )
      return [];
    const key = typeof r.key === "string" ? r.key : r.label;
    return [
      {
        key,
        label: r.label,
        value: r.value,
        ok: r.ok === true,
        critical: isCriticalReadyKey(key),
      },
    ];
  });
}

/** The catch-up plan read back from the sheet. */
export function readyPlanOf(json: Json | null): ReadyPlanLine[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((l) =>
    l &&
    typeof l === "object" &&
    !Array.isArray(l) &&
    typeof l.key === "string" &&
    typeof l.personId === "string" &&
    typeof l.dueOn === "string"
      ? [
          {
            key: l.key,
            label: typeof l.label === "string" ? l.label : l.key,
            personId: l.personId,
            dueOn: l.dueOn,
          },
        ]
      : [],
  );
}

/** What reopened the preparation, known values only. */
export function readyChangesOf(values: string[] | null): ReadyChange[] {
  return (values ?? []).filter((v): v is ReadyChange =>
    (READY_CHANGES as readonly string[]).includes(v),
  );
}
