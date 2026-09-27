import { z } from "zod";

/**
 * Short rephrasings of the release's objective, offered as one-click choices
 * on the Framing "Objectif" screen. Each rephrasing must be traceable to a
 * verbatim passage of a source (the Brief's own objective field, or a call
 * report item): the model proposes wording, never a fact, and code verifies
 * the quote before anything is shown.
 */

export const framingObjectiveChoicesSchema = z.object({
  request: z
    .string()
    .describe("En une phrase : ce que les sources disent de l'objectif."),
  choices: z
    .array(
      z.object({
        text: z
          .string()
          .describe(
            "Reformulation courte et concrète de l'objectif (une phrase courte, verbe d'action de préférence).",
          ),
        source: z
          .string()
          .describe(
            "Identifiant de la source, recopié tel quel (ex. brief:objective, item:…).",
          ),
        quote: z
          .string()
          .describe(
            "Passage recopié mot pour mot de cette source qui justifie la reformulation (au moins trois mots).",
          ),
      }),
    )
    .max(4)
    .default([]),
});

export type FramingObjectiveChoicesOutput = z.infer<
  typeof framingObjectiveChoicesSchema
>;
