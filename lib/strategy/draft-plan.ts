// The strategy drafted by PO from the Cadrage and the calls (MKT-S1-09,
// docs/ARCHITECTURE.md § 6 bis, « Brouillon de stratégie »): which fields are
// drafted, what the code keeps of the model's answer, and what is left to ask.
// Pure, client-safe.

import { locateQuote } from "@/lib/ai/provenance";
import {
  NARRATIVE_PARTS,
  POSITIONING_PARTS,
  STRATEGY_TEXT_FIELDS,
  type DraftConfidence,
} from "@/lib/framing/brief";
import { draftConfidence } from "@/lib/strategy/draft-confidence";
import type { StrategyDimension } from "@/lib/strategy/dimensions";

/** The text fields PO may draft: answers, positioning and narrative parts. */
export const DRAFT_FIELDS = [
  ...STRATEGY_TEXT_FIELDS,
  ...POSITIONING_PARTS,
  ...NARRATIVE_PARTS,
] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];

export function isDraftField(value: unknown): value is DraftField {
  return (
    typeof value === "string" &&
    (DRAFT_FIELDS as readonly string[]).includes(value)
  );
}

/** Where each drafted field is answered on the pilotage. */
export const DRAFT_DIMENSION: Record<DraftField, StrategyDimension> = {
  positioning: "positioning",
  positioning_promise: "positioning",
  positioning_difference: "positioning",
  positioning_proof: "positioning",
  positioning_tone: "positioning",
  audiences: "audiences",
  narrative: "narrative",
  narrative_origin: "narrative",
  narrative_story: "narrative",
  narrative_context: "narrative",
  narrative_why_now: "narrative",
};

/** A passage PO may lean on; `fromBrief` = a confirmed field of the Cadrage. */
export type DraftSource = {
  id: string;
  label: string;
  text: string;
  fromBrief: boolean;
};

export type RawDraft = {
  field: string;
  value: string;
  source: string;
  quote: string;
};

export type VerifiedDraft = {
  field: DraftField;
  value: string;
  label: string;
  quote: string;
  confidence: DraftConfidence;
};

/**
 * The fields to draft: never one a person confirmed (a draft never replaces
 * a confirmed value), and only `only` when one field is asked again.
 */
export function fieldsToDraft(
  statusOf: (field: DraftField) => string | null,
  only: DraftField | null = null,
): DraftField[] {
  return (only ? [only] : [...DRAFT_FIELDS]).filter(
    (field) => statusOf(field) !== "confirmed",
  );
}

const MAX_VALUE = 2000;

/**
 * Keeps what the code can verify: a wanted field, once; a known source; a
 * passage of three words at least found verbatim in it; a value of a
 * sensible length. The confidence is the code's (draft-confidence.ts).
 */
export function verifyDrafts(
  raw: RawDraft[],
  sources: DraftSource[],
  wanted: DraftField[],
): VerifiedDraft[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const seen = new Set<string>();
  return raw.flatMap((draft): VerifiedDraft[] => {
    const field = draft.field.trim();
    if (!isDraftField(field) || !wanted.includes(field) || seen.has(field))
      return [];
    const source = byId.get(draft.source.trim());
    const value = draft.value.trim();
    const quote = draft.quote.trim();
    if (!source || value === "" || value.length > MAX_VALUE) return [];
    if (quote.split(/\s+/).length < 3) return [];
    if (
      locateQuote(quote, { text: source.text, segments: [] }).status ===
      "missing"
    )
      return [];
    seen.add(field);
    return [
      {
        field,
        value,
        label: source.label,
        quote,
        confidence: draftConfidence({
          draft: value,
          source: source.text,
          fromBrief: source.fromBrief,
        }),
      },
    ];
  });
}

export type PriorityQuestions = {
  dimension: StrategyDimension;
  fields: DraftField[];
}[];

/**
 * What the sources did not answer: the fields still empty after the draft,
 * grouped by dimension in the pilotage's order, the ones to answer first.
 */
export function priorityQuestions(
  wanted: DraftField[],
  drafted: DraftField[],
  hasValue: (field: DraftField) => boolean,
): PriorityQuestions {
  const done = new Set(drafted);
  const left = wanted.filter((f) => !done.has(f) && !hasValue(f));
  const order: StrategyDimension[] = ["positioning", "audiences", "narrative"];
  return order.flatMap((dimension) => {
    const fields = left.filter((f) => DRAFT_DIMENSION[f] === dimension);
    return fields.length ? [{ dimension, fields }] : [];
  });
}
