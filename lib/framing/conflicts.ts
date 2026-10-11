// Contradictions in the Cadrage, found by code before the Brief is created
// (PROJ-BUG-04): the Brief is never generated over a conflict, and no value
// is replaced to make one go away — a person resolves it. Only what the
// confirmed answers and the project's records say against each other.
// Client-safe.

import type { QuestionState } from "@/lib/framing/assess";
import { formatBriefDate } from "@/lib/framing/assess";
import type { Dimension, QuestionKey } from "@/lib/framing/dimensions";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import type { LegalPartyBoard } from "@/lib/framing/legal-parties";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

export type FramingConflict = {
  key: string;
  dimension: Dimension;
  // The question to open to resolve it.
  question: QuestionKey;
  text: string;
};

// A production milestone that must come before the release.
const BEFORE_RELEASE = ["master_final", "delivery"] as const;

export function framingConflicts(
  k: FramingKnowledge,
  questions: QuestionState[],
  parties: LegalPartyBoard,
): FramingConflict[] {
  const t = fr.framingIntel.conflicts;
  const known = (key: QuestionKey) =>
    questions.find((q) => q.key === key && q.status === "known")?.answer ??
    null;
  const out: FramingConflict[] = [];

  // 02 Temporalité: the target date against the confirmed deadlines.
  const target = known("target_date");
  if (target?.kind === "date") {
    for (const d of k.deadlines) {
      if (d.review_status !== "confirmed" || !d.due_date) continue;
      const kind = d.kind as (typeof BEFORE_RELEASE)[number] | "release";
      const label =
        d.kind === "other" && d.label
          ? d.label
          : (fr.framingIntel.deadlineKinds as Record<string, string>)[d.kind];
      if (BEFORE_RELEASE.includes(kind as never) && d.due_date > target.date)
        out.push({
          key: `deadline-after:${d.id}`,
          dimension: "timing",
          question: "deadlines",
          text: t.afterTarget(
            label ?? d.kind,
            formatBriefDate(d.due_date),
            formatBriefDate(target.date),
          ),
        });
      if (kind === "release" && d.due_date !== target.date)
        out.push({
          key: `release-date:${d.id}`,
          dimension: "timing",
          question: "deadlines",
          text: t.releaseDiffers(
            formatBriefDate(d.due_date),
            formatBriefDate(target.date),
          ),
        });
    }
  }

  // 03 Budget: what is engaged against the confirmed envelope.
  const envelope = known("budget_envelope");
  if (envelope?.kind === "money") {
    const engaged = k.budgetLines
      .filter((l) => l.status === "committed" || l.status === "paid")
      .reduce((sum, l) => sum + l.amountCents, 0);
    if (engaged > envelope.cents)
      out.push({
        key: "budget-over",
        dimension: "budget",
        question: "budget_envelope",
        text: t.overEnvelope(formatEuros(engaged), formatEuros(envelope.cents)),
      });
  }

  // 06 Cadre juridique: « Existant » whose proof is no longer signed.
  for (const line of parties.lines) {
    const d = line.decision;
    if (d?.document_status !== "existing") continue;
    const contract = line.contracts.find((c) => c.id === d.contract_id);
    if (contract && contract.status !== "signed")
      out.push({
        key: `party-proof:${line.key}`,
        dimension: "legal",
        question: "legal_parties",
        text: t.proofLost(line.name, contract.title),
      });
  }
  return out;
}
