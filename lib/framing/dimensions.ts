// The six dimensions of the Cadrage intelligent and their questions (ticket
// « Cadrage intelligent d'un projet », § 3 ; docs/ARCHITECTURE.md § 6). The
// same list lives in SQL (framing_key_dimension): a key always belongs to one
// dimension, so a correction reopens exactly what the validator named.
// Client-safe; labels in lib/i18n/fr/framing-intel.ts.

export const DIMENSIONS = [
  "objective",
  "timing",
  "budget",
  "team",
  "start",
  "legal",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export function isDimension(value: unknown): value is Dimension {
  return (
    typeof value === "string" &&
    (DIMENSIONS as readonly string[]).includes(value)
  );
}

/**
 * How a question is answered:
 * - text: a sentence, stored as a Brief field (field_values);
 * - date: a real date, chosen or confirmed by a person, never parsed by PO;
 * - money: an amount in cents;
 * - needs / constraints / rights / deadlines / team: reviewable lines of
 *   their own tables, with a « rien à signaler » marker when there are none.
 */
export type QuestionKind =
  | "text"
  | "date"
  | "money"
  | "needs"
  | "constraints"
  | "rights"
  | "deadlines"
  | "team";

export type QuestionDef = {
  dimension: Dimension;
  kind: QuestionKind;
  // Required for the Brief to be generated; an optional question left empty
  // reads « Non renseigné » in it.
  required: boolean;
  // « Rien à signaler » is a valid answer (no blocker, no deadline…).
  allowNone: boolean;
  // « M'aider à définir » asks PO for sourced formulations (text only).
  poHelp: boolean;
};

const q = (
  dimension: Dimension,
  kind: QuestionKind,
  required: boolean,
  allowNone: boolean,
): QuestionDef => ({
  dimension,
  kind,
  required,
  allowNone,
  poHelp: kind === "text",
});

// In the order they are asked, dimension by dimension.
export const QUESTIONS = {
  objective: q("objective", "text", true, false),
  success_criteria: q("objective", "text", true, false),
  main_priority: q("objective", "text", true, false),
  needs: q("objective", "needs", true, true),
  target_date: q("timing", "date", true, false),
  deadlines: q("timing", "deadlines", false, true),
  calendar_constraints: q("timing", "text", false, true),
  prerequisites: q("timing", "text", false, true),
  budget_envelope: q("budget", "money", true, true),
  commitments: q("budget", "text", false, true),
  constraints: q("budget", "constraints", true, true),
  contributors: q("team", "team", true, true),
  decision_makers: q("team", "text", false, false),
  missing_skills: q("team", "text", false, true),
  current_state: q("start", "text", true, false),
  existing_elements: q("start", "text", false, true),
  decisions_made: q("start", "text", false, true),
  work_started: q("start", "text", false, true),
  legal_parties: q("legal", "text", true, true),
  legal_agreements: q("legal", "text", false, true),
  legal_needs: q("legal", "text", false, true),
  legal_secured: q("legal", "text", false, true),
  legal_blockers: q("legal", "rights", true, true),
} as const satisfies Record<string, QuestionDef>;

export type QuestionKey = keyof typeof QUESTIONS;
export const QUESTION_KEYS = Object.keys(QUESTIONS) as QuestionKey[];

export function isQuestionKey(value: unknown): value is QuestionKey {
  return typeof value === "string" && value in QUESTIONS;
}

export function questionsOf(dimension: Dimension): QuestionKey[] {
  return QUESTION_KEYS.filter((key) => QUESTIONS[key].dimension === dimension);
}

export const TEXT_QUESTION_KEYS = QUESTION_KEYS.filter(
  (key) => QUESTIONS[key].kind === "text",
);

export function isTextQuestion(value: unknown): value is QuestionKey {
  return isQuestionKey(value) && QUESTIONS[value].kind === "text";
}

// Every key a Brief field row may carry for the Cadrage: the questions
// stored as fields, and the « rien à signaler » markers of the line lists
// (same key, value {"none": true}).
export const FIELD_QUESTION_KINDS: readonly QuestionKind[] = [
  "text",
  "date",
  "money",
];

/** A constraint line belongs to « Cadre juridique » when it is about rights. */
export const dimensionOfConstraint = (type: string): Dimension =>
  type === "rights" ? "legal" : "budget";
