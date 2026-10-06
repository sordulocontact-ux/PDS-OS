// What a dictation or an exchange proposes for the Brief Mix/Master
// (lot 3 bis): each change, its quote, and whether the quote is really in
// what was said. Client-safe: the review shows them, the apply action
// re-validates them with the same schema. A rate travels as the words said;
// the code reads the amount from them on both sides, the model never gives
// a number.

import { z } from "zod";

import { parseSaidEuros } from "@/lib/assistant/verbatim";
import { BRIEF_DELIVERABLES } from "@/lib/master-workflow/brief-types";

export const BRIEF_TEXT_FIELDS = [
  "references",
  "direction",
  "constraints",
] as const;
export type BriefTextField = (typeof BRIEF_TEXT_FIELDS)[number];

export const BRIEF_ROLES = ["mix", "mastering"] as const;
export type BriefRole = (typeof BRIEF_ROLES)[number];

const quote = z.string().trim().min(1).max(2000);

export const briefChangeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    field: z.enum(BRIEF_TEXT_FIELDS),
    value: z.string().trim().min(1).max(2000),
    quote,
  }),
  // An engineer of the Réseau, matched by code on the name said.
  z.object({
    kind: z.literal("engineer"),
    role: z.enum(BRIEF_ROLES),
    contactId: z.uuid(),
    name: z.string().trim().min(1).max(200),
    quote,
  }),
  z.object({ kind: z.literal("same_engineer"), value: z.boolean(), quote }),
  // The words of the amount ("800 euros"): read by parseSaidEuros.
  z.object({
    kind: z.literal("rate"),
    role: z.enum(BRIEF_ROLES),
    amount: z.string().trim().min(1).max(100),
    quote,
  }),
  z.object({
    kind: z.literal("deliverable"),
    key: z.enum(BRIEF_DELIVERABLES),
    quote,
  }),
]);
export type BriefChange = z.infer<typeof briefChangeSchema>;

export type BriefProposal = BriefChange & {
  id: string;
  // The value replaced, worded for the review; null for an addition.
  before: string | null;
  // False when its quote is not in what was said: dropped by default.
  located: boolean;
};

export const briefProposalsSchema = z.array(briefChangeSchema).min(1).max(30);

/** The amount of a rate change, in cents; null when the words do not read
 * as an amount (then the change is never proposed nor applied). */
export const rateCents = (change: { amount: string }) =>
  parseSaidEuros(change.amount);
