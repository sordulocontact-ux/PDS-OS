import type { ReleaseField } from "@/lib/release/schema";

/** Results of the release page server actions, shared with client components. */

export type SaveReleaseState =
  | { status: "idle" }
  | { status: "saved"; at: number }
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
