import { z } from "zod";

/**
 * Reading a moodboard: what its images share, and the words to find more of
 * the same on Are.na. A proposal only — the code keeps a few short searches
 * (lib/design/similar-references.ts) and a human picks what is kept.
 * `look` leads, or ministral-14b answers the schema itself.
 */
export const moodboardReadingSchema = z.object({
  look: z
    .string()
    .describe(
      "En deux phrases au plus, en français : ce que les images ont en commun (lumière, couleurs, matière, cadrage, époque, ambiance).",
    ),
  searches: z
    .array(z.string())
    .describe(
      "3 ou 4 recherches en anglais, de 2 à 4 mots chacune, pour trouver d'autres images de la même famille visuelle (ex. « grainy film portrait », « brutalist concrete shadow »). Pas de nom de personne ni de marque.",
    ),
});

export type MoodboardReading = z.infer<typeof moodboardReadingSchema>;
