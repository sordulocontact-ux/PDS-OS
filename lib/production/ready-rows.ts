// A line of the synthesis before the shoot (proto synthesis): what, its
// value as read, ready or not. Client-safe.

import type { Json } from "@/lib/supabase/database.types";

export type ReadyRow = {
  key: string;
  label: string;
  value: string;
  ok: boolean;
};

/** The frozen synthesis read back from the sheet (never trusted blindly). */
export function readyRowsOf(json: Json | null): ReadyRow[] | null {
  if (!Array.isArray(json)) return null;
  return json.flatMap((r) =>
    r &&
    typeof r === "object" &&
    !Array.isArray(r) &&
    typeof r.label === "string" &&
    typeof r.value === "string"
      ? [
          {
            key: typeof r.key === "string" ? r.key : r.label,
            label: r.label,
            value: r.value,
            ok: r.ok === true,
          },
        ]
      : [],
  );
}
