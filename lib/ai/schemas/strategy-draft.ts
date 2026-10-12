import { z } from "zod";

import { NARRATIVE_PARTS } from "@/lib/framing/brief";
import { DRAFT_FIELDS } from "@/lib/strategy/draft-plan";

/**
 * A first draft of the Strategy texts from the validated Brief and the call
 * reports (MKT-S1-09). Each draft names its field, one source id and a
 * passage copied verbatim from it; the code drops any draft it cannot
 * verify and judges the confidence itself (lib/strategy/draft-plan.ts).
 */

// Same lessons as the dictation schemas: a leading free-text field
// (`request`) and a flat shape, or ministral-14b answers the schema itself.
export const strategyDraftSchema = z.object({
  request: z
    .string()
    .describe("En une phrase : ce que les sources disent de la sortie."),
  drafts: z
    .array(
      z.object({
        field: z.enum(DRAFT_FIELDS).describe("Le champ rédigé."),
        value: z
          .string()
          .describe(
            "Le texte proposé pour ce champ, en français, une à trois phrases.",
          ),
        source: z
          .string()
          .describe(
            "Identifiant de la source principale, recopié tel quel (ex. brief:objective, item:…).",
          ),
        quote: z
          .string()
          .describe(
            "Passage recopié mot pour mot de cette source qui fonde le texte (au moins trois mots).",
          ),
      }),
    )
    .default([]),
});

export type StrategyDraftOutput = z.infer<typeof strategyDraftSchema>;

/** The narrative summed up from its parts, and what does not hold together. */
export const narrativeSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "La synthèse du récit, en français, écrite à partir des parties.",
    ),
  contradictions: z
    .array(
      z.object({
        first: z.enum(NARRATIVE_PARTS).describe("Première partie en cause."),
        second: z.enum(NARRATIVE_PARTS).describe("Seconde partie en cause."),
        firstQuote: z
          .string()
          .describe("Passage recopié mot pour mot de la première partie."),
        secondQuote: z
          .string()
          .describe("Passage recopié mot pour mot de la seconde partie."),
        why: z.string().describe("En une phrase : pourquoi elles s'opposent."),
      }),
    )
    .default([]),
});

export type NarrativeSummaryOutput = z.infer<typeof narrativeSummarySchema>;
