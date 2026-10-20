import { z } from "zod";

/**
 * What PO understands in the creative director's answer to « Quelle
 * direction artistique et quelles références pour le mix ? » (proto
 * `daQuestion`): short items, each in its group, each with the words of
 * the answer it comes from. The code keeps only the items whose quote is
 * found word for word in the answer (lib/master-workflow/answer-reading.ts).
 */
export const answerReadingSchema = z.object({
  items: z
    .array(
      z.object({
        group: z
          .enum(["direction", "references", "constraints"])
          .describe(
            "direction : ce que le son doit être ; references : un titre ou un artiste dont s'inspirer ; constraints : ce qu'il faut éviter ou respecter.",
          ),
        label: z
          .string()
          .describe(
            "L'élément en quelques mots, commençant par une majuscule (« Voix devant sur les refrains », « « Blinding Lights », The Weeknd »).",
          ),
        quote: z
          .string()
          .describe(
            "Extrait recopié mot pour mot de la réponse, d'où vient l'élément. Recopier exactement, sans reformuler.",
          ),
      }),
    )
    .default([])
    .describe("Les éléments compris. Liste vide si la réponse n'en dit rien."),
});

export type AnswerReading = z.infer<typeof answerReadingSchema>;
