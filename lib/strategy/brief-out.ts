// The Brief de sortie as the proto shows it on the piece (briefDoc): four
// blocks — Pour qui et pourquoi, Comment, Quand, Objectif et budget — made
// by code from what « Les 8 dimensions » kept (rule 6). Stored with each
// version (strategy_documents.content.out), so a version reads as it was
// sent; older versions without it keep their former rendering.
// Client-safe, pure.

import { z } from "zod";

import { dayOffset } from "@/lib/strategy/calendar";
import { retainedLevers } from "@/lib/strategy/dimension-levers";
import type { StrategyModel } from "@/lib/strategy/dimension-model";
import type { StrategyDimension } from "@/lib/strategy/dimensions";

export const briefOutSchema = z.object({
  positioning: z.array(z.string()),
  audiences: z.array(z.string()),
  narrative: z.array(z.string()),
  levers: z.array(z.string()),
  deliverables: z.array(z.string()),
  when: z.array(
    z.object({
      day: z.string(),
      name: z.string(),
      offset: z.number().nullable(),
    }),
  ),
  objectives: z.array(z.string()),
  budget: z.object({
    proposedCents: z.number(),
    envelopeCents: z.number().nullable(),
  }),
  openPoints: z.array(z.string()),
});
export type BriefOut = z.infer<typeof briefOutSchema>;

/** A stored content's four blocks; null for a version written before. */
export function briefOutOf(content: unknown): BriefOut | null {
  if (!content || typeof content !== "object" || !("out" in content))
    return null;
  const parsed = briefOutSchema.safeParse(content.out);
  return parsed.success ? parsed.data : null;
}

/** The Brief as it stands, from the lines kept in the 8 dimensions. */
export function briefOutFrom(
  model: StrategyModel,
  referenceDate: string | null,
): BriefOut {
  const dim = (key: StrategyDimension) =>
    model.dimensions.find((d) => d.key === key);
  const kept = (key: StrategyDimension) =>
    (dim(key)?.items ?? [])
      .filter((i) => i.proposal.state === "kept")
      .map((i) => i.proposal.text);
  const budget = dim("budget")?.budget;
  return {
    positioning: kept("positioning"),
    audiences: kept("audiences"),
    narrative: kept("narrative"),
    levers: retainedLevers(dim("levers")?.levers ?? []),
    deliverables: kept("deliverables"),
    when: (dim("calendar")?.items ?? [])
      .filter((i) => i.proposal.state === "kept" && i.day)
      .map((i) => ({
        day: i.day as string,
        name: i.proposal.text,
        offset: referenceDate
          ? dayOffset(i.day as string, referenceDate)
          : null,
      })),
    objectives: kept("objectives"),
    budget: {
      proposedCents: budget?.proposedCents ?? 0,
      envelopeCents: budget?.envelopeCents ?? null,
    },
    openPoints: model.openPoints.map((p) => p.text),
  };
}
