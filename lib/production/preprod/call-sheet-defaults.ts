// What the call sheet's own sections start from (PROD-003): the run of show
// and the constraints written in the shoot brief, the sequences listed by the
// Fiche Livrable. Only for a section still empty, with its source; never
// invented. Client-safe.

import type { ProductionBrief } from "@/lib/production/brief";
import type { HandedFiche } from "@/lib/production/fiche";
import {
  CALL_SHEET_LIMITS,
  type CallSheet,
  type CallSheetField,
} from "@/lib/production/preprod/types";

export type CallSheetSource = "brief" | "fiche";
export type CallSheetDefaults = Partial<
  Record<CallSheetField, { value: string; source: CallSheetSource }>
>;

export function callSheetDefaults(
  callSheet: CallSheet | null,
  brief: ProductionBrief,
  fiche: HandedFiche | null,
): CallSheetDefaults {
  const out: CallSheetDefaults = {};
  const offer = (
    key: CallSheetField,
    value: string | null | undefined,
    source: CallSheetSource,
  ) => {
    const text = value?.trim();
    if (!text || callSheet?.[key]?.trim()) return;
    out[key] = { value: text.slice(0, CALL_SHEET_LIMITS[key]), source };
  };
  offer("schedule", brief.runOfShow, "brief");
  offer(
    "sequences",
    fiche?.items.map((i) => `${i.number}. ${i.title}`).join("\n"),
    "fiche",
  );
  if (brief.constraintsNote?.trim())
    offer("instructions", brief.constraintsNote, "brief");
  else offer("instructions", fiche?.constraints, "fiche");
  return out;
}
