// Budget stratégie (ticket Stratégie § 6): the project's budget lines read
// for the strategy — proposed, validated, to arbitrate, by lever. Every
// amount is summed by code, never by PO (CLAUDE.md, rule 6). Strictly
// internal: the Brief de sortie shows it, never the Plan de sortie nor the
// Dossier de presse. Client-safe.

import type { BudgetLine } from "@/lib/budget/types";
import { strategyBudget as frStrategyBudget } from "@/lib/i18n/fr/strategy-budget";

const fr = { strategyBudget: frStrategyBudget };

export type LeverBudget = {
  leverId: string | null;
  label: string;
  proposedCents: number;
  validatedCents: number;
  toDecideCents: number;
  // Invoiced or paid: the real spend (MKT-S1-12).
  realCents: number;
};

/**
 * What the envelope says on its own (MKT-S1-02), four valid states, none of
 * them needing an expense to establish the Brief: not set, zero, set, or
 * still to confirm (the Cadrage left it « à définir plus tard » or gave an
 * estimate).
 */
export type EnvelopeState = "undefined" | "zero" | "set" | "to_confirm";

export function envelopeState(
  envelopeCents: number | null,
  toConfirm: boolean,
): EnvelopeState {
  if (toConfirm) return "to_confirm";
  if (envelopeCents === null) return "undefined";
  return envelopeCents === 0 ? "zero" : "set";
}

export type StrategyBudget = {
  envelopeCents: number | null;
  envelope: EnvelopeState;
  lineCount: number;
  proposedCents: number;
  validatedCents: number;
  toDecideCents: number;
  realCents: number;
  // Envelope minus validated; null without an envelope.
  remainingCents: number | null;
  // Envelope − proposé − à arbitrer, lines of a lever not retained left
  // out: the overrun, as « Budget stratégie » says it (dimension-budget.ts).
  // Null without an envelope; negative = overrun.
  restCents: number | null;
  // MKT-S1-12: one remainder per kind (forecast, validated, real).
  remaining: {
    forecast: number | null;
    validated: number | null;
    real: number | null;
  };
  byLever: LeverBudget[];
};

type Line = Pick<BudgetLine, "amountCents" | "status" | "leverId">;

// Validated = committed, invoiced or paid; to arbitrate = estimated or
// quoted; real = invoiced or paid.
const VALIDATED = new Set(["committed", "invoiced", "paid"]);
const REAL = new Set(["invoiced", "paid"]);

function sums(lines: Line[]) {
  const total = (keep: (l: Line) => boolean) =>
    lines.filter(keep).reduce((sum, l) => sum + l.amountCents, 0);
  return {
    proposedCents: total(() => true),
    validatedCents: total((l) => VALIDATED.has(l.status)),
    toDecideCents: total((l) => !VALIDATED.has(l.status)),
    realCents: total((l) => REAL.has(l.status)),
  };
}

export function strategyBudget(
  lines: Line[],
  levers: Array<{ id: string; label: string; state: string }>,
  envelopeCents: number | null,
  envelopeToConfirm = false,
): StrategyBudget {
  const known = new Map(levers.map((l) => [l.id, l]));
  const linesOf = (leverId: string | null) =>
    lines.filter((l) =>
      leverId === null
        ? l.leverId === null || !known.has(l.leverId)
        : l.leverId === leverId,
    );

  // Every selected lever, even without a line: a lever without budget shows.
  const selected = levers.filter((l) => l.state === "selected");
  // Lines on a lever that is not selected stay visible under its name.
  const others = levers.filter(
    (l) =>
      l.state !== "selected" && lines.some((line) => line.leverId === l.id),
  );
  const byLever: LeverBudget[] = [...selected, ...others].map((lever) => ({
    leverId: lever.id,
    label: lever.label,
    ...sums(linesOf(lever.id)),
  }));
  const outside = linesOf(null);
  if (outside.length > 0)
    byLever.push({
      leverId: null,
      label: fr.strategyBudget.byLever.noLever,
      ...sums(outside),
    });

  const total = sums(lines);
  const rest = (spent: number) =>
    envelopeCents === null ? null : envelopeCents - spent;
  // A line of a lever known and neither selected nor to decide is dropped.
  const counted = lines.filter((l) => {
    const lever = l.leverId ? known.get(l.leverId) : undefined;
    return !lever || lever.state === "selected" || lever.state === "to_decide";
  });
  return {
    envelopeCents,
    envelope: envelopeState(envelopeCents, envelopeToConfirm),
    lineCount: lines.length,
    ...total,
    remainingCents: rest(total.validatedCents),
    restCents: rest(sums(counted).proposedCents),
    remaining: {
      forecast: rest(total.proposedCents),
      validated: rest(total.validatedCents),
      real: rest(total.realCents),
    },
    byLever,
  };
}
