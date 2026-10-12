/**
 * Deliverable text fields (Brief, Strategy, Dossier de conception) stored as versioned field_values.
 * Pure code, importable anywhere.
 */

// "frame" (Cadre & contraintes) moved to its own reviewable lines
// (public.framing_constraints, lib/framing/constraints.ts): a single free
// text field could not be confirmed line by line.
export const BRIEF_TEXT_FIELDS = ["objective", "timing"] as const;
export type BriefTextField = (typeof BRIEF_TEXT_FIELDS)[number];

export const STRATEGY_TEXT_FIELDS = [
  "positioning",
  "audiences",
  "narrative",
] as const;
export type StrategyTextField = (typeof STRATEGY_TEXT_FIELDS)[number];

// The story behind the release, gathered during the strategy (ticket
// Stratégie § 2) and reused by the release documents; the angle is the
// `narrative` field above.
export const NARRATIVE_PARTS = [
  "narrative_origin",
  "narrative_story",
  "narrative_context",
  "narrative_why_now",
] as const;
export type NarrativePart = (typeof NARRATIVE_PARTS)[number];

// The positioning, said in four plain parts (MKT-S1-05): what the release
// promises, what makes it different, what proves it, its tone. The
// `positioning` answer above stays its summary.
export const POSITIONING_PARTS = [
  "positioning_promise",
  "positioning_difference",
  "positioning_proof",
  "positioning_tone",
] as const;
export type PositioningPart = (typeof POSITIONING_PARTS)[number];

// « Objectifs & KPIs » (ticket Stratégie § 7): what the release must
// accomplish, in the team's words; the KPIs are strategy_objectives rows.
export const STRATEGIC_OBJECTIVE = "strategic_objective";

// The narrative told in one text, drafted by PO from the parts above
// (MKT-S1-06): shown first in the narrative and in the Brief, always a
// proposal until a person confirms it.
export const NARRATIVE_SUMMARY = "narrative_summary";

export const DESIGN_TEXT_FIELDS = [
  "creative_direction",
  "visual_codes",
  "references",
] as const;
export type DesignTextField = (typeof DESIGN_TEXT_FIELDS)[number];

export const TEXT_FIELDS = {
  brief: BRIEF_TEXT_FIELDS,
  strategy: [
    ...STRATEGY_TEXT_FIELDS,
    ...NARRATIVE_PARTS,
    ...POSITIONING_PARTS,
    STRATEGIC_OBJECTIVE,
    NARRATIVE_SUMMARY,
  ],
  design_doc: DESIGN_TEXT_FIELDS,
} as const;
export type TextDeliverable = keyof typeof TEXT_FIELDS;

export function isBriefTextField(value: string): value is BriefTextField {
  return (BRIEF_TEXT_FIELDS as readonly string[]).includes(value);
}

export function isStrategyTextField(value: string): value is StrategyTextField {
  return (STRATEGY_TEXT_FIELDS as readonly string[]).includes(value);
}

export type Provenance =
  | {
      kind: "call";
      quote: string;
      /** Set by code when the quote was searched in the transcript (lib/ai/provenance.ts). */
      located: "timed" | "found" | "missing" | null;
      startSeconds: number | null;
      callId: string | null;
      callTitle: string | null;
    }
  | {
      /** Dictated and accepted by a member; the audio is not kept. */
      kind: "voice";
      quote: string;
      author: string | null;
    }
  | {
      /**
       * Taken from what the project already records (project sheet, Budget,
       * credits…) or read by PO in the initial context: `label` says where,
       * `quote` the words when there are any.
       */
      kind: "record";
      label: string;
      quote: string | null;
    }
  | {
      /**
       * Drafted by PO from the Cadrage and the calls (MKT-S1-09): where it
       * leans (`label`, the verified `quote`) and how sure the code judges it
       * (`confidence`, lib/strategy/draft-confidence.ts).
       */
      kind: "generated";
      label: string;
      quote: string | null;
      confidence: DraftConfidence | null;
    };

export type DraftConfidence = "high" | "medium" | "low";

export type FieldState<K extends string = string> = {
  deliverable: TextDeliverable;
  key: K;
  value: string | null;
  status: "proposed" | "confirmed" | null;
  provenance: Provenance | null;
};
export type BriefFieldState = FieldState<BriefTextField>;
export type StrategyFieldState = FieldState<StrategyTextField>;
export type DesignFieldState = FieldState<DesignTextField>;

type Row = { value: unknown; status: string | null } | undefined;

/** The current value of a field is its latest row; a rejection empties it. */
export function toFieldState<K extends string>(
  deliverable: TextDeliverable,
  key: K,
  row: Row,
  provenance: Provenance | null,
): FieldState<K> {
  if (!row || row.status === "rejected" || typeof row.value !== "string") {
    return { deliverable, key, value: null, status: null, provenance: null };
  }
  return {
    deliverable,
    key,
    value: row.value,
    status: row.status === "proposed" ? "proposed" : "confirmed",
    provenance,
  };
}

export function toBriefField(
  key: BriefTextField,
  row: Row,
  provenance: Provenance | null,
): BriefFieldState {
  return toFieldState("brief", key, row, provenance);
}
