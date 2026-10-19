// One information of the Cadrage as a line of the proto (frEntry « Voir le
// détail », frDims cards): its state pill and the source under its value,
// said by code from the assessment. Client-safe.

import type { QuestionState, QuestionStatus } from "@/lib/framing/assess";
import { sourceLabel } from "@/components/framing/guide/source-quote";
import { fr } from "@/lib/i18n/fr";
import { formatDay } from "@/lib/utils/day";

export type FramingLineState =
  "known" | "confirmed" | "to_confirm" | "missing" | "na" | "later";

/** Connu / Confirmé (by a person) / À confirmer / Manquant / NA / plus tard. */
export function lineStateOf(q: QuestionState): FramingLineState {
  if (q.answer?.kind === "na") return "na";
  if (q.answer?.kind === "later") return "later";
  if (q.status === "known") return q.confirmed?.by ? "confirmed" : "known";
  return q.status;
}

/** Under the value: who confirmed it, why not applicable, the sentence
 * said and where, or the record it comes from. */
export function lineSourceOf(q: QuestionState): string | null {
  const t = fr.framingJourney.dimensions;
  const a = q.answer;
  if (a?.kind === "na") return t.na(a.reason);
  if (a?.kind === "later") return t.later(formatDay(a.due));
  const p = q.provenance;
  if (q.status === "known" && q.confirmed?.by)
    return t.confirmedBy(q.confirmed.by);
  if (!p) return null;
  if ((p.kind === "call" || p.kind === "voice") && p.quote)
    return `« ${p.quote} » · ${sourceLabel(p)}`;
  return sourceLabel(p);
}

/**
 * Which way in the code recommends (proto frEntry): an exchange when what
 * is missing and what is to confirm outnumber what is known; else PO.
 */
export function recommendedStart(
  counts: Record<QuestionStatus, number>,
): "call" | "po" {
  return counts.missing + counts.to_confirm > counts.known ? "call" : "po";
}
