import { z } from "zod";

/**
 * « M'aider à définir » on a question of the Cadrage intelligent: short
 * formulations offered as one-click choices. Each must be traceable to a
 * verbatim passage of a source (initial context, call report items, other
 * Brief answers, project facts): the model proposes wording, never a fact,
 * and code verifies the quote before anything is shown.
 */
export const framingHelpSchema = z.object({
  request: z
    .string()
    .describe("En une phrase : ce que les sources disent sur cette question."),
  choices: z
    .array(
      z.object({
        text: z
          .string()
          .describe("Réponse courte et concrète à la question, en une phrase."),
        source: z
          .string()
          .describe(
            "Identifiant de la source, recopié tel quel (ex. context, item:…, brief:objective).",
          ),
        quote: z
          .string()
          .describe(
            "Passage recopié mot pour mot de cette source qui justifie la réponse (au moins trois mots).",
          ),
      }),
    )
    .max(3)
    .default([]),
});

export type FramingHelpOutput = z.infer<typeof framingHelpSchema>;
