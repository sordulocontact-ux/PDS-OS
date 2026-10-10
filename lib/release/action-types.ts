import type { ReleaseField } from "@/lib/release/schema";

/** Results of the release page server actions, shared with client components. */

export type SaveReleaseState =
  | { status: "idle" }
  // The values as saved (normalized): shown by the form whatever the page's
  // refresh brings back, so a saved field never looks emptied.
  | { status: "saved"; at: number; values: Record<ReleaseField, string> }
  | {
      status: "error";
      fieldErrors: Partial<Record<ReleaseField, true>>;
      formError: "isrcTaken" | "generic" | null;
      values: Record<ReleaseField, string>;
    };

export type CheckReleaseResult =
  | { ok: true; linkCount: number }
  | {
      ok: false;
      error: "no_isrc" | "not_found" | "detection_failed" | "generic";
    };
