import "server-only";

import { CALL_PREP_INSTRUCTIONS } from "@/lib/ai/instructions/call-prep";
import { extract, type Extraction } from "@/lib/ai/llm";
import {
  callPrepSchema,
  type CallPrep,
  type CallPrepInput,
} from "@/lib/ai/schemas/call-prep";

export const BRIEF_FIELDS = [
  "objective",
  "timing",
  "frame",
  "needs",
  "team",
] as const;
export type BriefField = (typeof BRIEF_FIELDS)[number];

/** Empty Brief fields. Computed by code: a gap is a fact, not a guess. */
export function briefGaps(brief: CallPrepInput["brief"]): BriefField[] {
  return BRIEF_FIELDS.filter((field) => {
    const value = brief[field];
    return Array.isArray(value) ? value.length === 0 : value === null;
  });
}

export type PreparedCall = Extraction<CallPrep> & { gaps: BriefField[] };

export async function prepareNextCall(
  input: CallPrepInput,
): Promise<PreparedCall | null> {
  const gaps = briefGaps(input.brief);
  if (
    input.open.length === 0 &&
    input.nextActions.length === 0 &&
    gaps.length === 0
  ) {
    return null;
  }

  const data = [
    "Points ouverts :",
    ...input.open.map((item) => `- ${item.what}`),
    "Actions annoncées :",
    ...input.nextActions.map(
      (item) => `- ${item.what}${item.who ? ` (${item.who})` : ""}`,
    ),
    "Champs du Brief encore vides :",
    ...gaps.map((field) => `- ${field}`),
  ].join("\n");

  const extraction = await extract(
    callPrepSchema,
    data,
    CALL_PREP_INSTRUCTIONS,
  );
  return { ...extraction, gaps };
}
