// The frise of a SACEM declaration (JUR-26): where the bulletin stands,
// from the dossier to the registration, read from its status and its
// signatures — never stored. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import type { FormalityView } from "@/lib/legal/formalities/types";

type StepState = "done" | "active" | "waiting";

const ORDER = [
  "collecting_data",
  "ready_to_generate",
  "document_ready",
  "signatures_pending",
  "ready_to_submit",
  "submitted",
  "processing",
  "completed",
] as const;

export function formalityTimeline(
  f: Pick<FormalityView, "status" | "signatures" | "partialReason">,
): Array<{ key: string; label: string; state: StepState }> {
  const t = fr.legalFormalities.timeline;
  // A correction asked by the SACEM goes back to the dossier.
  const at =
    f.status === "action_required"
      ? 0
      : Math.max(0, ORDER.indexOf(f.status as (typeof ORDER)[number]));
  const signed = f.signatures.filter((s) => s.status === "signed").length;
  const total = f.signatures.length;
  const steps = [
    { key: "dossier", label: t.dossier, from: 0, to: 2 },
    { key: "generated", label: t.generated, from: 2, to: 3 },
    {
      key: "signed",
      label:
        total > 0
          ? f.partialReason
            ? t.partial(signed, total)
            : t.signed(signed, total)
          : t.signedNone,
      from: 3,
      to: 4,
    },
    { key: "submitted", label: t.submitted, from: 4, to: 5 },
    { key: "completed", label: t.completed, from: 5, to: 7 },
  ];
  return steps.map((step) => ({
    key: step.key,
    label:
      step.key === "dossier" && f.status === "action_required"
        ? t.correction
        : step.label,
    state:
      f.status === "completed" || at >= step.to
        ? "done"
        : at >= step.from
          ? "active"
          : "waiting",
  }));
}
