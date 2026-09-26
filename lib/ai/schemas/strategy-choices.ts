import { z } from "zod";

import { STRATEGY_CHOICES } from "@/lib/strategy/choices";

/**
 * Pre-checking the Strategy closed-choice questions from the validated Brief
 * and the call reports. Closed: the model may only name answer keys from the
 * fixed lists, each tied to a source id and a verbatim passage. It writes no
 * free text into the Strategy.
 */

const pick = <T extends readonly [string, ...string[]]>(keys: T) =>
  z
    .array(
      z.object({
        choice: z
          .enum(keys)
          .describe("Clé de la réponse, dans la liste fermée."),
        source: z
          .string()
          .describe(
            "Identifiant de la source, recopié tel quel (ex. brief:objective, item:…).",
          ),
        quote: z
          .string()
          .describe(
            "Passage recopié mot pour mot de cette source qui justifie la réponse (au moins trois mots).",
          ),
      }),
    )
    .default([]);

// Same lessons as the dictation schemas: a leading free-text field
// (`request`) and a flat shape, or ministral-14b answers the schema itself.
export const strategyChoicesSchema = z.object({
  request: z
    .string()
    .describe(
      "En une phrase : ce que les sources disent de l'intention de la sortie.",
    ),
  positioning: pick(STRATEGY_CHOICES.positioning),
  audiences: pick(STRATEGY_CHOICES.audiences),
  narrative: pick(STRATEGY_CHOICES.narrative),
});

export type StrategyChoicesOutput = z.infer<typeof strategyChoicesSchema>;
