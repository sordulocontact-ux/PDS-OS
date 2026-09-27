import { z } from "zod";

import { NEED_FAMILIES } from "@/lib/ai/schemas/call-report";
import { BRIEF_TEXT_FIELDS } from "@/lib/framing/brief";

/**
 * A change to the Framing stage heard in a dictation. Shared by the route
 * that proposes it and the action that applies it once accepted, which parses
 * it again: what comes back from the browser is never trusted.
 */

const quote = z.string().trim().min(1).max(1000);
const text = (max: number) => z.string().trim().min(1).max(max);

export const framingProposalSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("brief"),
    field: z.enum(BRIEF_TEXT_FIELDS),
    value: text(2000),
    quote,
  }),
  z.object({
    kind: z.literal("need"),
    label: text(200),
    family: z.enum(NEED_FAMILIES),
    quote,
  }),
  z.object({
    kind: z.literal("constraint"),
    text: text(500),
    quote,
  }),
  z.object({
    kind: z.literal("team"),
    name: text(120),
    role: z.string().trim().max(120).nullable(),
    quote,
  }),
  z.object({ kind: z.literal("open_point"), question: text(500), quote }),
]);

export type FramingChange = z.infer<typeof framingProposalSchema>;

/** What the user reviews: the change, the value it replaces, and whether its quote was found. */
export type FramingProposal = FramingChange & {
  id: string;
  before: string | null;
  located: boolean;
};
