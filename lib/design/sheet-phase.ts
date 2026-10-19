// Where a Fiche Livrable stands, as the proto names it (FSTATE, ficheCard):
// Brouillon, En attente de validation, Modifications demandées, Refusée,
// Validée · Prête pour Production, Transférée — and its version. Computed
// from its submissions and transfers (rule 6), never stored. Client-safe.

import type { Tone } from "@/lib/ui/state-tones";

export type SheetPhase =
  "draft" | "submitted" | "changes" | "refused" | "approved" | "transferred";

export const SHEET_PHASE_TONE: Record<SheetPhase, Tone> = {
  draft: "neutral",
  submitted: "info",
  changes: "warning",
  refused: "danger",
  approved: "success",
  transferred: "success",
};

export type SheetPhaseInput = {
  // Submissions, newest first, withdrawn ones left out.
  submissions: Array<{
    number: number;
    status: "pending" | "approved" | "changes_requested" | "rejected";
    // When it was decided (closed_at), else submitted.
    at: string;
  }>;
  // Version numbers handed to Production, newest first.
  handed: number[];
  // The sheet changed (a field, an element) after its latest decision, or
  // « Modifier (nouvelle version) » was used.
  reopenedSince: (at: string) => boolean;
};

export type SheetPhaseView = {
  phase: SheetPhase;
  // The version shown (« Validation : … · V2 »).
  version: number;
  // The latest version handed to Production, if any.
  transferred: number | null;
  // The responsible may change it now (Brouillon, Modifications demandées).
  editable: boolean;
};

export function sheetPhase(i: SheetPhaseInput): SheetPhaseView {
  const latest = i.submissions[0] ?? null;
  const transferred = i.handed[0] ?? null;
  if (!latest)
    return { phase: "draft", version: 1, transferred, editable: true };
  const view = (phase: SheetPhase, version = latest.number) => ({
    phase,
    version,
    transferred,
    editable: phase === "draft" || phase === "changes" || phase === "refused",
  });
  switch (latest.status) {
    case "pending":
      return view("submitted");
    case "changes_requested":
      return view("changes");
    case "rejected":
      return view("refused");
    case "approved":
      if (i.reopenedSince(latest.at)) return view("draft", latest.number + 1);
      return view(transferred === latest.number ? "transferred" : "approved");
  }
}
