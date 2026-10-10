import { z } from "zod";

import { DESIGN_TOPICS } from "@/lib/design/intentions";

/**
 * Candidate intentions of the Conception, read from a creative call's report
 * or an imported brief. Each one names its topic (closed list), the targets
 * it concerns (keys given in the data), a short rewording and the verbatim
 * passage it comes from. The code keeps only what it can verify.
 */

// Same lessons as the other schemas: a leading free-text field (`request`)
// and a flat shape, or ministral-14b answers the schema itself.
export const designIntentionsSchema = z.object({
  request: z
    .string()
    .describe(
      "En une phrase : ce que les sources disent de la création des livrables.",
    ),
  intentions: z
    .array(
      z.object({
        targets: z
          .array(z.string())
          .describe(
            "Clés des cibles concernées, recopiées telles quelles (direction, d1, d2…). Vide si on ne sait pas à quoi cela se rattache.",
          ),
        topic: z
          .enum(DESIGN_TOPICS)
          .describe("Sujet de l'intention, dans la liste fermée."),
        text: z
          .string()
          .describe(
            "L'intention en une ou deux phrases courtes, fidèle à la source, sans rien ajouter.",
          ),
        source: z
          .string()
          .describe("Identifiant de la source, recopié tel quel."),
        quote: z
          .string()
          .describe(
            "Passage recopié mot pour mot de cette source qui justifie l'intention (au moins trois mots).",
          ),
      }),
    )
    .default([]),
});

export type DesignIntentionsOutput = z.infer<typeof designIntentionsSchema>;
