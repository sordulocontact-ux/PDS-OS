import { z } from "zod";

/**
 * PO comparing Deezer homonyms with a person read on a TikTok screenshot
 * (Labo). A lean, never a decision: the code keeps the id only if it is one
 * of the candidates, and a person chooses. `analysis` leads, or
 * ministral-14b answers the schema itself.
 */
export const captureChoiceSchema = z.object({
  analysis: z
    .string()
    .describe(
      "En deux phrases au plus, texte simple : lequel des comptes Deezer (désigné par son nom et ses fans, jamais par son id) est le plus probable, et ce qui le rapproche de la personne (bio, sorties, public) ou en éloigne les autres.",
    ),
  deezerId: z
    .number()
    .int()
    .nullish()
    .describe(
      "L'id du compte Deezer le plus probable, recopié de la liste. null si rien ne permet de pencher pour l'un d'eux.",
    ),
});

export type CaptureChoice = z.infer<typeof captureChoiceSchema>;
