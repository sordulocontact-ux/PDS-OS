// « Budget stratégie » as in the proto (budget(), dimBody « bud »): the
// project's budget lines (one budget, the Budget page's), each following
// the state of its lever. Rule chosen 19/10/2026 (docs/projet-complet/
// strategy.md § 11, point 5, docs/ARCHITECTURE.md § 6 bis « Lot 3 »):
// Proposé = lines of retained levers and lines « Hors levier »; À arbitrer
// = lines of a lever still to arbitrate; a line of a lever not retained is
// « Écartée » and counts nowhere; Validé = committed, invoiced or paid among
// the proposed; Reste = envelope − proposé − à arbitrer. Summed by code,
// never by PO (rule 6). Client-safe.

import type { BudgetLine } from "@/lib/budget/types";
import { envelopeState, type EnvelopeState } from "@/lib/strategy/budget";

export type BudgetLineState = "proposed" | "to_decide" | "dropped";

export type BudgetViewLine = {
  id: string;
  label: string;
  amountCents: number;
  status: BudgetLine["status"];
  leverLabel: string | null;
  state: BudgetLineState;
};

export type BudgetView = {
  envelopeCents: number | null;
  envelope: EnvelopeState;
  proposedCents: number;
  validatedCents: number;
  toDecideCents: number;
  // Null without an envelope; negative = overrun.
  restCents: number | null;
  lines: BudgetViewLine[];
};

const VALIDATED = new Set(["committed", "invoiced", "paid"]);

export function budgetView(
  lines: BudgetLine[],
  leverStateOf: (
    leverId: string,
  ) => "retained" | "to_decide" | "not_retained" | null,
  envelopeCents: number | null,
  envelopeToConfirm: boolean,
): BudgetView {
  const view = lines.map((l): BudgetViewLine => {
    const lever = l.leverId ? leverStateOf(l.leverId) : null;
    return {
      id: l.id,
      label: l.label,
      amountCents: l.amountCents,
      status: l.status,
      leverLabel: l.leverLabel,
      state:
        lever === "to_decide"
          ? "to_decide"
          : lever === "not_retained"
            ? "dropped"
            : "proposed",
    };
  });
  const sum = (keep: (l: BudgetViewLine) => boolean) =>
    view.filter(keep).reduce((total, l) => total + l.amountCents, 0);
  const proposedCents = sum((l) => l.state === "proposed");
  const toDecideCents = sum((l) => l.state === "to_decide");
  return {
    envelopeCents,
    envelope: envelopeState(envelopeCents, envelopeToConfirm),
    proposedCents,
    validatedCents: sum(
      (l) => l.state === "proposed" && VALIDATED.has(l.status),
    ),
    toDecideCents,
    restCents:
      envelopeCents === null
        ? null
        : envelopeCents - proposedCents - toDecideCents,
    lines: view,
  };
}
