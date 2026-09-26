import { z } from "zod";

import { NEED_FAMILIES } from "@/lib/ai/schemas/call-report";
import { STRATEGY_TEXT_FIELDS } from "@/lib/framing/brief";

/**
 * A change to the Launch strategy heard in a dictation. Shared by the route
 * that proposes it and the action that applies it once accepted, which parses
 * it again: what comes back from the browser is never trusted.
 */

const quote = z.string().trim().min(1).max(1000);
const text = (max: number) => z.string().trim().min(1).max(max);

export const strategyProposalSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("field"),
    field: z.enum(STRATEGY_TEXT_FIELDS),
    value: text(2000),
    quote,
  }),
  z.object({
    kind: z.literal("lever"),
    label: text(200),
    family: z.enum(NEED_FAMILIES),
    quote,
  }),
]);

export type StrategyChange = z.infer<typeof strategyProposalSchema>;

/** What the user reviews: the change, the value it replaces, and whether its quote was found. */
export type StrategyProposal = StrategyChange & {
  id: string;
  before: string | null;
  located: boolean;
};
