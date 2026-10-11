// What stands between the Marketing and its closing (ticket « Suivi & bilan »,
// écran 4): computed here from the data, never by a model. A blocker stops
// the decision; a warning is shown to the validator, who decides with it.
// Pure, client-safe.

import type { Activation } from "@/lib/marketing/model";
import type {
  ReserveDecision,
  ReserveStatus,
} from "@/lib/marketing/closure/reserves";

export type ReadinessReserve = {
  id: string;
  status: ReserveStatus;
  decision: ReserveDecision | null;
};

export type Blocker =
  | { kind: "no_reference_report" }
  | { kind: "reserve_unarbitrated"; reserveId: string }
  | { kind: "reserve_blocking"; reserveId: string };

export type Warning =
  | { kind: "activation_open"; activationId: string }
  | { kind: "unpaid"; cents: number };

export type Readiness = {
  blockers: Blocker[];
  warnings: Warning[];
  // Every reserve is either lifted / closed or arbitrated as a follow-up or a
  // definitive limit: the closing can only be « avec réserves ».
  withReserves: boolean;
  // No reserve left at all (lifted, closed): « sans réserve » is possible.
  clean: boolean;
};

export function closureReadiness(input: {
  referenceReportId: string | null;
  reserves: ReadinessReserve[];
  activations: Activation[];
  budget: { committedCents: number; paidCents: number } | null;
}): Readiness {
  const blockers: Blocker[] = [];
  if (!input.referenceReportId) blockers.push({ kind: "no_reference_report" });
  for (const r of input.reserves) {
    if (r.status === "open")
      blockers.push({ kind: "reserve_unarbitrated", reserveId: r.id });
    else if (r.status === "arbitrated" && r.decision === "blocking")
      blockers.push({ kind: "reserve_blocking", reserveId: r.id });
  }
  const warnings: Warning[] = input.activations
    .filter(
      (a) =>
        a.archivedAt === null &&
        (a.status === "planned" || a.status === "in_progress"),
    )
    .map((a) => ({ kind: "activation_open" as const, activationId: a.id }));
  if (input.budget && input.budget.committedCents > input.budget.paidCents)
    warnings.push({
      kind: "unpaid",
      cents: input.budget.committedCents - input.budget.paidCents,
    });
  const remaining = input.reserves.filter((r) => r.status === "arbitrated");
  return {
    blockers,
    warnings,
    withReserves: remaining.length > 0,
    clean: input.reserves.every(
      (r) => r.status === "lifted" || r.status === "closed",
    ),
  };
}
